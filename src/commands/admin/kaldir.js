import { SlashCommandBuilder, PermissionFlagsBits, ChannelType , MessageFlags} from 'discord.js';
import db from '../../database/connect.js';
import { config, saveConfig } from '../../utils/configLoader.js';

export default {
  data: new SlashCommandBuilder()
    .setName('kaldir')
    .setDescription('Ticket sisteminin kurulumunu ve ilgili kanalları kaldırır.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const openTicketsCount = db.prepare("SELECT COUNT(*) as count FROM Tickets WHERE status IN ('open', 'claimed')").get().count;

    if (openTicketsCount > 0) {
      return interaction.editReply({
        content: `⚠️ Şu anda aktif **${openTicketsCount}** adet açık ticket bulunmaktadır. Lütfen önce açık ticket'ları kapatınız.`
      });
    }

    const guild = interaction.guild;

    // Delete all channels under the configured ticket category (or fallback to "Ticketlar")
    const ticketCategory = guild.channels.cache.find(c =>
      (config.ticketCategoryId && c.id === config.ticketCategoryId) ||
      (!config.ticketCategoryId && c.name === 'Ticketlar')
    );
    if (ticketCategory) {
      const children = guild.channels.cache.filter(c => c.parentId === ticketCategory.id);
      for (const child of children.values()) {
        await child.delete().catch(() => {});
      }
      await ticketCategory.delete().catch(() => {});
    }

    // Delete log channel and its category
    if (config.logChannelId) {
      const logChannel = guild.channels.cache.get(config.logChannelId);
      if (logChannel) {
        const parentCategory = logChannel.parent;
        await logChannel.delete().catch(() => {});
        if (parentCategory && parentCategory.name === 'Ticket Logs') {
          const children = guild.channels.cache.filter(c => c.parentId === parentCategory.id);
          for (const child of children.values()) {
            await child.delete().catch(() => {});
          }
          await parentCategory.delete().catch(() => {});
        }
      }
    }

    // Clear config
    saveConfig({
      logChannelId: '',
      panelChannelId: '',
      staffRoleId: '',
      ticketCategoryId: '',
      noteLogChannelId: '',
      transcriptChannelId: '',
      feedbackSystemChannelId: '',
      feedbackChannelId: '',
      scoreLogChannelId: '',
      blacklistLogChannelId: ''
    });

    await interaction.editReply({
      content: '🧹 **Ticket botu kurulumu başarıyla kaldırıldı ve ayarlar temizlendi.**'
    });
  }
};