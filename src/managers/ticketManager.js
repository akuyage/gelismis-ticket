import db from '../database/connect.js';
import { config } from '../utils/configLoader.js';
import {
  createTicketChannelMessage,
  createLogMessage,
  createRatingMessage,
  createFeedbackPendingMessage,
  createFeedbackApprovedMessage
} from './ticketTemplate.js';
import { buildTranscript } from '../utils/transcriptBuilder.js';
import { escapeMentions } from '../utils/escape.js';
import { getCategoryName } from '../utils/categories.js';

export { getCategoryName };
import {
  ChannelType,
  PermissionFlagsBits,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  AttachmentBuilder,
  MessageFlags
} from 'discord.js';

const VALID_PRIORITIES = ['düşük', 'normal', 'yüksek', 'acil'];

const TICKET_COOLDOWN_MS = 60_000; // Max 1 ticket per minute per user
const ticketCooldowns = new Map();

function channelLabel(channel) {
  if (!channel) return '';
  return `<#${channel.id}> (\`${channel.name}\`)`;
}

function generateCaseId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function isStaffMember(member) {
  if (!member) return false;
  if (member.permissions?.has(PermissionFlagsBits.Administrator)) return true;
  return !!config.staffRoleId && member.roles?.cache?.has(config.staffRoleId);
}

function isBotUser(interaction) {
  return interaction?.user?.id && interaction?.client?.user?.id && interaction.user.id === interaction.client.user.id;
}

async function sendLog(target, channelId, title, fields, colorEmoji = 'ℹ️', buttons = []) {
  if (!channelId || !target) return;
  
  let logChannel = null;
  if (target.channels) {
    logChannel = target.channels.cache.get(channelId) || await target.channels.fetch(channelId).catch(() => null);
  } else if (target.client) {
    logChannel = target.client.channels.cache.get(channelId) || await target.client.channels.fetch(channelId).catch(() => null);
  }

  if (!logChannel) return;
  const payload = createLogMessage(title, fields, colorEmoji, buttons);
  await logChannel.send(payload).catch(() => {});
}

async function findWelcomeMessage(channel) {
  const isWelcome = m =>
    m.author?.id === channel.client.user.id &&
    m.components?.[0]?.components?.[0]?.content?.startsWith('## 🎫 Ticket #');

  try {
    const pinned = await channel.messages.fetchPins();
    const found = pinned.find(isWelcome);
    if (found) return found;
  } catch (e) { /* ignore */ }

  try {
    const messages = await channel.messages.fetch({ limit: 50 });
    return messages.find(isWelcome);
  } catch (e) {
    return null;
  }
}

export async function updateTicketWelcomeMessage(channel, ticket) {
  const welcomeMessage = await findWelcomeMessage(channel);
  if (!welcomeMessage) return false;

  const categoryName = getCategoryName(ticket.categoryId);
  const msgData = createTicketChannelMessage(ticket, categoryName);
  const containerComp = msgData.components[0];
  const textComponent = containerComp.components[0];

  // Preserve the "Başvuru Detayları" (form answers) section from the existing message
  const oldContent = welcomeMessage.components?.[0]?.components?.[0]?.content || '';
  const answersBlock = extractAnswersBlock(oldContent);

  let freshContent = textComponent.content;
  if (answersBlock) {
    const marker = '\n\nLütfen';
    const idx = freshContent.indexOf(marker);
    if (idx !== -1) {
      freshContent = freshContent.slice(0, idx) + `\n\n${answersBlock}` + freshContent.slice(idx);
    }
  }
  textComponent.content = freshContent;

  try {
    await welcomeMessage.edit({ components: msgData.components });
    return true;
  } catch (error) {
    console.error('[TicketManager] Welcome message edit failed:', error);
    return false;
  }
}

function extractAnswersBlock(content) {
  const start = content.indexOf('### 📋 Başvuru Detayları');
  if (start === -1) return null;
  const endMarker = content.indexOf('\n\nLütfen', start);
  const end = endMarker === -1 ? content.length : endMarker;
  const block = content.slice(start, end).trim();
  return block || null;
}

