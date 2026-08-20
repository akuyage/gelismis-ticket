import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { blacklistAdd, blacklistRemove, blacklistList } from '../../managers/ticketManager.js';

export default {
  data: new SlashCommandBuilder()
    .setName('blacklist')
    .setDescription('Ticket açma kara listesini yönetir.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub
        .setName('ekle')
        .setDescription('Kullanıcıyı kara listeye ekler.')
        .addUserOption(option =>
          option
            .setName('kullanici')
            .setDescription('Kara listeye eklenecek kullanıcı.')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('sebep')
            .setDescription('Kara liste sebebi (opsiyonel).')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('kaldir')
        .setDescription('Kullanıcıyı kara listeden çıkarır.')
        .addUserOption(option =>
          option
            .setName('kullanici')
            .setDescription('Kara listeden çıkarılacak kullanıcı.')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('liste')
        .setDescription('Kara listedeki kullanıcıları listeler.')
    ),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'ekle') {
      const user = interaction.options.getUser('kullanici');
      const reason = interaction.options.getString('sebep');
      return blacklistAdd(interaction, user.id, reason);
    }

    if (subcommand === 'kaldir') {
      const user = interaction.options.getUser('kullanici');
      return blacklistRemove(interaction, user.id);
    }

    if (subcommand === 'liste') {
      return blacklistList(interaction);
    }
  }
};