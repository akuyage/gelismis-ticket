import { MessageFlags } from 'discord.js';
import { getPanel, executeAction } from '../../managers/embedManager.js';

export default {
  customId: 'select_embedpanel_',
  async execute(interaction) {
    const embedId = interaction.customId.replace('select_embedpanel_', '');
    const panel = getPanel(embedId);

    if (!panel) {
      return interaction.reply({ content: '❌ Bu panel bulunamadı.', flags: MessageFlags.Ephemeral });
    }

    const option = panel.options.find(o => o.value === interaction.values[0]);
    if (!option) {
      return interaction.reply({ content: '❌ Seçenek bulunamadı.', flags: MessageFlags.Ephemeral });
    }

    return executeAction(interaction, panel, option);
  }
};