export async function createTicket(interaction, categoryId, categoryName, modalAnswers = {}) {
  const blacklisted = db.prepare('SELECT * FROM TicketBlacklist WHERE userId = ?').get(interaction.user.id);
  if (blacklisted) {
    return interaction.reply({
      content: '❌ Ticket açma yetkiniz kısıtlanmıştır.',
      flags: MessageFlags.Ephemeral
    });
  }

  const existingTicket = db.prepare("SELECT * FROM Tickets WHERE userId = ? AND status IN ('open', 'claimed')").get(interaction.user.id);
  if (existingTicket) {
    return interaction.reply({
      content: `⚠️ Zaten açık bir ticket'ınız bulunmaktadır: <#${existingTicket.channelId}>`,
      flags: MessageFlags.Ephemeral
    });
  }

  const lastOpenedAt = ticketCooldowns.get(interaction.user.id) || 0;
  const elapsed = Date.now() - lastOpenedAt;
  if (lastOpenedAt && elapsed < TICKET_COOLDOWN_MS) {
    const remaining = Math.ceil((TICKET_COOLDOWN_MS - elapsed) / 1000);
    return interaction.reply({
      content: `⏳ Çok hızlı ticket açıyorsunuz. Lütfen **${remaining} saniye** bekleyin.`,
      flags: MessageFlags.Ephemeral
    });
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const guild = interaction.guild;

  let caseId = generateCaseId();
  while (db.prepare('SELECT ticketId FROM Tickets WHERE ticketId = ?').get(caseId)) {
    caseId = generateCaseId();
  }

  // Sanitize user-provided answers against mention pings
  const safeAnswers = {};
  for (const [key, value] of Object.entries(modalAnswers)) {
    safeAnswers[key] = escapeMentions(String(value || ''));
  }

  const permissionOverwrites = [
    {
      id: guild.roles.everyone.id,
      deny: [PermissionFlagsBits.ViewChannel]
    },
    {
      id: interaction.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks
      ]
    },
    {
      id: guild.members.me.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.ManageMessages
      ]
    }
  ];

  if (config.staffRoleId && guild.roles.cache.has(config.staffRoleId)) {
    permissionOverwrites.push({
      id: config.staffRoleId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles
      ]
    });
  }

  let targetCategory = config.ticketCategoryId ? guild.channels.cache.get(config.ticketCategoryId) : null;
  if (!targetCategory) {
    targetCategory = guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name === 'Ticketlar');
  }

  let channel;
  try {
    channel = await guild.channels.create({
      name: `ticket-${caseId.toLowerCase()}`,
      type: ChannelType.GuildText,
      parent: targetCategory ? targetCategory.id : null,
      permissionOverwrites: permissionOverwrites
    });
  } catch (error) {
    console.error('[TicketManager] Channel creation failed:', error);
    return interaction.editReply({
      content: '❌ Ticket kanalı oluşturulamadı. Lütfen botun gerekli izinlere sahip olduğundan emin olun.'
    });
  }

  const now = Date.now();
  db.prepare(`
    INSERT INTO Tickets (ticketId, channelId, userId, categoryId, status, priority, createdAt)
    VALUES (?, ?, ?, ?, 'open', 'normal', ?)
  `).run(caseId, channel.id, interaction.user.id, categoryId, now);

  const ticketData = {
    ticketId: caseId,
    userId: interaction.user.id,
    priority: 'normal',
    status: 'open',
    claimedBy: null
  };

  try {
    const msgData = createTicketChannelMessage(ticketData, categoryName, safeAnswers);
    const welcomeMsg = await channel.send(msgData);
    await welcomeMsg.pin().catch(() => {});
  } catch (error) {
    console.error('[TicketManager] Opening message send failed, cleaning up channel:', error);
    await channel.delete().catch(() => {});
    db.prepare('DELETE FROM Tickets WHERE ticketId = ?').run(caseId);
    return interaction.editReply({
      content: '❌ Ticket mesajı gönderilemedi, kanal temizlendi. Lütfen tekrar deneyin.'
    });
  }

  await sendLog(guild, config.logChannelId, 'Yeni Ticket Açıldı', [
    { name: 'Ticket ID', value: `#${caseId}` },
    { name: 'Kullanıcı', value: `<@${interaction.user.id}> (${interaction.user.id})` },
    { name: 'Kategori', value: categoryName },
    { name: 'Kanal', value: channelLabel(channel) }
  ], '🟢');

  ticketCooldowns.set(interaction.user.id, Date.now());

  await interaction.editReply({
    content: `✅ Ticket'ınız başarıyla oluşturuldu: <#${channel.id}>`
  });
}

