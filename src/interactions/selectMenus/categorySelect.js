import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';

export default {
  customId: 'select_ticket_category',
  async execute(interaction) {
    const selected = interaction.values[0];

    if (selected === 'cat_reset') {
      return interaction.deferUpdate();
    }

    let modalTitle = 'Destek Talebi Formu';
    let customModalId = 'modal_ticket_form_general';
    let label = 'Sorununuzu Kısaca Açıklayınız';

    if (selected === 'cat_payment') {
      modalTitle = 'Ödeme & Fatura Destek Formu';
      customModalId = 'modal_ticket_form_payment';
      label = 'Sipariş/İşlem Numarası ve Sorununuz';
    } else if (selected === 'cat_technical') {
      modalTitle = 'Teknik Destek Formu';
      customModalId = 'modal_ticket_form_technical';
      label = 'Karşılaştığınız Hata / Teknik Detaylar';
    }

    const modal = new ModalBuilder()
      .setCustomId(customModalId)
      .setTitle(modalTitle);

    const topicInput = new TextInputBuilder()
      .setCustomId('input_topic')
      .setLabel('Konu Başlığı')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Örn: Ödeme hatası, kurulum yardımı')
      .setRequired(true);

    const descriptionInput = new TextInputBuilder()
      .setCustomId('input_description')
      .setLabel(label)
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
