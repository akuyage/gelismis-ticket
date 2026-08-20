import fs from 'fs';
import path from 'path';

export default async function loadEvents(client) {
  const eventsPath = path.resolve(process.cwd(), 'src/events');
  if (!fs.existsSync(eventsPath)) {
    fs.mkdirSync(eventsPath, { recursive: true });
  }

  const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const fileUrl = `file://${filePath.replace(/\\/g, '/')}`;
    const eventModule = await import(fileUrl);
    const event = eventModule.default;

    if (event && event.name && typeof event.execute === 'function') {
      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
      } else {
        client.on(event.name, (...args) => event.execute(...args, client));
      }
    } else {
      console.warn(`[Events] Event at ${filePath} is missing name or execute properties.`);
    }
  }
  console.log(`[Events] Loaded ${eventFiles.length} event listeners.`);
}
