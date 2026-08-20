import { SlashCommandBuilder, PermissionFlagsBits, ChannelType , MessageFlags} from 'discord.js';
import { saveConfig } from '../../utils/configLoader.js';

async function upsertBotCategoryOverrides(category, botMember) {
  const existing = category.permissionOverwrites.cache;
  const overwrites = existing.map(o => ({
    id: o.id,
    allow: o.allow.bitfield,
    deny: o.deny.bitfield
  }));

  const botIdx = overwrites.findIndex(o => o.id === botMember.id);
  const botOverride = {
    id: botMember.id,
    allow: [
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.ManageChannels,
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.ReadMessageHistory
    ],
    deny: []
  };

  if (botIdx >= 0) {
    overwrites[botIdx] = botOverride;
  } else {
    overwrites.push(botOverride);
  }

  await category.permissionOverwrites.set(overwrites);
}

function buildChannelPerms(guild, staffRole, botMember, staffVisible = true) {
  const perms = [
    {
      id: guild.roles.everyone.id,
      deny: [PermissionFlagsBits.ViewChannel]
    }
  ];

  if (staffVisible && staffRole) {
    perms.push({
      id: staffRole.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
      deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AddReactions, PermissionFlagsBits.ManageMessages]
    });
  }

  perms.push({
    id: botMember.id,
    allow: [
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.ReadMessageHistory,
      PermissionFlagsBits.AttachFiles,
      PermissionFlagsBits.EmbedLinks,
      PermissionFlagsBits.ManageMessages,
      PermissionFlagsBits.ManageChannels
    ],
    deny: []
  });

  return perms;
}

async function ensureTextChannel(guild, logCategory, name, perms) {
  let channel = guild.channels.cache.find(
    c => c.type === ChannelType.GuildText && c.name === name && c.parentId === logCategory.id
  );
  if (!channel) {
    channel = await guild.channels.create({
      name: name,
      type: ChannelType.GuildText,
      parent: logCategory.id,
      permissionOverwrites: perms
    });
  } else {
    await channel.permissionOverwrites.set(perms).catch(() => {});
  }
  return channel;
}

export default {
  data: new SlashCommandBuilder()
    .setName('kur')
    .setDescription('Ticket botunu kurar; kategori ve otomatik log kanallarını hazırlar.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addRoleOption(option =>
      option
        .setName('yetkili-rol')
        .setDescription('Ticket yetkili rolünü seçiniz.')
        .setRequired(true)
    )
    .addChannelOption(option =>
      option
        .setName('kategori')
        .setDescription('Ticket kanallarının açılacağı kategoriyi seçiniz.')
        .addChannelTypes(ChannelType.GuildCategory)
        .setRequired(true)
    )
    .addChannelOption(option =>
      option
        .setName('feedback-kanali')
        .setDescription('İsteğe bağlı: Onaylanan feedbacklerin yayınlanacağı kanal. Seçilmezse feedback sistemi kapalı kalır.')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    ),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const guild = interaction.guild;
    const staffRole = interaction.options.getRole('yetkili-rol');
    const ticketCategory = interaction.options.getChannel('kategori');
    const feedbackChannel = interaction.options.getChannel('feedback-kanali');

    const botMember = guild.members.me;
    const requiredPerms = [
      PermissionFlagsBits.ManageChannels,
      PermissionFlagsBits.ManageRoles,
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.ReadMessageHistory,
      PermissionFlagsBits.ManageMessages
    ];
    const missingPerms = requiredPerms.filter(p => !botMember.permissions.has(p));
    if (missingPerms.length > 0) {
      return interaction.editReply({
        content: `❌ Bot yetersiz izinlere sahip. Eksik: ${missingPerms.map(p => `\`${p}\``).join(', ')}\nLütfen bot rolünü sunucuda en üste taşıyıp **Yönetici** izni verin.`
      });
    }

    // 1. Bot overrides on selected ticket category
    await upsertBotCategoryOverrides(ticketCategory, botMember);

    // 2. Create/find Ticket Logs category
    let logCategory = guild.channels.cache.find(
      c => c.type === ChannelType.GuildCategory && c.name === 'Ticket Logs'
    );
    if (!logCategory) {
      logCategory = await guild.channels.create({
        name: 'Ticket Logs',
        type: ChannelType.GuildCategory
      });
    }
    await upsertBotCategoryOverrides(logCategory, botMember);

    // 3. Auto-create log channels under Ticket Logs
    const logPerms = buildChannelPerms(guild, staffRole, botMember, true);
    const botOnlyPerms = buildChannelPerms(guild, staffRole, botMember, false);

    const logChannel = await ensureTextChannel(guild, logCategory, 'ticket-logs', logPerms);
    const noteLogChannel = await ensureTextChannel(guild, logCategory, 'note-logs', logPerms);
    const transcriptChannel = await ensureTextChannel(guild, logCategory, 'transkript-files', botOnlyPerms);
    const feedbackSystemChannel = await ensureTextChannel(guild, logCategory, 'feedback-system', logPerms);
    const scoreLogChannel = await ensureTextChannel(guild, logCategory, 'score-logs', logPerms);
    const blacklistLogChannel = await ensureTextChannel(guild, logCategory, 'blacklist-logs', logPerms);

    // 4. Save Config
    saveConfig({
      staffRoleId: staffRole.id,
      ticketCategoryId: ticketCategory.id,
      logChannelId: logChannel.id,
      noteLogChannelId: noteLogChannel.id,
      transcriptChannelId: transcriptChannel.id,
      feedbackSystemChannelId: feedbackSystemChannel.id,
      feedbackChannelId: feedbackChannel ? feedbackChannel.id : '',
      scoreLogChannelId: scoreLogChannel.id,
      blacklistLogChannelId: blacklistLogChannel.id,
      panelChannelId: interaction.channel.id
    });

    await interaction.editReply({
      content: `✅ **Kurulum Başarıyla Tamamlandı!**\n\n• **Yetkili Rolü:** <@&${staffRole.id}>\n• **Ticket Kategorisi:** <#${ticketCategory.id}>\n• **Log Kanalı:** <#${logChannel.id}>\n• **Not Kayıtları:** <#${noteLogChannel.id}>\n• **Transkript Dosyaları:** <#${transcriptChannel.id}> (sadece bot)\n• **Geri Bildirim Sistemi:** ${feedbackChannel ? `**Açık** → <#${feedbackChannel.id}>` : '**Kapalı** (kanal seçilmedi)'}\n• **Puan Kayıtları:** <#${scoreLogChannel.id}>\n• **Kara Liste Kayıtları:** <#${blacklistLogChannel.id}>\n\n📌 **Paneli göndermek için** \`/panelgonder\` komutunu kullanın.`
    });
  }
};