import {
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder
} from 'discord.js';
import { getBuilder, renderRoleSelect, renderDraft } from '../../managers/embedManager.js';

export default {
  customId: 'select_embed',
  async execute(interaction) {
    const customId = interaction.customId;

    if (customId.startsWith('select_embedtype_')) {
      const embedId = customId.replace('select_embedtype_', '');
      const builder = getBuilder(interaction.user.id);
      if (!builder || builder.embedId !== embedId) {
        return interaction.reply({
          content: '❌ Oluşturma oturumu bulunamadı veya sona erdi. `/embedolustur` ile yeniden başlatın.',
          flags: MessageFlags.Ephemeral
        });
      }

      const selectedType = interaction.values[0];
      builder.type = ['select', 'buttons', 'rtl_list'].includes(selectedType) ? selectedType : 'select';

      await interaction.deferUpdate();
      return interaction.editReply(renderDraft(builder));
    }

    if (customId.startsWith('select_embedcolor_')) {
      const embedId = customId.replace('select_embedcolor_', '');
      const builder = getBuilder(interaction.user.id);
      if (!builder || builder.embedId !== embedId) {
        return interaction.reply({
          content: '❌ Oluşturma oturumu bulunamadı veya sona erdi. `/embedolustur` ile yeniden başlatın.',
          flags: MessageFlags.Ephemeral
        });
      }

      builder.color = interaction.values[0];

      await interaction.deferUpdate();
      return interaction.editReply(renderDraft(builder));
    }

    if (customId.startsWith('select_embeddeltext_')) {
      const embedId = customId.replace('select_embeddeltext_', '');
      const builder = getBuilder(interaction.user.id);
      if (!builder || builder.embedId !== embedId) {
        return interaction.reply({
          content: '❌ Oluşturma oturumu bulunamadı veya sona erdi. `/embedolustur` ile yeniden başlatın.',
          flags: MessageFlags.Ephemeral
        });
      }

      const index = parseInt(interaction.values[0], 10);
      if (Number.isInteger(index) && builder.texts[index]) {
        builder.texts.splice(index, 1);
      }

      await interaction.deferUpdate();
      return interaction.editReply(renderDraft(builder));
    }

    if (customId.startsWith('select_embeddelopt_')) {
      const embedId = customId.replace('select_embeddelopt_', '');
      const builder = getBuilder(interaction.user.id);
      if (!builder || builder.embedId !== embedId) {
        return interaction.reply({
          content: '❌ Oluşturma oturumu bulunamadı veya sona erdi. `/embedolustur` ile yeniden başlatın.',
          flags: MessageFlags.Ephemeral
        });
      }

      const index = parseInt(interaction.values[0], 10);
      if (Number.isInteger(index) && builder.options[index]) {
        builder.options.splice(index, 1);
      }

      await interaction.deferUpdate();
      return interaction.editReply(renderDraft(builder));
    }

    if (customId.startsWith('select_embedaction_')) {
      const embedId = customId.replace('select_embedaction_', '');
      const builder = getBuilder(interaction.user.id);
      if (!builder || builder.embedId !== embedId || !builder.pending) {
        return interaction.reply({
          content: '❌ Oluşturma oturumu bulunamadı veya sona erdi. `/embedolustur` ile yeniden başlatın.',
          flags: MessageFlags.Ephemeral
        });
      }

      const type = interaction.values[0];

      if (type === 'ticket') {
        builder.pending.action = { type: 'ticket' };
        builder.options.push(builder.pending);
        builder.pending = null;
        builder.pendingActionType = null;

        await interaction.deferUpdate();
        return interaction.editReply(renderDraft(builder));
      }

      if (type === 'role') {
        const roles = [...interaction.guild.roles.cache.values()].filter(r => r.id !== interaction.guild.id);
        await interaction.deferUpdate();
        return interaction.editReply(renderRoleSelect(builder, roles));
      }

      builder.pendingActionType = type;

      const modal = new ModalBuilder()
        .setCustomId(`modal_embedbuild_content_${embedId}_${builder.pending.value}`)
        .setTitle(type === 'dm' ? '📩 DM Mesajı İçeriği' : '💬 Mesaj İçeriği')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('input_content')
              .setLabel('Gönderilecek mesaj içeriği')
              .setStyle(TextInputStyle.Paragraph)
              .setPlaceholder(type === 'dm' ? 'Kullanıcıya özel mesaj...' : 'Sadece kullanıcının görebileceği mesaj...')
              .setRequired(true)
          )
        );

      return interaction.showModal(modal);
    }

    if (customId.startsWith('select_embedrole_')) {
      const embedId = customId.replace('select_embedrole_', '');
      const builder = getBuilder(interaction.user.id);
      if (!builder || builder.embedId !== embedId || !builder.pending) {
        return interaction.reply({
          content: '❌ Oluşturma oturumu bulunamadı veya sona erdi. `/embedolustur` ile yeniden başlatın.',
          flags: MessageFlags.Ephemeral
        });
      }

      const roleId = interaction.values[0];
      builder.pending.action = { type: 'role', roleId };
      builder.options.push(builder.pending);
      builder.pending = null;
      builder.pendingActionType = null;

      await interaction.deferUpdate();
      return interaction.editReply(renderDraft(builder));
    }
  }
};