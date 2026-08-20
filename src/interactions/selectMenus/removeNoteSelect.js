import { deleteNote } from '../../managers/ticketManager.js';

export default {
  customId: 'select_remove_note_',
  async execute(interaction) {
    const ticketId = interaction.customId.replace('select_remove_note_', '');
    const noteId = interaction.values[0];
    return deleteNote(interaction, noteId, ticketId);
  }
};
