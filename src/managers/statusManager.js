import { ActivityType } from 'discord.js';
import { config } from '../utils/configLoader.js';

export function updateBotStatus(client) {
  if (!client || !client.user) return;

  const statusConfig = config.status || {};
  const activityText = statusConfig.text || 'Ticket Sistemi';
  const activityTypeStr = (statusConfig.type || 'Playing').toUpperCase();

  let type = ActivityType.Playing;
  if (activityTypeStr === 'STREAMING') type = ActivityType.Streaming;
  else if (activityTypeStr === 'LISTENING') type = ActivityType.Listening;
  else if (activityTypeStr === 'WATCHING') type = ActivityType.Watching;
  else if (activityTypeStr === 'COMPETING') type = ActivityType.Competing;

  try {
    client.user.setPresence({
      activities: [{ name: activityText, type: type }],
      status: 'online'
    });
  } catch (error) {
    console.error('[StatusManager] Status set error:', error);
  }
}
