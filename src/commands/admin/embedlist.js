import { SlashCommandBuilder, PermissionFlagsBits , MessageFlags} from 'discord.js';
import { listPanels, renderPanelList } from '../../managers/embedManager.js';

export default {
  data: new SlashCommandBuilder()
    .setName('embedlist')
    .setDescription('Oluşturulmuş tüm embed/panelleri listeler.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    const panels = listPanels();
    if (panels.length === 0) {
      return interaction.reply({
        content: '📭 Henüz oluşturulmuş embed/panel yok. `/embedolustur` ile oluşturabilirsiniz.',
        flags: MessageFlags.Ephemeral
      });
    }

    return interaction.reply({
      ...renderPanelList(panels),
      flags: MessageFlags.Ephemeral
    });
  }
};