export async function claimTicket(interaction, ticketId) {
  if (!isStaffMember(interaction.member)) {
    return interaction.reply({ content: '❌ Bu işlemi sadece yetkili rolüne sahip kişiler yapabilir.', flags: MessageFlags.Ephemeral });
  }

  const ticket = db.prepare('SELECT * FROM Tickets WHERE ticketId = ?').get(ticketId);
  if (!ticket) {
    return interaction.reply({ content: '❌ Ticket bulunamadı.', flags: MessageFlags.Ephemeral });
  }

  if (ticket.claimedBy) {
    return interaction.reply({ content: `⚠️ Bu ticket zaten <@${ticket.claimedBy}> tarafından üstlenilmiş.`, flags: MessageFlags.Ephemeral });
  }

  db.prepare("UPDATE Tickets SET claimedBy = ?, status = 'claimed' WHERE ticketId = ?").run(interaction.user.id, ticketId);

  const updatedTicket = { ...ticket, claimedBy: interaction.user.id, status: 'claimed' };
  await updateTicketWelcomeMessage(interaction.channel, updatedTicket);

  await interaction.reply({ content: `📌 Ticket <@${interaction.user.id}> tarafından üstlenildi.` });

  await sendLog(interaction.guild, config.logChannelId, 'Ticket Üstlenildi', [
    { name: 'Ticket ID', value: `#${ticketId}` },
    { name: 'Üstlenen Yetkili', value: `<@${interaction.user.id}> (${interaction.user.id})` },
    { name: 'Kanal', value: channelLabel(interaction.channel) }
  ], '🔵');
}

export async function unclaimTicket(interaction, ticketId) {
  if (!isStaffMember(interaction.member)) {
    return interaction.reply({ content: '❌ Bu işlemi sadece yetkili rolüne sahip kişiler yapabilir.', flags: MessageFlags.Ephemeral });
  }

  const ticket = db.prepare('SELECT * FROM Tickets WHERE ticketId = ?').get(ticketId);
  if (!ticket) {
    return interaction.reply({ content: '❌ Ticket bulunamadı.', flags: MessageFlags.Ephemeral });
  }

  if (!ticket.claimedBy) {
    return interaction.reply({ content: '⚠️ Bu ticket zaten üstlenilmemiş.', flags: MessageFlags.Ephemeral });
  }

  db.prepare("UPDATE Tickets SET claimedBy = NULL, status = 'open' WHERE ticketId = ?").run(ticketId);

  const updatedTicket = { ...ticket, claimedBy: null, status: 'open' };
  await updateTicketWelcomeMessage(interaction.channel, updatedTicket);

  await interaction.reply({ content: `📤 **Ticket #${ticketId}** üstlenmesi <@${interaction.user.id}> tarafından bırakıldı.` });

  await sendLog(interaction.guild, config.logChannelId, 'Ticket Bırakıldı', [
    { name: 'Ticket ID', value: `#${ticketId}` },
    { name: 'Bırakan Yetkili', value: `<@${interaction.user.id}> (${interaction.user.id})` },
    { name: 'Kanal', value: channelLabel(interaction.channel) }
  ], '⚪');
}

export async function transferTicket(interaction, ticketId, targetStaffId) {
  if (!isStaffMember(interaction.member)) {
    return interaction.reply({ content: '❌ Bu işlemi sadece yetkili rolüne sahip kişiler yapabilir.', flags: MessageFlags.Ephemeral });
  }

  const ticket = db.prepare('SELECT * FROM Tickets WHERE ticketId = ?').get(ticketId);
  if (!ticket) {
    return interaction.reply({ content: '❌ Ticket bulunamadı.', flags: MessageFlags.Ephemeral });
  }

  if (ticket.status === 'closed') {
    return interaction.reply({ content: '❌ Kapatılmış bir ticket devredilemez.', flags: MessageFlags.Ephemeral });
  }

  if (!ticket.claimedBy) {
    return interaction.reply({ content: '⚠️ Bu ticket henüz üstlenilmemiş. Devretmek için önce bir yetkili tarafından üstlenilmesi gerekir.', flags: MessageFlags.Ephemeral });
  }

  if (ticket.claimedBy === targetStaffId) {
    return interaction.reply({ content: '⚠️ Bu ticket zaten bu yetkili tarafından üstlenilmiş.', flags: MessageFlags.Ephemeral });
  }

  const targetMember = interaction.guild.members.cache.get(targetStaffId) ||
    await interaction.guild.members.fetch(targetStaffId).catch(() => null);
  if (!targetMember) {
    return interaction.reply({ content: '❌ Hedef kullanıcı bu sunucuda bulunamadı.', flags: MessageFlags.Ephemeral });
  }
  if (!isStaffMember(targetMember)) {
    return interaction.reply({ content: '❌ Hedef kullanıcı yetkili rolüne sahip değil.', flags: MessageFlags.Ephemeral });
  }

  db.prepare("UPDATE Tickets SET claimedBy = ?, status = 'claimed' WHERE ticketId = ?").run(targetStaffId, ticketId);

  const updatedTicket = { ...ticket, claimedBy: targetStaffId, status: 'claimed' };
  await updateTicketWelcomeMessage(interaction.channel, updatedTicket);

  await sendLog(interaction.guild, config.logChannelId, 'Ticket Devredildi', [
    { name: 'Ticket ID', value: `#${ticketId}` },
    { name: 'Eski Yetkili', value: `<@${ticket.claimedBy}> (${ticket.claimedBy})` },
    { name: 'Yeni Yetkili', value: `<@${targetStaffId}> (${targetStaffId})` },
    { name: 'Devreden', value: `<@${interaction.user.id}> (${interaction.user.id})` },
    { name: 'Kanal', value: channelLabel(interaction.channel) }
  ], '🔄');

  return interaction.reply({
    content: `🔄 **Ticket #${ticketId}** <@${ticket.claimedBy}> kişisinden <@${targetStaffId}> kişisine devredildi.`
  });
}

