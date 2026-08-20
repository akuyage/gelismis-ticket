import { SlashCommandBuilder, PermissionFlagsBits , MessageFlags} from 'discord.js';
import db from '../../database/connect.js';
import { config } from '../../utils/configLoader.js';

export default {
  data: new SlashCommandBuilder()
    .setName('db-sil')
    .setDescription('Veritabanındaki tüm verileri temizler (Sadece Geliştiriciler).')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    if (!Array.isArray(config.developers) || !config.developers.includes(interaction.user.id)) {
      return interaction.reply({
        content: '❌ Bu komutu sadece bot geliştiricileri kullanabilir.',
        flags: MessageFlags.Ephemeral
      });
    }

    try {
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();

      const deleteTransaction = db.transaction(() => {
        for (const table of tables) {
          db.prepare(`DELETE FROM ${table.name}`).run();
        }
        db.prepare('DELETE FROM sqlite_sequence').run();
      });

      deleteTransaction();

      db.pragma('vacuum');

      return interaction.reply({
        content: `✅ Veritabanındaki tüm tablolar (${tables.length}) başarıyla temizlendi.`,
        flags: MessageFlags.Ephemeral
      });
    } catch (error) {
      console.error('[DB-SIL HATA]', error);
      return interaction.reply({
        content: '❌ Veritabanı temizlenirken bir hata oluştu.',
        flags: MessageFlags.Ephemeral
      });
    }
  }
};