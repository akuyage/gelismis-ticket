import { MessageFlags } from 'discord.js';
import { getPanel } from '../../managers/embedManager.js';
import { createTicket } from '../../managers/ticketManager.js';

export default {
  customId: 'btn_embedticket_',
  async execute(interaction) {
    const customId = interaction.customId;
    if (!customId.startsWith('btn_embedticket_')) return;

    const rest = customId.replace('btn_embedticket_', '');
    const parts = rest.split('_');
    const embedId = parts[0];
    const optionValue = parts.slice(1).join('_');

    const panel = getPanel(embedId);
    if (!panel) {
      return interaction.reply({ content: '❌ Bu panel bulunamadı.', flags: MessageFlags.Ephemeral });
    }

    const option = panel.options.find(o => o.value === optionValue);
    if (!option) {
      return interaction.reply({ content: '❌ Seçenek bulunamadı.', flags: MessageFlags.Ephemeral });
    }

    const categoryName = option.label || 'Ticket';
    return createTicket(interaction, categoryName, categoryName, {
      'Seçilen Seçenek': categoryName
    });
  }
};