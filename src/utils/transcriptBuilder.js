import { AttachmentBuilder } from 'discord.js';
import db from '../database/connect.js';
import generateTranscript from './transcriptGenerator.js';
import { getCategoryName } from './categories.js';

async function resolveUserName(client, userId) {
  if (!userId) return { name: 'Bilinmiyor', id: '—' };
  try {
    const user = await client.users.fetch(userId);
    return { name: user.username, id: userId };
  } catch {
    return { name: 'Bilinmiyor', id: userId };
  }
}

export async function buildTranscript(channel, ticket) {
  try {
    const client = channel.client;

    const [creator, claimedBy, closer] = await Promise.all([
      resolveUserName(client, ticket.userId),
      resolveUserName(client, ticket.claimedBy),
      resolveUserName(client, ticket.closedBy)
    ]);

    const noteRows = db.prepare('SELECT * FROM TicketNotes WHERE ticketId = ? ORDER BY createdAt ASC').all(ticket.ticketId);
    const noteAuthorIds = [...new Set(noteRows.map(n => n.authorId))];
    const authorNames = {};
    await Promise.all(noteAuthorIds.map(async id => {
      const { name } = await resolveUserName(client, id);
      authorNames[id] = name;
    }));

    const notes = noteRows.map(n => ({
      authorName: authorNames[n.authorId] || 'Bilinmiyor',
      authorId: n.authorId,
      note: n.note,
      timeLabel: new Date(n.createdAt).toLocaleString('tr-TR')
    }));

    const metadata = {
      creatorName: creator.name,
      creatorId: creator.id,
      claimedByName: claimedBy.name,
      claimedById: claimedBy.id,
      closerName: closer.name,
      closerId: closer.id,
      category: getCategoryName(ticket.categoryId),
      notes
    };

    const ticketWithCategory = {
      ...ticket,
      id: ticket.ticketId || ticket.id,
      category: metadata.category
    };

    const html = await generateTranscript(channel, ticketWithCategory, metadata);
    const buffer = Buffer.from(html, 'utf-8');
    const attachment = new AttachmentBuilder(buffer, { name: `transcript-${ticket.ticketId}.html` });

    return { attachment, html };
  } catch (error) {
    console.error('Transcript build error:', error);
    return null;
  }
}