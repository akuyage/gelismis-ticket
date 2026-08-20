import { closeTicket, addNote, submitFeedback } from '../../managers/ticketManager.js';

export default {
  customId: 'modal_',
  async execute(interaction) {
    const customId = interaction.customId;

    if (customId.startsWith('modal_close_reason_')) {
      const ticketId = customId.replace('modal_close_reason_', '');
      const reason = interaction.fields.getTextInputValue('input_close_reason') || 'Sebep belirtilmedi';
      return closeTicket(interaction, ticketId, reason);
    }

    if (customId.startsWith('modal_add_note_')) {
      const ticketId = customId.replace('modal_add_note_', '');
      const noteText = interaction.fields.getTextInputValue('input_note_text');
      return addNote(interaction, ticketId, noteText);
    }

    if (customId.startsWith('modal_feedback_')) {
      const ticketId = customId.replace('modal_feedback_', '');
      return submitFeedback(interaction, ticketId);
    }
  }
};
