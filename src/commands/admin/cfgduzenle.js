import { SlashCommandBuilder, PermissionFlagsBits , MessageFlags} from 'discord.js';
import fs from 'fs';
import path from 'path';
import { config, loadConfig } from '../../utils/configLoader.js';
import { updateBotStatus } from '../../managers/statusManager.js';

const ROLE_LABELS = {
  staffRoleId: 'Yetkili Rolü'
};

const CHANNEL_LABELS = {
  panelChannelId: 'Panel Kanalı',
  logChannelId: 'Log Kanalı',
  ticketCategoryId: 'Ticket Kategorisi',
  noteLogChannelId: 'Not Kayıtları',
  transcriptChannelId: 'Transkript Dosyaları',
  feedbackSystemChannelId: 'Geri Bildirim Sistemi',
  feedbackChannelId: 'Geri Bildirim Kanalı',
  scoreLogChannelId: 'Puan Kayıtları',
  blacklistLogChannelId: 'Kara Liste Kayıtları'
};

export default {
  data: new SlashCommandBuilder()
    .setName('cfg-duzenle')
    .setDescription('Config.json içindeki rol ve kanal ayarlarını düzenler.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub
        .setName('rol')
        .setDescription('Bir config rolünü değiştirir.')
        .addStringOption(opt =>
          opt
            .setName('alan')
            .setDescription('Hangi rol ayarını değiştirmek istiyorsunuz?')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addRoleOption(opt =>
          opt
            .setName('rol')
            .setDescription('Yeni rol')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('kanal')
        .setDescription('Bir config kanalını değiştirir.')
        .addStringOption(opt =>
          opt
            .setName('alan')
            .setDescription('Hangi kanal ayarını değiştirmek istiyorsunuz?')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addChannelOption(opt =>
          opt
            .setName('kanal')
            .setDescription('Yeni kanal veya kategori')
            .setRequired(true)
        )
    ),

  async autocomplete(interaction) {
    const sub = interaction.options.getSubcommand();
    const focused = interaction.options.getFocused().toLowerCase();

    let labels = sub === 'rol' ? ROLE_LABELS : CHANNEL_LABELS;
    if (sub !== 'rol' && sub !== 'kanal') return;

    const choices = Object.entries(labels)
      .map(([key, label]) => ({ name: `${label} (${key})`, value: key }))
      .filter(c => c.name.toLowerCase().includes(focused) || c.value.toLowerCase().includes(focused))
      .slice(0, 25);

    await interaction.respond(choices);
  },

  async execute(interaction) {
    const isDeveloper = Array.isArray(config.developers) && config.developers.includes(interaction.user.id);
    const isOwner = interaction.guild?.ownerId === interaction.user.id;

    if (!isDeveloper && !isOwner) {
      return interaction.reply({
        content: '❌ Bu komutu sadece **sunucu sahibi** veya **bot geliştiricileri** kullanabilir.',
        flags: MessageFlags.Ephemeral
      });
    }

    const sub = interaction.options.getSubcommand();
    const alan = interaction.options.getString('alan');

    const configPath = path.resolve(process.cwd(), 'config.json');
    const freshConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    if (sub === 'rol') {
      if (!(alan in ROLE_LABELS)) {
        return interaction.reply({ content: `❌ \`${alan}\` geçerli bir rol alanı değil.`, flags: MessageFlags.Ephemeral });
      }

      const yeniRol = interaction.options.getRole('rol');
      const eskiId = freshConfig[alan] || '';
      freshConfig[alan] = yeniRol.id;
      fs.writeFileSync(configPath, JSON.stringify(freshConfig, null, 2));
      loadConfig();
      updateBotStatus(interaction.client);

      const label = ROLE_LABELS[alan];
      return interaction.reply({
        content: `✅ **${label}** güncellendi.\n\n**Eski:** ${eskiId ? `<@&${eskiId}>` : 'Boş'}\n**Yeni:** <@&${yeniRol.id}>\n\nAyarlar canlı olarak yenilendi.`,
        flags: MessageFlags.Ephemeral
      });
    } else if (sub === 'kanal') {
      if (!(alan in CHANNEL_LABELS)) {
        return interaction.reply({ content: `❌ \`${alan}\` geçerli bir kanal alanı değil.`, flags: MessageFlags.Ephemeral });
      }

      const yeniKanal = interaction.options.getChannel('kanal');
      const eskiId = freshConfig[alan] || '';
      freshConfig[alan] = yeniKanal.id;
      fs.writeFileSync(configPath, JSON.stringify(freshConfig, null, 2));
      loadConfig();
      updateBotStatus(interaction.client);

      const label = CHANNEL_LABELS[alan];
      return interaction.reply({
        content: `✅ **${label}** güncellendi.\n\n**Eski:** ${eskiId ? `<#${eskiId}>` : 'Boş'}\n**Yeni:** <#${yeniKanal.id}>\n\nAyarlar canlı olarak yenilendi.`,
        flags: MessageFlags.Ephemeral
      });
    }

    return interaction.reply({ content: '❌ Geçersiz alt komut.', flags: MessageFlags.Ephemeral });
  }
};