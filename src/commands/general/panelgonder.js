import { SlashCommandBuilder, PermissionFlagsBits, ChannelType , MessageFlags} from 'discord.js';
import { createPanelMessage } from '../../managers/ticketTemplate.js';
import { listCategories } from '../../managers/categoryManager.js';

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
    )
    .addStringOption(option =>
      option
        .setName('gorsel')
        .setDescription('Panela eklenecek görselin linki (https:// ile başlamalı).')
        .setRequired(false)
    ),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const target = interaction.options.getChannel('kanal') || interaction.channel;
    if (!target || target.type !== ChannelType.GuildText) {
      return interaction.editReply({ content: '❌ Geçerli bir metin kanalı seçiniz.' });
    }

    let imageUrl = interaction.options.getString('gorsel') || '';
    if (imageUrl) {
      imageUrl = imageUrl.trim();
      if (!/^https?:\/\/.+/.test(imageUrl)) {
        return interaction.editReply({ content: '❌ Geçersiz görsel linki. Lütfen `https://` ile başlayan bir URL girin.' });
      }
      if (imageUrl.length > 1024) {
        return interaction.editReply({ content: '❌ Görsel linki çok uzun (en fazla 1024 karakter).' });
      }
    }

    await target.send(createPanelMessage(imageUrl, listCategories()));
    await interaction.editReply({ content: `✅ Ticket paneli <#${target.id}> kanalına gönderildi${imageUrl ? ' (görsel eklendi).' : '.'}` });
  }
};