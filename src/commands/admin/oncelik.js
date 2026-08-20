import { SlashCommandBuilder , MessageFlags} from 'discord.js';
import db from '../../database/connect.js';
import { changePriority } from '../../managers/ticketManager.js';

export default {
  data: new SlashCommandBuilder()
    .setName('oncelik')
    .setDescription('Açık ticket kanalının öncelik derecesini değiştirir.')
    .addStringOption(option =>
      option
        .setName('derece')
        .setDescription('Yeni öncelik derecesini seçiniz.')
        .setRequired(true)
        .addChoices(
          { name: '🟢 Düşük', value: 'düşük' },
          { name: '🔵 Normal', value: 'normal' },
          { name: '🟡 Yüksek', value: 'yüksek' },
          { name: '🔴 Acil', value: 'acil' }
        )
    ),
  async execute(interaction) {
    const ticket = db.prepare("SELECT * FROM Tickets WHERE channelId = ? AND status != 'closed'").get(interaction.channel.id);
    if (!ticket) {
      return interaction.reply({
        content: '❌ Bu komut sadece açık ticket kanallarında kullanılabilir.',
        flags: MessageFlags.Ephemeral
      });
    }

    const derece = interaction.options.getString('derece');
    return changePriority(interaction, ticket.ticketId, derece);
  }
};
