import { SlashCommandBuilder, PermissionFlagsBits , MessageFlags} from 'discord.js';
import { config, loadConfig } from '../../utils/configLoader.js';
import { updateBotStatus } from '../../managers/statusManager.js';

export default {
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('Konfigürasyon yönetim komutları.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub
        .setName('reload')
        .setDescription('config.json ayarlarını canlı olarak yeniden yükler.')
    )
    .addSubcommand(sub =>
      sub
        .setName('view')
        .setDescription('Geçerli konfigürasyon ayarlarını görüntüler.')
    ),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'reload') {
      const refreshedConfig = loadConfig();
      if (refreshedConfig) {
        updateBotStatus(interaction.client);
        return interaction.reply({
          content: '🔄 `config.json` yapılandırması başarıyla yenilendi ve bot durumu güncellendi.',
          flags: MessageFlags.Ephemeral
        });
      } else {
        return interaction.reply({
          content: '❌ `config.json` dosyası okunurken hata oluştu.',
          flags: MessageFlags.Ephemeral
        });
      }
    }

    if (subcommand === 'view') {
      const summary = [
        '**📋 Geçerli Konfigürasyon**',
        `• **Panel Kanalı:** ${config.panelChannelId ? `<#${config.panelChannelId}>` : '*ayarlanmadı*'}`,
        `• **Ticket Kategorisi:** ${config.ticketCategoryId ? `<#${config.ticketCategoryId}>` : '*ayarlanmadı*'}`,
        `• **Log Kanalı:** ${config.logChannelId ? `<#${config.logChannelId}>` : '*ayarlanmadı*'}`,
        `• **Not Kayıtları:** ${config.noteLogChannelId ? `<#${config.noteLogChannelId}>` : '*ayarlanmadı*'}`,
        `• **Transkript Dosyaları:** ${config.transcriptChannelId ? `<#${config.transcriptChannelId}>` : '*ayarlanmadı*'}`,
        `• **Geri Bildirim Sistemi:** ${config.feedbackChannelId ? `<#${config.feedbackChannelId}> (açık)` : '*kapalı*'}`,
        `• **Puan Kayıtları:** ${config.scoreLogChannelId ? `<#${config.scoreLogChannelId}>` : '*ayarlanmadı*'}`,
        `• **Kara Liste Kayıtları:** ${config.blacklistLogChannelId ? `<#${config.blacklistLogChannelId}>` : '*ayarlanmadı*'}`,
        `• **Yetkili Rolü:** ${config.staffRoleId ? `<@&${config.staffRoleId}>` : '*ayarlanmadı*'}`,
        `• **SLA Uyarısı (Saniye):** ${config.slaWarningTimeout ?? 14400}`,
        `• **Durum:** \`${config.status?.type} / ${config.status?.text}\``
      ].join('\n');

      return interaction.reply({
        content: summary,
        flags: MessageFlags.Ephemeral
      });
    }
  }
};