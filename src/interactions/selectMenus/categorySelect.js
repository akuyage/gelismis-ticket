import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags } from 'discord.js';
import { getCategory } from '../../managers/categoryManager.js';

export default {
  customId: 'select_ticket_category',
  async execute(interaction) {
    const selected = interaction.values[0];

    if (selected === 'cat_reset') {
      return interaction.deferUpdate();
    }

    const category = getCategory(selected);
    if (!category) {
      return interaction.reply({
        content: '❌ Seçtiğiniz kategori bulunamadı. Panel yeniden gönderilmiş olabilir, yöneticilerden `/panelozellestir` ile kontrol etmelerini isteyin.',
        flags: MessageFlags.Ephemeral
      });
    }

    const modal = new ModalBuilder()
      .setCustomId(`modal_ticket_form_${category.categoryId}`)
      .setTitle(category.modalTitle || 'Destek Talebi Formu');

    const topicInput = new TextInputBuilder()
      .setCustomId('input_topic')
      .setLabel('Konu Başlığı')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Örn: Ödeme hatası, kurulum yardımı')
      .setRequired(true);

    const descriptionInput = new TextInputBuilder()
      .setCustomId('input_description')
      .setLabel(category.modalLabel || 'Sorununuzu Kısaca Açıklayınız')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Lütfen detayları buraya yazınız...')
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(topicInput),
      new ActionRowBuilder().addComponents(descriptionInput)
    );

    await interaction.showModal(modal);
  }
};