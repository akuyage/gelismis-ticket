import { MessageFlags } from 'discord.js';
import { createTicket } from '../../managers/ticketManager.js';
import { getCategory } from '../../managers/categoryManager.js';

export default {
  customId: 'modal_ticket_form',
  async execute(interaction) {
    const categoryId = interaction.customId.replace('modal_ticket_form_', '');
    const category = getCategory(categoryId);

    if (!category) {
      return interaction.reply({
        content: '❌ Bu form için kategori bulunamadı. Panel yeniden gönderilmiş olabilir.',
        flags: MessageFlags.Ephemeral
      });
    }

    const topic = interaction.fields.getTextInputValue('input_topic');
    const description = interaction.fields.getTextInputValue('input_description');

    await createTicket(interaction, category.categoryId, category.name, {
      'Konu Başlığı': topic,
      'Detaylı Açıklama': description
    });
  }
};