export async function blacklistAdd(interaction, userId, reason) {
  const existing = db.prepare('SELECT * FROM TicketBlacklist WHERE userId = ?').get(userId);
  if (existing) {
    return interaction.reply({ content: '⚠️ Bu kullanıcı zaten kara listede.', flags: MessageFlags.Ephemeral });
  }

  const safeReason = escapeMentions(String(reason || 'Sebep belirtilmedi'));
  db.prepare('INSERT INTO TicketBlacklist (userId, addedBy, reason, createdAt) VALUES (?, ?, ?, ?)')
    .run(userId, interaction.user.id, safeReason, Date.now());

  await sendLog(interaction.guild, config.blacklistLogChannelId || config.logChannelId, 'Kara Listeye Alındı', [
    { name: 'Kullanıcı', value: `<@${userId}> (${userId})` },
    { name: 'Ekleyen', value: `<@${interaction.user.id}> (${interaction.user.id})` },
    { name: 'Sebep', value: safeReason }
  ], '⛔');

  return interaction.reply({ content: `⛔ <@${userId}> kara listeye eklendi.`, flags: MessageFlags.Ephemeral });
}

export async function blacklistRemove(interaction, userId) {
  const existing = db.prepare('SELECT * FROM TicketBlacklist WHERE userId = ?').get(userId);
  if (!existing) {
    return interaction.reply({ content: '⚠️ Bu kullanıcı kara listede değil.', flags: MessageFlags.Ephemeral });
  }

  db.prepare('DELETE FROM TicketBlacklist WHERE userId = ?').run(userId);

  await sendLog(interaction.guild, config.blacklistLogChannelId || config.logChannelId, 'Kara Listeden Çıkarıldı', [
    { name: 'Kullanıcı', value: `<@${userId}> (${userId})` },
    { name: 'Çıkaran', value: `<@${interaction.user.id}> (${interaction.user.id})` }
  ], '✅');

  return interaction.reply({ content: `✅ <@${userId}> kara listeden çıkarıldı.`, flags: MessageFlags.Ephemeral });
}

export async function blacklistList(interaction) {
  const rows = db.prepare('SELECT * FROM TicketBlacklist ORDER BY createdAt DESC').all();
  if (rows.length === 0) {
    return interaction.reply({ content: '📭 Kara listede hiç kullanıcı yok.', flags: MessageFlags.Ephemeral });
  }

  const lines = rows.map((r, i) =>
    `**${i + 1}.** <@${r.userId}> (${r.userId}) — Sebep: ${r.reason || 'Belirtilmedi'}`
  );
  const content = `### ⛔ Kara Liste (${rows.length})\n\n${lines.join('\n')}`;
  return interaction.reply({ content: content.length > 2000 ? content.slice(0, 1997) + '...' : content, flags: MessageFlags.Ephemeral });
}

