import {
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder
} from 'discord.js';
import { getBuilder, cancelBuilder, renderDraft, renderTypeSelect, renderColorSelect, renderTextRemoveSelect, renderOptionRemoveSelect } from '../../managers/embedManager.js';

export default {
  customId: 'btn_embedbuild_',
  async execute(interaction) {
    const customId = interaction.customId;
    if (!customId.startsWith('btn_embedbuild_')) return;

    const parts = customId.split('_');
    const action = parts[2];
    const embedId = parts.slice(3).join('_');

    const builder = getBuilder(interaction.user.id);
    if (!builder || builder.embedId !== embedId) {
      return interaction.reply({
        content: '❌ Oluşturma oturumu bulunamadı veya sona erdi. `/embedolustur` ile yeniden başlatın.',
        flags: MessageFlags.Ephemeral
      });
    }

    if (action === 'title') {
      const modal = new ModalBuilder()
        .setCustomId(`modal_embedbuild_title_${embedId}`)
        .setTitle('Başlık & Açıklama')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('input_title')
              .setLabel('Panel Başlığı')
              .setStyle(TextInputStyle.Short)
              .setPlaceholder('Örn: Destek & İletişim Merkezi')
              .setRequired(true)
              .setValue(builder.title || '')
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('input_desc')
              .setLabel('Açıklama')
              .setStyle(TextInputStyle.Paragraph)
              .setPlaceholder('Panel açıklaması (opsiyonel)')
              .setRequired(false)
              .setValue(builder.description || '')
          )
        );
      return interaction.showModal(modal);
    }

    if (action === 'color') {
      await interaction.deferUpdate();
      return interaction.editReply(renderColorSelect(builder));
    }

    if (action === 'image') {
      const modal = new ModalBuilder()
        .setCustomId(`modal_embedbuild_image_${embedId}`)
        .setTitle('🖼️ Görsel')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('input_image')
              .setLabel('Görsel URL')
              .setStyle(TextInputStyle.Short)
              .setPlaceholder('https://... (boş bırakılırsa görsel kaldırılır)')
              .setRequired(false)
              .setValue(builder.image || '')
          )
        );
      return interaction.showModal(modal);
    }

    if (action === 'text') {
      if (builder.texts.length >= 10) {
        return interaction.reply({ content: '❌ En fazla 10 metin eklenebilir.', flags: MessageFlags.Ephemeral });
      }
      const modal = new ModalBuilder()
        .setCustomId(`modal_embedbuild_text_${embedId}`)
        .setTitle('📝 Metin Ekle')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('input_text_title')
              .setLabel('Metin Başlığı')
              .setStyle(TextInputStyle.Short)
              .setPlaceholder('Örn: Kurallar (opsiyonel)')
              .setRequired(false)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('input_text_content')
              .setLabel('Metin')
              .setStyle(TextInputStyle.Paragraph)
              .setPlaceholder('Panele eklenecek metin...')
              .setRequired(true)
          )
        );
      return interaction.showModal(modal);
    }

    if (action === 'deltext') {
      if (builder.texts.length === 0) {
        return interaction.reply({ content: '❌ Kaldırılacak metin yok.', flags: MessageFlags.Ephemeral });
      }
      await interaction.deferUpdate();
      return interaction.editReply(renderTextRemoveSelect(builder));
    }

    if (action === 'addopt') {
      if (builder.options.length >= 25) {
        return interaction.reply({ content: '❌ En fazla 25 seçenek eklenebilir.', flags: MessageFlags.Ephemeral });
      }
      const modal = new ModalBuilder()
        .setCustomId(`modal_embedbuild_opt_${embedId}`)
        .setTitle('Seçenek Ekle')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('input_label')
              .setLabel('Seçenek Başlığı')
              .setStyle(TextInputStyle.Short)
              .setPlaceholder('Örn: Teknik Destek')
              .setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('input_optdesc')
              .setLabel('Seçenek Açıklaması')
              .setStyle(TextInputStyle.Short)
              .setPlaceholder('Seçenek açıklaması (opsiyonel)')
              .setRequired(false)
          )
        );
      return interaction.showModal(modal);
    }

    if (action === 'delopt') {
      if (builder.options.length === 0) {
        return interaction.reply({ content: '❌ Kaldırılacak seçenek yok.', flags: MessageFlags.Ephemeral });
      }
      await interaction.deferUpdate();
      return interaction.editReply(renderOptionRemoveSelect(builder));
    }

    if (action === 'type') {
      await interaction.deferUpdate();
      return interaction.editReply(renderTypeSelect(builder));
    }

    if (action === 'save') {
      const modal = new ModalBuilder()
        .setCustomId(`modal_embedbuild_save_${embedId}`)
        .setTitle('Paneli Kaydet')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('input_name')
              .setLabel('Panel Adı (listede görünür)')
              .setStyle(TextInputStyle.Short)
              .setPlaceholder('Örn: Ana Destek Paneli')
              .setRequired(true)
              .setValue(builder.name || builder.title || '')
          )
        );
      return interaction.showModal(modal);
    }

    if (action === 'cancel') {
      cancelBuilder(interaction.user.id);
      await interaction.deferUpdate();
      return interaction.editReply({ content: '🗑️ Oluşturma iptal edildi.', components: [] });
    }
  }
};