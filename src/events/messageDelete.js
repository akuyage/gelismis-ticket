import db from '../database/connect.js';

export default {
  name: 'messageDelete',
  once: false,
  async execute(message) {
    if (!message.guild || !message.channel || !message.author) return;
    if (message.author.bot) return;

    const ticket = db.prepare("SELECT * FROM Tickets WHERE channelId = ? AND status IN ('open', 'claimed')")
      .get(message.channel.id);
    if (!ticket) return;

    if (message.author.id !== ticket.userId) return;

    const content = (message.content || '').trim();
    if (!content) return;

    try {
      await message.channel.send(
        `> 🔒 <@${message.author.id}> mesajını silmeye çalıştı, kanıt amaçlı geri yüklendi:\n${content.slice(0, 1900)}`
      );
    } catch (e) { /* ignore */ }
  }
};