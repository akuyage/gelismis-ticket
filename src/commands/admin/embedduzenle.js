import { SlashCommandBuilder, PermissionFlagsBits , MessageFlags} from 'discord.js';
import { startEditor, panelChoices } from '../../managers/embedManager.js';

export default {
  data: new SlashCommandBuilder()
    .setName('embedduzenle')
    .setDescription('Oluşturulmuş bir embed/paneli düzenler.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt =>
      opt
        .setName('panel')
        .setDescription('Düzenlenecek embed/panel.')
        .setRequired(true)
        .setAutocomplete(true)
    ),
  async autocomplete(interaction) {
    const focused = interaction.options.getFocused().toLowerCase();
    await interaction.respond(panelChoices(focused));
  },
  async execute(interaction) {
    const embedId = interaction.options.getString('panel');
    const payload = await startEditor(interaction, embedId);
    if (!payload) {
      return interaction.reply({
        content: '❌ Belirtilen embed/panel bulunamadı. `/embedlist` ile mevcut panelleri görüntüleyebilirsiniz.',
        flags: MessageFlags.Ephemeral
      });
    }
    return interaction.reply(payload);
  }
};