import { SlashCommandBuilder, PermissionFlagsBits, ChannelType , MessageFlags} from 'discord.js';
import { createPanelMessage } from '../../managers/ticketTemplate.js';

export default {
  data: new SlashCommandBuilder()
    .setName('panelgonder')
    .setDescription('Ticket panelini belirtilen kanala gönderir.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(option =>
      option
        .setName('kanal')
        .setDescription('Panelin gönderileceği kanal (boş bırakılırsa bu kanala gönderilir).')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    ),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const target = interaction.options.getChannel('kanal') || interaction.channel;
    if (!target || target.type !== ChannelType.GuildText) {
      return interaction.editReply({ content: '❌ Geçerli bir metin kanalı seçiniz.' });
    }

    await target.send(createPanelMessage());
    await interaction.editReply({ content: `✅ Ticket paneli <#${target.id}> kanalına gönderildi.` });
  }
};