import { SlashCommandBuilder, PermissionFlagsBits , MessageFlags} from 'discord.js';
import { getPanel, deletePanel, panelChoices, renderDeleted } from '../../managers/embedManager.js';

export default {
  data: new SlashCommandBuilder()
    .setName('embedsil')
    .setDescription('Oluşturulmuş bir embed/paneli siler.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt =>
      opt
        .setName('panel')
        .setDescription('Silinecek embed/panel.')
        .setRequired(true)
        .setAutocomplete(true)
    ),
  async autocomplete(interaction) {
    const focused = interaction.options.getFocused().toLowerCase();
    await interaction.respond(panelChoices(focused));
  },
  async execute(interaction) {
    const embedId = interaction.options.getString('panel');

    const panel = getPanel(embedId);
    if (!panel) {
      return interaction.reply({
        content: '❌ Belirtilen embed/panel bulunamadı. `/embedlist` ile mevcut panelleri görüntüleyebilirsiniz.',
        flags: MessageFlags.Ephemeral
      });
    }

    deletePanel(embedId);

    return interaction.reply({
      ...renderDeleted(panel),
      flags: MessageFlags.Ephemeral
    });
  }
};