export async function closeTicket(interaction, ticketId, closeReason = 'Sebep belirtilmedi') {
  const ticket = db.prepare('SELECT * FROM Tickets WHERE ticketId = ?').get(ticketId);
  if (!ticket) {
    return interaction.reply({ content: '❌ Ticket bulunamadı.', flags: MessageFlags.Ephemeral });
  }

  // Authorization: staff role, administrator, the ticket owner, or the bot itself (auto-close)
  const isOwner = interaction.user?.id === ticket.userId;
  if (!isBotUser(interaction) && !isStaffMember(interaction.member) && !isOwner) {
    return interaction.reply({ content: '❌ Bu işlemi sadece yetkili rolü veya ticket sahibi yapabilir.', flags: MessageFlags.Ephemeral });
  }

  if (ticket.status === 'closed') {
    return interaction.reply({ content: '⚠️ Bu ticket zaten kapatılmış.', flags: MessageFlags.Ephemeral });
  }

  await interaction.reply({ content: '🔒 Ticket kapatılıyor ve transkript hazırlanıyor...' });

  const safeReason = escapeMentions(String(closeReason || 'Sebep belirtilmedi'));
  const now = Date.now();
  db.prepare("UPDATE Tickets SET status = 'closed', closedAt = ?, closedBy = ?, closeReason = ? WHERE ticketId = ?")
    .run(now, interaction.user.id, safeReason, ticketId);

  const updatedTicket = { ...ticket, closedAt: now, closedBy: interaction.user.id, closeReason: safeReason };

  let transcriptResult = null;
  try {
    transcriptResult = await buildTranscript(interaction.channel, updatedTicket);
  } catch (error) {
    console.error('[TicketManager] Transcript build failed:', error);
  }

  if (transcriptResult) {
    db.prepare(`
      INSERT INTO Transcripts (ticketId, html, createdAt)
      VALUES (?, ?, ?)
      ON CONFLICT(ticketId) DO UPDATE SET html = ?, createdAt = ?
    `).run(ticketId, transcriptResult.html, now, transcriptResult.html, now);

    // Send transcript file to the hidden transcript-files channel
    if (config.transcriptChannelId) {
      const tChannel = interaction.guild.channels.cache.get(config.transcriptChannelId);
      if (tChannel) {
        await tChannel.send({
          content: `📄 **Transkript - Ticket #${ticketId}**`,
          files: [transcriptResult.attachment]
        }).catch(() => {});
      }
    }
  }

  if (config.logChannelId) {
    const logChannel = interaction.guild.channels.cache.get(config.logChannelId);
    if (logChannel) {
      const logPayload = createLogMessage('Ticket Kapatıldı', [
        { name: 'Ticket ID', value: `#${ticketId}` },
        { name: 'Kapatan', value: `<@${interaction.user.id}> (${interaction.user.id})` },
        { name: 'Neden', value: safeReason },
        { name: 'Açan Kullanıcı', value: `<@${ticket.userId}> (${ticket.userId})` },
        { name: 'İlgilenen Yetkili', value: ticket.claimedBy ? `<@${ticket.claimedBy}> (${ticket.claimedBy})` : 'Yok' }
      ], '🔴', transcriptResult ? [
        {
          type: 2,
          style: 2,
          custom_id: `btn_transcript_download_${ticketId}`,
          label: '📥 Transkripti İndir'
        }
      ] : []);
      await logChannel.send(logPayload).catch(e => console.error('Log error:', e));
    }
  }

  try {
    const ticketOwner = await interaction.client.users.fetch(ticket.userId);
    if (ticketOwner) {
      const ratingMsg = createRatingMessage(updatedTicket, safeReason, false, !!config.feedbackChannelId);
      await ticketOwner.send(ratingMsg);
    }
  } catch (e) {
    console.log(`[TicketManager] DM gönderilemedi (${ticket.userId}):`, e.message);
  }

  try {
    await new Promise(resolve => setTimeout(resolve, 3000));
    await interaction.channel.delete();
  } catch (e) {
    console.error('Channel delete error:', e);
  }
}

export async function callTicketUser(interaction, ticketId) {
  if (!isStaffMember(interaction.member)) {
    return interaction.reply({ content: '❌ Bu işlemi sadece yetkili rolüne sahip kişiler yapabilir.', flags: MessageFlags.Ephemeral });
  }

  const ticket = db.prepare('SELECT * FROM Tickets WHERE ticketId = ?').get(ticketId);
  if (!ticket) {
    return interaction.reply({ content: '❌ Ticket bulunamadı.', flags: MessageFlags.Ephemeral });
  }

  try {
    const user = await interaction.client.users.fetch(ticket.userId);
    await user.send('🔔 **Yetkili ekibi size ulaşmaya çalışıyor!**\nLütfen açmış olduğunuz ticket kanalına dönüp mesajları kontrol ediniz.');
    return interaction.reply({ content: `📣 <@${ticket.userId}> kullanıcısına çağrı gönderildi.`, flags: MessageFlags.Ephemeral });
  } catch (error) {
    console.error('[TicketManager] Call user DM failed:', error.message);
    return interaction.reply({ content: `❌ <@${ticket.userId}> kullanıcısına DM gönderilemedi (DM ayarları kapalı olabilir).`, flags: MessageFlags.Ephemeral });
  }
}

