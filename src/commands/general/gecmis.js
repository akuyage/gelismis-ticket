import { SlashCommandBuilder , MessageFlags} from 'discord.js';
import db from '../../database/connect.js';
import { getCategoryName, isStaffMember } from '../../managers/ticketManager.js';

export default {
  data: new SlashCommandBuilder()
    .setName('gecmis')
    .setDescription('Kullanıcının ticket geçmişini görüntüler.')
    .addUserOption(option =>
      option
        .setName('kullanici')
        .setDescription('Geçmişi görüntülenecek kullanıcı (boş bırakılırsa kendiniz).')
        .setRequired(false)
    ),
  async execute(interaction) {
    const target = interaction.options.getUser('kullanici');
    const targetId = target ? target.id : interaction.user.id;

    if (target && target.id !== interaction.user.id && !isStaffMember(interaction.member)) {
      return interaction.reply({ content: '❌ Başka bir kullanıcının geçmişini yalnızca yetkililer görüntüleyebilir.', flags: MessageFlags.Ephemeral });
    }

    const tickets = db.prepare('SELECT * FROM Tickets WHERE userId = ? ORDER BY createdAt DESC LIMIT 25').all(targetId);
    if (tickets.length === 0) {
      return interaction.reply({ content: '📭 Bu kullanıcıya ait kayıtlı ticket bulunmuyor.', flags: MessageFlags.Ephemeral });
    }

    const lines = tickets.map(t => {
      const created = `<t:${Math.floor(t.createdAt / 1000)}:d>`;
      const statusEmoji = t.status === 'closed' ? '🔒' : (t.status === 'claimed' ? '📌' : '🟢');
      const category = getCategoryName(t.categoryId);
      return `${statusEmoji} **#${t.ticketId}** — ${created} — \`${t.status.toUpperCase()}\` — ${category}`;
    }).join('\n');

    return interaction.reply({
      content: `### 🎫 <@${targetId}> Kullanıcısının Ticket Geçmişi (son 25)\n\n${lines}`,
      flags: MessageFlags.Ephemeral
    });
  }
};