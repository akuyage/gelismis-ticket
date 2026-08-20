import { REST, Routes } from 'discord.js';
import { config } from '../utils/configLoader.js';
import { updateBotStatus } from '../managers/statusManager.js';
import { startSlaWarningTask } from '../tasks/slaWarningTask.js';

export default {
  name: 'clientReady',
  once: true,
  async execute(client) {
    console.log(`[Bot] ${client.user.tag} olarak giriş yapıldı!`);

    // 1. Update presence
    updateBotStatus(client);

    // 2. Register Slash Commands
    try {
      const commandData = client.commands.map(cmd => cmd.data.toJSON());
      const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

      const route = config.devGuildId
        ? Routes.applicationGuildCommands(client.user.id, config.devGuildId)
        : Routes.applicationCommands(client.user.id);

      console.log(`[SlashCommands] ${commandData.length} adet uygulama komutu kaydediliyor...`);
      await rest.put(route, { body: commandData });
      console.log(`[SlashCommands] Uygulama komutları başarıyla güncellendi (${config.devGuildId ? 'Sunucu Özel: ' + config.devGuildId : 'Küresel'}).`);
    } catch (error) {
      console.error('[SlashCommands] Komut kaydı sırasında hata oluştu:', error);
    }

    // 3. Start Tasks
    startSlaWarningTask(client);
  }
};