export async function addNote(interaction, ticketId, noteText) {
  if (!isStaffMember(interaction.member)) {
    return interaction.reply({ content: '❌ Sadece yetkililer not ekleyebilir.', flags: MessageFlags.Ephemeral });
  }

  const safeNote = escapeMentions(String(noteText || ''));
  if (!safeNote.trim()) {
    return interaction.reply({ content: '❌ Not içeriği boş olamaz.', flags: MessageFlags.Ephemeral });
  }

  db.prepare('INSERT INTO TicketNotes (ticketId, authorId, note, createdAt) VALUES (?, ?, ?, ?)').run(
    ticketId,
    interaction.user.id,
    safeNote,
    Date.now()
  );

  await sendLog(interaction.guild, config.noteLogChannelId, 'Not Eklendi', [
    { name: 'Ticket ID', value: `#${ticketId}` },
    { name: 'Ekleyen', value: `<@${interaction.user.id}> (${interaction.user.id})` },
    { name: 'Not', value: safeNote.length > 1024 ? safeNote.slice(0, 1021) + '...' : safeNote }
  ], '📝');

  await interaction.reply({
    content: `📝 **Dahili Not Eklendi:** ${safeNote}`,
    flags: MessageFlags.Ephemeral
  });
}

export async function showRemoveNoteMenu(interaction, ticketId) {
  if (!isStaffMember(interaction.member)) {
    return interaction.reply({ content: '❌ Bu işlemi sadece yetkililer yapabilir.', flags: MessageFlags.Ephemeral });
  }

  const notes = db.prepare('SELECT * FROM TicketNotes WHERE ticketId = ? AND (isDeleted IS NULL OR isDeleted = 0) ORDER BY createdAt ASC').all(ticketId);
  if (notes.length === 0) {
    return interaction.reply({ content: '📭 Silinecek not bulunmuyor.', flags: MessageFlags.Ephemeral });
  }

  const options = notes.slice(0, 25).map((n, idx) => ({
    label: `Not ${idx + 1}`,
    description: n.note.length > 90 ? n.note.slice(0, 90) + '...' : n.note,
    value: String(n.noteId)
  }));

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`select_remove_note_${ticketId}`)
    .setPlaceholder('Silmek istediğiniz notu seçin...')
    .addOptions(options);

  const row = new ActionRowBuilder().addComponents(selectMenu);

  await interaction.reply({
    content: '🗑️ **Aşağıdan silmek istediğiniz notu seçin:**',
    components: [row],
    flags: MessageFlags.Ephemeral
  });
}

export async function deleteNote(interaction, noteId, ticketId) {
  if (!isStaffMember(interaction.member)) {
    return interaction.reply({ content: '❌ Bu işlemi sadece yetkililer yapabilir.', flags: MessageFlags.Ephemeral });
  }

  const note = db.prepare('SELECT * FROM TicketNotes WHERE noteId = ? AND ticketId = ?').get(noteId, ticketId);
  if (!note) {
    return interaction.reply({ content: '❌ Not bulunamadı.', flags: MessageFlags.Ephemeral });
  }

  db.prepare('UPDATE TicketNotes SET isDeleted = 1 WHERE noteId = ?').run(noteId);

  await sendLog(interaction.guild, config.noteLogChannelId, 'Not Silindi', [
    { name: 'Ticket ID', value: `#${ticketId}` },
    { name: 'Silen', value: `<@${interaction.user.id}> (${interaction.user.id})` },
    { name: 'Silinen Not', value: note.note.length > 1024 ? note.note.slice(0, 1021) + '...' : note.note }
  ], '🗑️');

  await interaction.reply({ content: '✅ Not başarıyla silindi.', flags: MessageFlags.Ephemeral });
}

export async function viewNotes(interaction, ticketId) {
  if (!isStaffMember(interaction.member)) {
    return interaction.reply({ content: '❌ Bu işlemi sadece yetkililer yapabilir.', flags: MessageFlags.Ephemeral });
  }

  const notes = db.prepare('SELECT * FROM TicketNotes WHERE ticketId = ? AND (isDeleted IS NULL OR isDeleted = 0) ORDER BY createdAt ASC').all(ticketId);
  if (notes.length === 0) {
    return interaction.reply({ content: '📭 Bu ticket için henüz not eklenmemiş.', flags: MessageFlags.Ephemeral });
  }

  const lines = notes.map((n, idx) =>
    `**${idx + 1}.** ${n.note}\n   👤 <@${n.authorId}> • 🕒 <t:${Math.floor(n.createdAt / 1000)}:f>`
  );

  const content = `### 📝 Ticket #${ticketId} — Dahili Notlar\n\n${lines.join('\n\n')}`;

  await interaction.reply({
    content: content.length > 2000 ? content.slice(0, 1997) + '...' : content,
    flags: MessageFlags.Ephemeral
  });
}

