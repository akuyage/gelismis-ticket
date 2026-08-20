import { SlashCommandBuilder , MessageFlags} from 'discord.js';
import db from '../../database/connect.js';
import { transferTicket } from '../../managers/ticketManager.js';

export default {
  data: new SlashCommandBuilder()
    .setName('devret')
    .setDescription("Açık ticket'ı başka bir yetkiliye devreder.")
    .addUserOption(option =>
      option
        .setName('yetkili')
        .setDescription("Ticket'ın devredileceği yetkiliyi seçin.")
        .setRequired(true)
    ),
  async execute(interaction) {
    const ticket = db.prepare("SELECT * FROM Tickets WHERE channelId = ? AND status != 'closed'").get(interaction.channel.id);
    if (!ticket) {
      return interaction.reply({
        content: '❌ Bu komut sadece açık ticket kanallarında kullanılabilir.',
        flags: MessageFlags.Ephemeral
      });
    }

    const target = interaction.options.getUser('yetkili');
    return transferTicket(interaction, ticket.ticketId, target.id);
  }
};