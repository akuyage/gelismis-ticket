import {
  claimTicket,
  unclaimTicket,
  closeTicket,
  showRemoveNoteMenu,
  viewNotes,
  recordRating,
  sendTranscriptFile,
  approveFeedback,
  rejectFeedback,
  callTicketUser
} from '../../managers/ticketManager.js';
import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';

export default {
  customId: 'btn_',
  async execute(interaction) {
    const customId = interaction.customId;

    // 1. Claim Button
    if (customId.startsWith('btn_claim_')) {
      const ticketId = customId.replace('btn_claim_', '');
      return claimTicket(interaction, ticketId);
    }

    // 2. Unclaim Button
    if (customId.startsWith('btn_unclaim_')) {
      const ticketId = customId.replace('btn_unclaim_', '');
      return unclaimTicket(interaction, ticketId);
    }

    // 3. Close Button -> Open Reason Modal
    if (customId.startsWith('btn_close_')) {
      const ticketId = customId.replace('btn_close_', '');
      const modal = new ModalBuilder()
        .setCustomId(`modal_close_reason_${ticketId}`)
        .setTitle('Ticket Kapatma Sebebi');

      const reasonInput = new TextInputBuilder()
        .setCustomId('input_close_reason')
        .setLabel('Kapatma Nedeni')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Örn: Sorun çözüldü, yanıt alınamadı')
        .setRequired(false);

      modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
      return interaction.showModal(modal);
    }

    // 4. Add Note Button -> Open Note Modal
    if (customId.startsWith('btn_note_add_')) {
      const ticketId = customId.replace('btn_note_add_', '');
      const modal = new ModalBuilder()
        .setCustomId(`modal_add_note_${ticketId}`)
        .setTitle('Dahili Not Ekle');

      const noteInput = new TextInputBuilder()
        .setCustomId('input_note_text')
        .setLabel('Not İçeriği (Sadece Yetkililere Görünür)')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Notunuzu yazınız...')
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(noteInput));
      return interaction.showModal(modal);
    }

    // 5. Remove Note Button -> Show Ephemeral Select Menu
    if (customId.startsWith('btn_note_remove_')) {
      const ticketId = customId.replace('btn_note_remove_', '');
      return showRemoveNoteMenu(interaction, ticketId);
    }

    // 6. View Notes Button -> Ephemeral Notes List
    if (customId.startsWith('btn_note_view_')) {
      const ticketId = customId.replace('btn_note_view_', '');
      return viewNotes(interaction, ticketId);
    }

    // 7. Rating Buttons
    if (customId.startsWith('btn_rate_')) {
      // Format: btn_rate_RATING_TICKETID
      const parts = customId.split('_');
      const rating = parseInt(parts[2], 10);
      const ticketId = parts[3];
      return recordRating(interaction, ticketId, rating);
    }

    // 8. Transcript Download Button
    if (customId.startsWith('btn_transcript_download_')) {
      const ticketId = customId.replace('btn_transcript_download_', '');
      return sendTranscriptFile(interaction, ticketId);
    }

    // 8b. Call Ticket User Button
    if (customId.startsWith('btn_call_user_')) {
      const ticketId = customId.replace('btn_call_user_', '');
      return callTicketUser(interaction, ticketId);
    }

    // 9. Feedback Button -> Open Feedback Modal (DM)
    if (customId.startsWith('btn_feedback_')) {
      if (customId.startsWith('btn_feedback_approve_')) {
        const feedbackId = customId.replace('btn_feedback_approve_', '');
        return approveFeedback(interaction, feedbackId);
      }
      if (customId.startsWith('btn_feedback_reject_')) {
        const feedbackId = customId.replace('btn_feedback_reject_', '');
        return rejectFeedback(interaction, feedbackId);
      }

      const ticketId = customId.replace('btn_feedback_', '');
      const modal = new ModalBuilder()
        .setCustomId(`modal_feedback_${ticketId}`)
        .setTitle('💬 Geri Bildirim Bırak');

      const feedbackInput = new TextInputBuilder()
        .setCustomId('input_feedback')
        .setLabel('Geri Bildiriminiz')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Deneyiminizle ilgili geri bildiriminizi yazınız...')
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(feedbackInput));
      return interaction.showModal(modal);
    }
  }
};