export async function changePriority(interaction, ticketId, newPriority) {
  if (!isStaffMember(interaction.member)) {
    return interaction.reply({ content: '❌ Bu işlemi sadece yetkililer yapabilir.', flags: MessageFlags.Ephemeral });
  }

  const normalized = String(newPriority || '').toLowerCase();
  if (!VALID_PRIORITIES.includes(normalized)) {
    return interaction.reply({ content: '❌ Geçersiz öncelik derecesi.', flags: MessageFlags.Ephemeral });
  }

  const ticket = db.prepare('SELECT * FROM Tickets WHERE ticketId = ?').get(ticketId);
  if (!ticket) {
    return interaction.reply({ content: '❌ Ticket bulunamadı.', flags: MessageFlags.Ephemeral });
  }

  if (ticket.status === 'closed') {
    return interaction.reply({ content: '❌ Kapatılmış bir ticketın önceliği değiştirilemez.', flags: MessageFlags.Ephemeral });
  }

  const oldPriority = ticket.priority || 'normal';
  db.prepare('UPDATE Tickets SET priority = ? WHERE ticketId = ?').run(normalized, ticketId);

  const updatedTicket = { ...ticket, priority: normalized };
  await updateTicketWelcomeMessage(interaction.channel, updatedTicket);

  await sendLog(interaction.guild, config.logChannelId, 'Öncelik Değiştirildi', [
    { name: 'Ticket ID', value: `#${ticketId}` },
    { name: 'Değiştiren', value: `<@${interaction.user.id}> (${interaction.user.id})` },
    { name: 'Eski Öncelik', value: `\`${oldPriority.toUpperCase()}\`` },
    { name: 'Yeni Öncelik', value: `\`${normalized.toUpperCase()}\`` }
  ], '🎚️');

  await interaction.reply({
    content: `🎚️ **Ticket #${ticketId}** önceliği **${normalized.toUpperCase()}** olarak güncellendi.`
  });
}

export async function recordRating(interaction, ticketId, rating) {
  const value = parseInt(rating, 10);
  if (!Number.isInteger(value) || value < 1 || value > 5) {
    return interaction.reply({ content: '❌ Geçersiz puan.', flags: MessageFlags.Ephemeral });
  }

  const ticket = db.prepare('SELECT * FROM Tickets WHERE ticketId = ?').get(ticketId);
  if (!ticket) {
    return interaction.reply({ content: '❌ Ticket bulunamadı.', flags: MessageFlags.Ephemeral });
  }

  if (interaction.user.id !== ticket.userId) {
    return interaction.reply({ content: '❌ Bu ticket için değerlendirme yapamazsınız.', flags: MessageFlags.Ephemeral });
  }

  db.prepare(`
    INSERT INTO TicketRatings (ticketId, userId, rating, comment, createdAt)
    VALUES (?, ?, ?, NULL, ?)
    ON CONFLICT(ticketId) DO UPDATE SET rating = ?, userId = ?
  `).run(ticketId, interaction.user.id, value, Date.now(), value, interaction.user.id);

  // Log the rating to the log channel
  try {
    await sendLog(interaction.client, config.scoreLogChannelId, 'Yeni Değerlendirme', [
      { name: 'Ticket ID', value: `#${ticketId}` },
      { name: 'Puanlayan', value: `<@${interaction.user.id}> (${interaction.user.id})` },
      { name: 'Puan', value: `⭐ ${value} / 5` },
      { name: 'İlgilenen Yetkili', value: ticket.claimedBy ? `<@${ticket.claimedBy}> (${ticket.claimedBy})` : 'Yok' }
    ], '⭐');
  } catch (e) {
    console.error('[TicketManager] Rating log error:', e.message);
  }

  // Disable the rating buttons so it cannot be changed later
  const updatedMsg = createRatingMessage({ ...ticket, closedBy: ticket.closedBy }, ticket.closeReason || '', true);
  await interaction.update(updatedMsg);

  await interaction.followUp({
    content: `⭐ **Teşekkürler!** Değerlendirmeniz (${value}/5) kaydedildi.`,
    flags: MessageFlags.Ephemeral
  });
}

export async function sendTranscriptFile(interaction, ticketId) {
  if (!isStaffMember(interaction.member)) {
    return interaction.reply({ content: '❌ Bu işlemi sadece yetkililer yapabilir.', flags: MessageFlags.Ephemeral });
  }

  const row = db.prepare('SELECT html FROM Transcripts WHERE ticketId = ?').get(ticketId);
  if (!row) {
    return interaction.reply({ content: '❌ Bu ticket için transkript bulunamadı.', flags: MessageFlags.Ephemeral });
  }

  const buffer = Buffer.from(row.html, 'utf-8');
  const attachment = new AttachmentBuilder(buffer, { name: `transcript-${ticketId}.html` });

  await interaction.reply({
    content: `📄 **Transkript #${ticketId}**`,
    files: [attachment],
    flags: MessageFlags.Ephemeral
  });
}

