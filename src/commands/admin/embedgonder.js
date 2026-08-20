import { SlashCommandBuilder, PermissionFlagsBits, ChannelType , MessageFlags} from 'discord.js';
import { getPanel, panelChoices, createPanelMessage } from '../../managers/embedManager.js';

export default {
  data: new SlashCommandBuilder()
    .setName('embedgonder')
    .setDescription('Oluşturulmuş bir embed/paneli kanala gönderir.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt =>
      opt
        .setName('panel')
        .setDescription('Gönderilecek embed/panel.')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addChannelOption(opt =>
      opt
        .setName('kanal')
        .setDescription('Panelin gönderileceği kanal.')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    ),
  async autocomplete(interaction) {
    const focused = interaction.options.getFocused().toLowerCase();
    await interaction.respond(panelChoices(focused));
  },
  async execute(interaction) {
    const embedId = interaction.options.getString('panel');
    const channel = interaction.options.getChannel('kanal');

    const panel = getPanel(embedId);
    if (!panel) {
      return interaction.reply({
        content: '❌ Belirtilen embed/panel bulunamadı. `/embedlist` ile mevcut panelleri görüntüleyebilirsiniz.',
        flags: MessageFlags.Ephemeral
      });
    }

    if (panel.options.length === 0) {
      return interaction.reply({
        content: '❌ Bu panelin seçeneği yok, gönderilemez.',
        flags: MessageFlags.Ephemeral
      });
    }

    try {
      await channel.send(createPanelMessage(panel));
      return interaction.reply({
        content: `✅ **${panel.name || panel.title}** paneli <#${channel.id}> kanalına gönderildi.`,
        flags: MessageFlags.Ephemeral
      });
    } catch (error) {
      console.error('[EmbedGonder] Send error:', error);
      return interaction.reply({
        content: '❌ Panel gönderilirken bir hata oluştu (bot izinlerini kontrol edin).',
        flags: MessageFlags.Ephemeral
      });
    }
  }
};