import { MessageFlags } from 'discord.js';
import {
  getBuilder,
  cancelBuilder,
  generateOptionId,
  savePanel,
  renderDraft,
  renderActionSelect,
  renderSaved
} from '../../managers/embedManager.js';

export default {
  customId: 'modal_embedbuild_',
  async execute(interaction) {
    const customId = interaction.customId;
    if (!customId.startsWith('modal_embedbuild_')) return;

    const parts = customId.split('_');
    const step = parts[2];
    const embedId = parts[3];

    const builder = getBuilder(interaction.user.id);
    if (!builder || builder.embedId !== embedId) {
      return interaction.reply({
        content: '❌ Oluşturma oturumu bulunamadı veya sona erdi. `/embedolustur` ile yeniden başlatın.',
        flags: MessageFlags.Ephemeral
      });
    }

    if (step === 'title') {
      builder.title = interaction.fields.getTextInputValue('input_title').trim();
      builder.description = interaction.fields.getTextInputValue('input_desc').trim();
      await interaction.deferUpdate();
      return interaction.editReply(renderDraft(builder));
    }

    if (step === 'image') {
      const url = interaction.fields.getTextInputValue('input_image').trim();
      if (url && !/^https?:\/\/.+/.test(url)) {
        return interaction.reply({
          content: '❌ Geçersiz URL. Lütfen `https://` ile başlayan bir görsel linki girin.',
          flags: MessageFlags.Ephemeral
        });
      }
      if (url.length > 1024) {
        return interaction.reply({
          content: '❌ Görsel URL çok uzun (en fazla 1024 karakter).',
          flags: MessageFlags.Ephemeral
        });
      }
      builder.image = url;
      await interaction.deferUpdate();
      return interaction.editReply(renderDraft(builder));
    }

    if (step === 'text') {
      const title = interaction.fields.getTextInputValue('input_text_title').trim();
      const content = interaction.fields.getTextInputValue('input_text_content').trim();
      if (builder.texts.length >= 10) {
        return interaction.reply({ content: '❌ En fazla 10 metin eklenebilir.', flags: MessageFlags.Ephemeral });
      }
      builder.texts.push({ title, content });
      await interaction.deferUpdate();
      return interaction.editReply(renderDraft(builder));
    }

    if (step === 'opt') {
      const label = interaction.fields.getTextInputValue('input_label').trim();
      const description = interaction.fields.getTextInputValue('input_optdesc').trim();
      builder.pending = {
        value: generateOptionId(),
        label,
        description
      };
      await interaction.deferUpdate();
      return interaction.editReply(renderActionSelect(builder, label));
    }

    if (step === 'editopt') {
      const index = parseInt(parts[4], 10);
      const option = builder.options[index];
      if (!option) {
        return interaction.reply({ content: '❌ Seçenek bulunamadı.', flags: MessageFlags.Ephemeral });
      }
      const label = interaction.fields.getTextInputValue('input_label').trim();
      const description = interaction.fields.getTextInputValue('input_optdesc').trim();
      option.label = label;
      option.description = description;
      await interaction.deferUpdate();
      return interaction.editReply(renderDraft(builder));
    }

    if (step === 'save') {
      const name = interaction.fields.getTextInputValue('input_name').trim();
      builder.name = name || builder.title || 'Panel';
      savePanel(builder);
      const saved = renderSaved(builder);
      cancelBuilder(interaction.user.id);
      await interaction.deferUpdate();
      return interaction.editReply(saved);
    }

    if (step === 'content') {
      const optionValue = parts.slice(4).join('_');
      const content = interaction.fields.getTextInputValue('input_content').trim();

      const option = builder.pending;
      if (option && option.value === optionValue) {
        option.action = { type: builder.pendingActionType, content };
        builder.options.push(option);
      }
      builder.pending = null;
      builder.pendingActionType = null;

      await interaction.deferUpdate();
      return interaction.editReply(renderDraft(builder));
    }
  }
};