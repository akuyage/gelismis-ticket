import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { startBuilder } from '../../managers/embedManager.js';

export default {
  data: new SlashCommandBuilder()
    .setName('embedolustur')
    .setDescription('Yeni bir embed/panel oluşturur.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    return startBuilder(interaction);
  }
};