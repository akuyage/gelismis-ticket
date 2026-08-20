import { SlashCommandBuilder, PermissionFlagsBits, AttachmentBuilder , MessageFlags} from 'discord.js';
import fs from 'fs';
import path from 'path';
import { BACKUP_DIR, createAutoBackup } from '../../utils/backupManager.js';

export default {
  data: new SlashCommandBuilder()
    .setName('yedek')
    .setDescription('Ticket veritabanını ve yapılandırmayı yedekler.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const timestamp = createAutoBackup();

      const dbAttachment = new AttachmentBuilder(
        fs.readFileSync(path.join(BACKUP_DIR, `database-${timestamp}.json`)),
        { name: `ticket-database-${timestamp}.json` }
      );
      const configAttachment = new AttachmentBuilder(
        fs.readFileSync(path.join(BACKUP_DIR, `config-${timestamp}.json`)),
        { name: `config-${timestamp}.json` }
      );

      await interaction.editReply({
        content: '📦 **Yedek başarıyla alındı!** Veritabanı ve yapılandırma dosyaları aşağıdadır. Ayrıca `backups/` klasörüne de kaydedildi. Bu dosyaları güvenli bir yerde saklayın.',
        files: [dbAttachment, configAttachment]
      });
    } catch (error) {
      console.error('[Yedek] Backup error:', error);
      await interaction.editReply({ content: '❌ Yedekleme sırasında bir hata oluştu.' });
    }
  }
};