export async function submitFeedback(interaction, ticketId) {
  if (!config.feedbackChannelId) {
    return interaction.reply({ content: '❌ Geri bildirim sistemi şu anda kapalı.', flags: MessageFlags.Ephemeral });
  }

  const ticket = db.prepare('SELECT * FROM Tickets WHERE ticketId = ?').get(ticketId);
  if (!ticket) {
    return interaction.reply({ content: '❌ Ticket bulunamadı.', flags: MessageFlags.Ephemeral });
  }

  if (interaction.user.id !== ticket.userId) {
    return interaction.reply({ content: '❌ Bu ticket için geri bildirim gönderemezsiniz.', flags: MessageFlags.Ephemeral });
  }

  const content = (interaction.fields.getTextInputValue('input_feedback') || '').trim();
  if (!content) {
    return interaction.reply({ content: '❌ Geri bildirim içeriği boş olamaz.', flags: MessageFlags.Ephemeral });
  }

  const feedbackId = generateCaseId();
  db.prepare('INSERT INTO Feedbacks (feedbackId, ticketId, userId, content, status, createdAt) VALUES (?, ?, ?, ?, ?, ?)')
    .run(feedbackId, ticketId, interaction.user.id, escapeMentions(content), 'pending', Date.now());

  if (config.feedbackSystemChannelId) {
    const channel = interaction.client.channels.cache.get(config.feedbackSystemChannelId);
    if (channel) {
      await channel.send(createFeedbackPendingMessage({
        feedbackId,
        ticketId,
        userId: interaction.user.id,
        content: escapeMentions(content)
      })).catch(() => {});
    }
  }

  await interaction.reply({
    content: '💬 **Geri bildiriminiz iletildi!** Yetkili onayının ardından yayınlanacaktır.',
    flags: MessageFlags.Ephemeral
  });
}

export async function approveFeedback(interaction, feedbackId) {
  if (!isStaffMember(interaction.member)) {
    return interaction.reply({ content: '❌ Bu işlemi sadece yetkililer yapabilir.', flags: MessageFlags.Ephemeral });
  }

  const feedback = db.prepare('SELECT * FROM Feedbacks WHERE feedbackId = ?').get(feedbackId);
  if (!feedback) {
    return interaction.reply({ content: '❌ Geri bildirim bulunamadı.', flags: MessageFlags.Ephemeral });
  }

  if (feedback.status === 'approved') {
    return interaction.reply({ content: '⚠️ Bu geri bildirim zaten onaylanmış.', flags: MessageFlags.Ephemeral });
  }

  await interaction.deferUpdate();

  db.prepare("UPDATE Feedbacks SET status = 'approved' WHERE feedbackId = ?").run(feedbackId);

  if (config.feedbackChannelId) {
    const channel = interaction.client.channels.cache.get(config.feedbackChannelId);
    if (channel) {
      await channel.send(createFeedbackApprovedMessage(feedback)).catch(() => {});
    }
  }

  try {
    await interaction.editReply(createFeedbackPendingMessage(feedback, true)).catch(() => {});
  } catch (e) { /* ignore */ }

  await interaction.followUp({ content: '✅ Geri bildirim onaylandı ve geri bildirim kanalına iletildi.', flags: MessageFlags.Ephemeral }).catch(() => {});
}

export async function rejectFeedback(interaction, feedbackId) {
  if (!isStaffMember(interaction.member)) {
    return interaction.reply({ content: '❌ Bu işlemi sadece yetkililer yapabilir.', flags: MessageFlags.Ephemeral });
  }

  const feedback = db.prepare('SELECT * FROM Feedbacks WHERE feedbackId = ?').get(feedbackId);
  if (!feedback) {
    return interaction.reply({ content: '❌ Geri bildirim bulunamadı.', flags: MessageFlags.Ephemeral });
  }

  if (feedback.status === 'rejected') {
    return interaction.reply({ content: '⚠️ Bu geri bildirim zaten reddedilmiş.', flags: MessageFlags.Ephemeral });
  }

  await interaction.deferUpdate();

  db.prepare("UPDATE Feedbacks SET status = 'rejected' WHERE feedbackId = ?").run(feedbackId);

  try {
    await interaction.message.delete().catch(() => {});
  } catch (e) { /* ignore */ }

  await interaction.followUp({ content: '❌ Geri bildirim reddedildi ve silindi.', flags: MessageFlags.Ephemeral }).catch(() => {});
}
