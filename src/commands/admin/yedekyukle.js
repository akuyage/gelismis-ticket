import { SlashCommandBuilder, PermissionFlagsBits , MessageFlags} from 'discord.js';
import { listBackups, createAutoBackup, restoreDatabase, restoreConfig, getBackup } from '../../utils/backupManager.js';
import { updateBotStatus } from '../../managers/statusManager.js';

export default {
  data: new SlashCommandBuilder()
    .setName('yedekyukle')
    .setDescription('Alınmış bir yedeği geri yükler.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub
        .setName('veritabani')
        .setDescription('Seçilen yedeğin veritabanı bölümünü geri yükler.')
        .addStringOption(opt =>
          opt
            .setName('dosya')
            .setDescription('Geri yüklenecek yedek dosyası (timestamp).')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('config')
        .setDescription('Seçilen yedeğin config.json bölümünü geri yükler.')
        .addStringOption(opt =>
          opt
            .setName('dosya')
            .setDescription('Geri yüklenecek yedek dosyası (timestamp).')
            .setRequired(true)
            .setAutocomplete(true)
        )
    ),
  async autocomplete(interaction) {
    const focused = interaction.options.getFocused().toLowerCase();
    const choices = listBackups()
      .filter(b => String(b.timestamp).includes(focused) || b.dateLabel.toLowerCase().includes(focused))
      .slice(0, 25)
      .map(b => ({
        name: `${b.dateLabel} (${b.timestamp})`,
        value: String(b.timestamp)
      }));

    await interaction.respond(choices);
  },
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const timestamp = interaction.options.getString('dosya');
    const backup = getBackup(timestamp);

    if (!backup) {
      return interaction.reply({
        content: '❌ Belirtilen yedek bulunamadı. `/yedekgoster` ile mevcut yedekleri görüntüleyebilirsiniz.',
        flags: MessageFlags.Ephemeral
      });
    }

    if (subcommand === 'veritabani' && !backup.databaseFile) {
      return interaction.reply({
        content: '❌ Bu yedeğin veritabanı dosyası bulunmuyor.',
        flags: MessageFlags.Ephemeral
      });
    }

    if (subcommand === 'config' && !backup.configFile) {
      return interaction.reply({
        content: '❌ Bu yedeğin config dosyası bulunmuyor.',
        flags: MessageFlags.Ephemeral
      });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const autoBackupTs = createAutoBackup();

      if (subcommand === 'veritabani') {
        const result = restoreDatabase(timestamp);
        if (result.error) {
          return interaction.editReply({ content: `❌ ${result.error}` });
        }

        const lines = Object.entries(result.counts)
          .map(([table, count]) => `• **${table}:** ${count} satır`)
          .join('\n');

        return interaction.editReply({
          content: `✅ **Veritabanı yedeği geri yüklendi** (${backup.dateLabel})\n\n${lines}\n\n🛡️ Güvenlik amacıyla mevcut durum \`${autoBackupTs}\` olarak yedeklendi.`
        });
      }

      if (subcommand === 'config') {
        const result = restoreConfig(timestamp);
        if (result.error) {
          return interaction.editReply({ content: `❌ ${result.error}` });
        }

        updateBotStatus(interaction.client);

        return interaction.editReply({
          content: `✅ **Config yedeği geri yüklendi** (${backup.dateLabel})\n\n🔄 Ayarlar canlı olarak yenilendi ve bot durumu güncellendi.\n🛡️ Güvenlik amacıyla mevcut durum \`${autoBackupTs}\` olarak yedeklendi.`
        });
      }
    } catch (error) {
      console.error('[YedekYukle] Restore error:', error);
      await interaction.editReply({ content: '❌ Yedek geri yüklenirken bir hata oluştu.' });
    }
  }
};