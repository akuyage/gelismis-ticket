import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import {
  getCategory,
  deleteCategory,
  hasOpenTickets,
  resetCategories,
  categoryChoices,
  renderCategoryList,
  renderCategoryDeleted
} from '../../managers/categoryManager.js';
import { buildCategoryModal } from '../../interactions/modals/categoryModals.js';

export default {
  data: new SlashCommandBuilder()
    .setName('panelozellestir')
    .setDescription('Ticket kategorilerini özelleştirir.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub
        .setName('liste')
        .setDescription('Mevcut ticket kategorilerini listeler.')
    )
    .addSubcommand(sub =>
      sub
        .setName('ekle')
        .setDescription('Yeni bir ticket kategorisi ekler.')
    )
    .addSubcommand(sub =>
      sub
        .setName('duzenle')
        .setDescription('Bir ticket kategorisini düzenler.')
        .addStringOption(opt =>
          opt
            .setName('kategori')
            .setDescription('Düzenlenecek kategori.')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('kaldir')
        .setDescription('Bir ticket kategorisini kaldırır (açık ticket varsa engellenir).')
        .addStringOption(opt =>
          opt
            .setName('kategori')
            .setDescription('Kaldırılacak kategori.')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('sifirla')
        .setDescription('Kategorileri varsayılanlara döndürür.')
    ),
  async autocomplete(interaction) {
    const focused = interaction.options.getFocused().toLowerCase();
    await interaction.respond(categoryChoices(focused));
  },
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'liste') {
      return interaction.reply(renderCategoryList());
    }

    if (subcommand === 'ekle') {
      return interaction.showModal(buildCategoryModal(null));
    }

    if (subcommand === 'duzenle') {
      const categoryId = interaction.options.getString('kategori');
      const category = getCategory(categoryId);
      if (!category) {
        return interaction.reply({ content: '❌ Kategori bulunamadı.', flags: MessageFlags.Ephemeral });
      }
      return interaction.showModal(buildCategoryModal(category));
    }

    if (subcommand === 'kaldir') {
      const categoryId = interaction.options.getString('kategori');
      const category = getCategory(categoryId);
      if (!category) {
        return interaction.reply({ content: '❌ Kategori bulunamadı.', flags: MessageFlags.Ephemeral });
      }
      if (hasOpenTickets(categoryId)) {
        return interaction.reply({
          content: `⚠️ **${category.name}** kategorisinde açık/üstlenilmiş ticket'lar var. Önce bu ticket'ları kapatmadan kategori silinemez.`,
          flags: MessageFlags.Ephemeral
        });
      }
      deleteCategory(categoryId);
      return interaction.reply(renderCategoryDeleted(category));
    }

    if (subcommand === 'sifirla') {
      const cats = resetCategories();
      return interaction.reply({
        ...renderCategoryList(cats),
        content: '🔄 Kategoriler varsayılanlara döndürüldü.'
      });
    }

    return interaction.reply({ content: '❌ Geçersiz alt komut.', flags: MessageFlags.Ephemeral });
  }
};