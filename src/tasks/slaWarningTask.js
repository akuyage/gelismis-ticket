import db from '../database/connect.js';
import { config } from '../utils/configLoader.js';

export function startSlaWarningTask(client) {
  setInterval(async () => {
    try {
      const slaTimeoutMs = (config.slaWarningTimeout || 14400) * 1000;
      const cutoffTime = Date.now() - slaTimeoutMs;

      // Only warn tickets that were never warned, or were warned more than one interval ago
      const overdueTickets = db.prepare(`
        SELECT * FROM Tickets
        WHERE status = 'open'
          AND claimedBy IS NULL
          AND createdAt < ?
          AND (slaWarnedAt IS NULL OR slaWarnedAt < ?)
      `).all(cutoffTime, Date.now() - slaTimeoutMs);

      const channels = await Promise.all(overdueTickets.map(t =>
        client.channels.cache.get(t.channelId) ||
        client.channels.fetch(t.channelId).catch(() => null)
      ));

      for (let i = 0; i < overdueTickets.length; i++) {
        const ticket = overdueTickets[i];
        const channel = channels[i];

        if (!channel) {
          // If channel no longer exists, update database to prevent repetitive queries
          db.prepare("UPDATE Tickets SET status = 'closed', closedAt = ?, closeReason = ? WHERE ticketId = ?")
            .run(Date.now(), 'system', 'Kanal Discord üzerinde bulunamadı (Silinmiş)', ticket.ticketId);
          continue;
        }

        const staffMention = config.staffRoleId ? `<@&${config.staffRoleId}>` : 'Yetkili Ekibi';
        const hours = Math.max(1, Math.round(slaTimeoutMs / 3600000));
        await channel.send(`⚠️ **SLA Uyarısı:** Bu ticket ${hours} saattir yanıt bekliyor! ${staffMention}`)
          .catch(() => {});
        db.prepare('UPDATE Tickets SET slaWarnedAt = ? WHERE ticketId = ?').run(Date.now(), ticket.ticketId);
      }
    } catch (error) {
      console.error('[SLAWarningTask] Error:', error);
    }
  }, 600000); // Check every 10 minutes
}