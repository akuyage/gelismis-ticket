import { SlashCommandBuilder, PermissionFlagsBits , MessageFlags} from 'discord.js';
import { listBackups, deleteBackup, getBackup } from '../../utils/backupManager.js';

export default {
  data: new SlashCommandBuilder()
    .setName('yedeksil')
    .setDescription('Alınmış bir yedeği siler.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt =>
      opt
        .setName('dosya')
        .setDescription('Silinecek yedek dosyası (timestamp).')
        .setRequired(true)
        .setAutocomplete(true)
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
    const timestamp = interaction.options.getString('dosya');
    const backup = getBackup(timestamp);

    if (!backup) {
      return interaction.reply({
        content: '❌ Belirtilen yedek bulunamadı. `/yedekgoster` ile mevcut yedekleri görüntüleyebilirsiniz.',
        flags: MessageFlags.Ephemeral
      });
    }

    const deleted = deleteBackup(timestamp);

    return interaction.reply({
      content: `🗑️ **Yedek silindi** (${backup.dateLabel})\n\nSilinen dosyalar:\n${deleted.map(f => `• \`${f}\``).join('\n')}`,
      flags: MessageFlags.Ephemeral
    });
  }
};