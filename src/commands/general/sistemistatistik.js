import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import fs from 'fs';
import path from 'path';
import db from '../../database/connect.js';
import { isStaffMember } from '../../managers/ticketManager.js';
import { container, textDisplay, separator, footerDisplay } from '../../managers/ticketTemplate.js';

export default {
  data: new SlashCommandBuilder()
    .setName('sistemistatistik')
    .setDescription('Ticket sisteminin genel istatistiklerini görüntüler.'),
  async execute(interaction) {
    if (!isStaffMember(interaction.member)) {
      return interaction.reply({ content: '❌ Bu komutu sadece yetkili rolüne sahip kişiler kullanabilir.', flags: MessageFlags.Ephemeral });
    }

    const counts = db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM Tickets) AS totalTickets,
        (SELECT COUNT(*) FROM Tickets WHERE status IN ('open', 'claimed')) AS openTickets,
        (SELECT COUNT(*) FROM Tickets WHERE status = 'closed') AS closedTickets,
        (SELECT AVG(rating) FROM TicketRatings) AS avgRating,
        (SELECT COUNT(*) FROM Feedbacks) AS totalFeedbacks,
        (SELECT COUNT(*) FROM Feedbacks WHERE status = 'pending') AS pendingFeedbacks,
        (SELECT COUNT(*) FROM Feedbacks WHERE status = 'approved') AS approvedFeedbacks,
        (SELECT COUNT(*) FROM TicketRatings) AS totalRatings,
        (SELECT COUNT(*) FROM Transcripts) AS totalTranscripts,
        (SELECT COUNT(*) FROM TicketBlacklist) AS blacklistCount
    `).get();

    const totalTickets = counts.totalTickets;
    const openTickets = counts.openTickets;
    const closedTickets = counts.closedTickets;
    const avgRating = counts.avgRating ? counts.avgRating.toFixed(1) : 'N/A';
    const totalFeedbacks = counts.totalFeedbacks;
    const pendingFeedbacks = counts.pendingFeedbacks;
    const approvedFeedbacks = counts.approvedFeedbacks;
    const totalRatings = counts.totalRatings;
    const totalTranscripts = counts.totalTranscripts;
    const blacklistCount = counts.blacklistCount;

    const backupDir = path.resolve(process.cwd(), 'backups');
    let backupCount = 0;
    let lastBackupDate = 'Yok';
    if (fs.existsSync(backupDir)) {
      const backupFiles = fs.readdirSync(backupDir).filter(f => /^database-\d+\.json$/.test(f));
      backupCount = backupFiles.length;
      if (backupCount > 0) {
        const timestamps = backupFiles
          .map(f => parseInt(f.match(/^database-(\d+)\.json$/)[1], 10))
          .filter(n => !Number.isNaN(n));
        if (timestamps.length > 0) {
          lastBackupDate = new Date(Math.max(...timestamps)).toLocaleString('tr-TR');
        }
      }
    }

    const bodyContent = [
      '## 📊 Ticket Sistemi Genel İstatistikleri',
      `**Toplam Açılan Ticket:** ${totalTickets}`,
      `**Aktif Açık Ticket:** ${openTickets}`,
      `**Kapatılan Ticket:** ${closedTickets}`,
      `**Ortalama Memnuniyet Puanı:** ⭐ ${avgRating} / 5.0`,
      '',
      '### 💬 Geri Bildirim',
      `**Gelen Feedback:** ${totalFeedbacks} (Bekleyen: ${pendingFeedbacks} • Onaylanan: ${approvedFeedbacks})`,
      '',
      '### 📦 Yedekler',
      `**Alınan Yedek Sayısı:** ${backupCount}`,
      `**Son Yedek Tarihi:** ${lastBackupDate}`,
      '',
      '### 📊 Detaylar',
      `**Toplam Değerlendirme:** ${totalRatings}`,
      `**Kayıtlı Transkript:** ${totalTranscripts}`,
      `**Kara Listeli Kullanıcı:** ${blacklistCount}`
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
