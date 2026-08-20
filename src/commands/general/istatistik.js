import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import db from '../../database/connect.js';
import { isStaffMember } from '../../managers/ticketManager.js';
import { container, textDisplay, separator, footerDisplay } from '../../managers/ticketTemplate.js';

export default {
  data: new SlashCommandBuilder()
    .setName('istatistik')
    .setDescription('Yetkili personel performans istatistiklerini görüntüler.')
    .addUserOption(option =>
      option
        .setName('yetkili')
        .setDescription('İstatistiklerini görmek istediğiniz yetkiliyi seçin.')
        .setRequired(false)
    ),
  async execute(interaction) {
    if (!isStaffMember(interaction.member)) {
      return interaction.reply({ content: '❌ Bu komutu sadece yetkili rolüne sahip kişiler kullanabilir.', flags: MessageFlags.Ephemeral });
    }

    const targetUser = interaction.options.getUser('yetkili') || interaction.user;

    const stats = db.prepare(`
      SELECT
        COUNT(*) AS claimedCount,
        SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) AS resolvedCount
      FROM Tickets
      WHERE claimedBy = ?
    `).get(targetUser.id);

    const claimedCount = stats.claimedCount;
    const resolvedCount = stats.resolvedCount || 0;

    const avgRatingObj = db.prepare(`
      SELECT AVG(r.rating) as avgRating
      FROM TicketRatings r
      JOIN Tickets t ON r.ticketId = t.ticketId
      WHERE COALESCE(t.claimedBy, t.closedBy) = ?
    `).get(targetUser.id);

    const avgRating = avgRatingObj && avgRatingObj.avgRating ? avgRatingObj.avgRating.toFixed(1) : 'N/A';

    const bodyContent = [
      `## 👤 Yetkili Performans İstatistikleri`,
      `**Personel:** <@${targetUser.id}>`,
      `**Üstlenilen Ticket:** ${claimedCount}`,
      `**Çözülen Ticket:** ${resolvedCount}`,
      `**Kişisel Memnuniyet Puanı:** ⭐ ${avgRating} / 5.0`
    ].join('\n');

    const payload = {
      flags: MessageFlags.IsComponentsV2,
      components: [
        container([
          textDisplay(bodyContent),
          separator(true, 1),
          footerDisplay()
        ])
      ],
      flags: MessageFlags.Ephemeral
    };

    await interaction.reply(payload);
  }
};
