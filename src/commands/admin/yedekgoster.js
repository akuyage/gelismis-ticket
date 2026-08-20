import { SlashCommandBuilder, PermissionFlagsBits , MessageFlags} from 'discord.js';
import { listBackups } from '../../utils/backupManager.js';

export default {
  data: new SlashCommandBuilder()
    .setName('yedekgoster')
    .setDescription('Backups klasöründeki yedekleri listeler.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    const backups = listBackups();

    if (backups.length === 0) {
      return interaction.reply({
        content: '📭 Henüz alınmış bir yedek bulunmuyor. `/yedek` komutuyla yedek alabilirsiniz.',
        flags: MessageFlags.Ephemeral
      });
    }

    const lines = backups.map((b, i) => {
      const dbMark = b.databaseFile ? '✅' : '❌';
      const cfgMark = b.configFile ? '✅' : '❌';
      const name = `<t:${Math.floor(b.timestamp / 1000)}:f>`;
      return `${i + 1}. **${name}**\n   🗂️ \`${b.timestamp}\` • 💾 ${b.sizeLabel}\n   • Veritabanı: ${dbMark} • Config: ${cfgMark}`;
    });

    const content = `### 📦 Alınan Yedekler (${backups.length})\n\n${lines.join('\n\n')}\n\n📌 **Geri yüklemek için:** \`/yedekyukle\` • **Silmek için:** \`/yedeksil\``;

    return interaction.reply({
      content: content.length > 2000 ? content.slice(0, 1997) + '...' : content,
      flags: MessageFlags.Ephemeral
    });
  }
};