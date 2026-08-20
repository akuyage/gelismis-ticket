import { createTicket } from '../../managers/ticketManager.js';

export default {
  customId: 'modal_ticket_form',
  async execute(interaction) {
    const customId = interaction.customId;

    let categoryId = 'cat_general';
    let categoryName = 'Genel Destek';

    if (customId.endsWith('payment')) {
      categoryId = 'cat_payment';
      categoryName = 'Ödeme & Fatura';
    } else if (customId.endsWith('technical')) {
      categoryId = 'cat_technical';
      categoryName = 'Teknik Destek';
    }

    const topic = interaction.fields.getTextInputValue('input_topic');
    const description = interaction.fields.getTextInputValue('input_description');

    await createTicket(interaction, categoryId, categoryName, {
      'Konu Başlığı': topic,
      'Detaylı Açıklama': description
    });
  }
};
