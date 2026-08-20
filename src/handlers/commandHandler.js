import fs from 'fs';
import path from 'path';
import { Collection } from 'discord.js';

export default async function loadCommands(client) {
  client.commands = new Collection();
  const commandsPath = path.resolve(process.cwd(), 'src/commands');
  
  if (!fs.existsSync(commandsPath)) return;
  
  const categories = fs.readdirSync(commandsPath);
  for (const category of categories) {
    const categoryPath = path.join(commandsPath, category);
    if (!fs.statSync(categoryPath).isDirectory()) continue;
    
    const commandFiles = fs.readdirSync(categoryPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
      const filePath = path.join(categoryPath, file);
      const fileUrl = `file://${filePath.replace(/\\/g, '/')}`;
      const commandModule = await import(fileUrl);
      const command = commandModule.default;
      
      if (command && command.data && typeof command.execute === 'function') {
        client.commands.set(command.data.name, command);
      } else {
        console.warn(`[Commands] Command at ${filePath} is missing required data or execute properties.`);
      }
    }
  }
  console.log(`[Commands] Loaded ${client.commands.size} slash commands.`);
}
