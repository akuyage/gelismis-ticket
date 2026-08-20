import fs from 'fs';
import path from 'path';
import { Collection } from 'discord.js';

export default async function loadComponents(client) {
  client.buttons = new Collection();
  client.selectMenus = new Collection();
  client.modals = new Collection();

  const baseDir = path.resolve(process.cwd(), 'src/interactions');
  const types = ['buttons', 'selectMenus', 'modals'];

  for (const type of types) {
    const dirPath = path.join(baseDir, type);
    if (!fs.existsSync(dirPath)) continue;

    const files = fs.readdirSync(dirPath).filter(file => file.endsWith('.js'));
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const fileUrl = `file://${filePath.replace(/\\/g, '/')}`;
      const module = await import(fileUrl);
      const component = module.default;

      if (component && component.customId && typeof component.execute === 'function') {
        if (type === 'buttons') client.buttons.set(component.customId, component);
        else if (type === 'selectMenus') client.selectMenus.set(component.customId, component);
        else if (type === 'modals') client.modals.set(component.customId, component);
      } else {
        console.warn(`[Components] Component at ${filePath} is missing customId or execute properties.`);
      }
    }
  }

  console.log(`[Components] Loaded ${client.buttons.size} buttons, ${client.selectMenus.size} select menus, ${client.modals.size} modals.`);
}
