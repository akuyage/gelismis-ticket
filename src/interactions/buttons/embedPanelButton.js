import { MessageFlags } from 'discord.js';
import { getPanel, executeAction } from '../../managers/embedManager.js';

export default {
  customId: 'btn_embedoption_',
  async execute(interaction) {
    const customId = interaction.customId;
    if (!customId.startsWith('btn_embedoption_')) return;

    const rest = customId.replace('btn_embedoption_', '');
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

    return executeAction(interaction, panel, option);
  }
};