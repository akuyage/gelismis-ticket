import 'dotenv/config';
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { setupTables } from './database/models/setupTables.js';
import loadCommands from './handlers/commandHandler.js';
import loadComponents from './handlers/componentHandler.js';
import loadEvents from './handlers/eventHandler.js';

// 1. Run database setup and migrations
setupTables();

// 2. Initialize Discord Client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Channel, Partials.Message, Partials.User]
});

// 3. Load Handlers
async function init() {
  await loadCommands(client);
  await loadComponents(client);
  await loadEvents(client);

  const token = process.env.DISCORD_TOKEN;
  if (!token || token === 'YOUR_BOT_TOKEN_HERE') {
    console.error('❌ DISCORD_TOKEN .env dosyasında ayarlanmamış! Lütfen geçerli bir bot tokenı giriniz.');
    process.exit(1);
  }

  await client.login(token);
}

init().catch(err => {
  console.error('❌ Bot başlatılırken hata oluştu:', err);
});
