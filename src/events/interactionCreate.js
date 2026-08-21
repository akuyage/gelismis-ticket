import { MessageFlags } from 'discord.js';
function matchComponent(collection, customId) {
  const exact = collection.get(customId);
  if (exact) return exact;

  const prefixed = collection
    .filter(c => customId.startsWith(c.customId))
    .sort((a, b) => b.customId.length - a.customId.length);
  return prefixed.first();
}

export default {
  name: 'interactionCreate',
  once: false,
  async execute(interaction, client) {
    try {
      if (interaction.isAutocomplete()) {
        const command = client.commands.get(interaction.commandName);
        if (command && typeof command.autocomplete === 'function') {
          await command.autocomplete(interaction);
        }
        return;
      }

      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;

        await command.execute(interaction);
        return;
      }

      if (interaction.isStringSelectMenu()) {
        const component = matchComponent(client.selectMenus, interaction.customId);
        if (component) {
          await component.execute(interaction);
        }
        return;
      }

      if (interaction.isModalSubmit()) {
        const component = matchComponent(client.modals, interaction.customId);
        if (component) {
          await component.execute(interaction);
        }
        return;
      }

      if (interaction.isButton()) {
        const component = matchComponent(client.buttons, interaction.customId);
        if (component) {
          await component.execute(interaction);
        }
        return;
      }
    } catch (error) {
      console.error('[InteractionCreate] Error handling interaction:', error);
      try {
        if (interaction.isAutocomplete()) {
          if (!interaction.responded) await interaction.respond([]).catch(() => {});
          return;
        }
        if (typeof interaction.reply !== 'function') return;
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ content: '❌ İşlem sırasında bir hata oluştu.', flags: MessageFlags.Ephemeral }).catch(() => {});
        } else {
          await interaction.reply({ content: '❌ İşlem sırasında bir hata oluştu.', flags: MessageFlags.Ephemeral }).catch(() => {});
        }
      } catch (replyError) {
        console.error('[InteractionCreate] Failed to send error message:', replyError);
      }
    }
  }
};
