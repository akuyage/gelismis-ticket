import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags } from 'discord.js';
import {
  getCategory,
  addCategory,
  updateCategory,
  renderCategorySaved
} from '../../managers/categoryManager.js';

export function buildCategoryModal(category) {
  const isEdit = !!category;
  const modal = new ModalBuilder()
    .setCustomId(isEdit ? `modal_cat_edit_${category.categoryId}` : 'modal_cat_add')
    .setTitle(isEdit ? 'Kategori Düzenle' : 'Yeni Kategori');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('input_cat_name')
        .setLabel('Kategori Adı')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Örn: Genel Destek')
        .setRequired(true)
        .setValue(category?.name || '')
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('input_cat_desc')
        .setLabel('Açıklama')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Menüde görünen açıklama (opsiyonel)')
        .setRequired(false)
        .setValue(category?.description || '')
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('input_cat_emoji')
        .setLabel('Emoji')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Örn: ❓ (opsiyonel)')
        .setRequired(false)
        .setValue(category?.emoji || '')
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('input_cat_modal_title')
        .setLabel('Form Başlığı')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Ticket formunun başlığı (opsiyonel)')
        .setRequired(false)
        .setValue(category?.modalTitle || '')
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('input_cat_modal_label')
        .setLabel('Form Etiketi')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Formdaki açıklama sorusunun etiketi (opsiyonel)')
        .setRequired(false)
        .setValue(category?.modalLabel || '')
    )
  );
  return modal;
}

export default {
  customId: 'modal_cat_',
  async execute(interaction) {
    const customId = interaction.customId;
    const isEdit = customId.startsWith('modal_cat_edit_');
    const categoryId = isEdit ? customId.replace('modal_cat_edit_', '') : null;

    if (isEdit && !getCategory(categoryId)) {
      return interaction.reply({
        content: '❌ Bu kategori artık mevcut değil. `/panelozellestir liste` ile kontrol edin.',
        flags: MessageFlags.Ephemeral
      });
    }

    const data = {
      name: interaction.fields.getTextInputValue('input_cat_name').trim(),
      description: interaction.fields.getTextInputValue('input_cat_desc').trim(),
      emoji: interaction.fields.getTextInputValue('input_cat_emoji').trim(),
      modalTitle: interaction.fields.getTextInputValue('input_cat_modal_title').trim(),
      modalLabel: interaction.fields.getTextInputValue('input_cat_modal_label').trim()
    };

    if (!data.name) {
      return interaction.reply({ content: '❌ Kategori adı boş olamaz.', flags: MessageFlags.Ephemeral });
    }

    const cat = isEdit ? updateCategory(categoryId, data) : addCategory(data);
    if (!cat) {
      return interaction.reply({ content: '❌ Kategori kaydedilemedi.', flags: MessageFlags.Ephemeral });
    }

    return interaction.reply(renderCategorySaved(cat, !isEdit));
  }
};