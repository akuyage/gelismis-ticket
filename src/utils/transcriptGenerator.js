import { Collection } from 'discord.js';

const dateFormatter = new Intl.DateTimeFormat('tr-TR', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
});

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function extractComponentText(components) {
  let text = '';
  for (const comp of components || []) {
    if (!comp || typeof comp !== 'object') continue;
    if (comp.type === 10 && comp.content) {
      text += comp.content + '\n';
    }
    if (Array.isArray(comp.components)) {
      text += extractComponentText(comp.components);
    }
  }
  return text.trim();
}

async function generateTranscript(channel, ticket, metadata) {
  // 1. Fetch all messages in the channel
  let messages = new Collection();
  let lastId;
  let iterationCount = 0;
  const MAX_ITERATIONS = 100; // Maksimum 100 * 100 = 10.000 mesaj

  while (iterationCount < MAX_ITERATIONS) {
    const options = { limit: 100 };
    if (lastId) options.before = lastId;
    const fetched = await channel.messages.fetch(options);
    messages = messages.concat(fetched);
    if (fetched.size !== 100) break;
    lastId = fetched.last().id;
    iterationCount++;
  }

  // Sort oldest to newest
  messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

  // 2. Build Message HTML
  let messagesHtml = '';
  messages.forEach(msg => {
    if (!msg.author) return;

    const componentText = extractComponentText(msg.components);
    const hasText = !!(msg.content || componentText);

    if (!hasText && msg.attachments.size === 0 && msg.embeds.length === 0) return;

    const avatarUrl = msg.author.displayAvatarURL({ extension: 'png', size: 128 });
    const time = dateFormatter.format(msg.createdAt);

    // Bot panel mesajı: botun ticket kanalına attığı panel (content, type-10 bileşenlerinde)
    const isBotPanel = msg.author.id === channel.client.user.id && componentText && !msg.content;

    // Footer alt metnini (-# ...) panelden temizle
    let contentRaw = msg.content || componentText;
    if (isBotPanel) {
      contentRaw = contentRaw.split('\n').filter(line => !line.trim().startsWith('-#')).join('\n');
    }
    const content = escapeHTML(contentRaw);

    // Attachments
    let attachmentsHtml = '';
    msg.attachments.forEach(att => {
      const url = escapeHTML(att.url);
      if (att.contentType && att.contentType.startsWith('image/')) {
        attachmentsHtml += `<img class="attachment" src="${url}" alt="Attachment">`;
      } else {
        attachmentsHtml += `<div class="file-attachment">📎 <a href="${url}" target="_blank">${escapeHTML(att.name)}</a></div>`;
      }
    });

    const messageClass = isBotPanel ? 'message bot-panel' : 'message';
    messagesHtml += `
        <div class="${messageClass}">
            <img class="avatar" src="${avatarUrl}" alt="Avatar">
            <div class="msg-body">
                <div class="msg-header">
                    <span class="username">${escapeHTML(msg.author.username)}</span>
                    <span class="timestamp">${time}</span>
                </div>
                <div class="msg-content">${content}</div>
                ${attachmentsHtml}
            </div>
        </div>`;
  });

  // 3. Build Horizontal Meta Panel HTML (Top)
  const metaItems = [
    { label: 'Ticket Kategorisi', value: escapeHTML(metadata.category), sub: `ID: ${escapeHTML(ticket.id)}`, cls: 'blue' },
    { label: 'Açan Kullanıcı', value: escapeHTML(metadata.creatorName), sub: `ID: ${escapeHTML(metadata.creatorId)}`, cls: 'green' },
    { label: 'İlgilenen Yetkili', value: escapeHTML(metadata.claimedByName), sub: `ID: ${escapeHTML(metadata.claimedById)}`, cls: 'orange' },
    { label: 'Kapatan Kişi', value: escapeHTML(metadata.closerName), sub: `ID: ${escapeHTML(metadata.closerId)}`, cls: 'red' }
  ].map(item => `
        <div class="meta-item ${item.cls}">
            <h3>${item.label}</h3>
            <p>${item.value}</p>
            ${item.sub ? `<small>${item.sub}</small>` : ''}
        </div>`).join('\n');

  const metaPanelHtml = `
    <div class="meta-panel">
${metaItems}
    </div>`;

  // 4. Build Notes HTML (Left Sidebar)
  const noteItems = (metadata.notes || []).map(n => `
        <div class="note">
            <div class="note-header">
                <span class="note-author">${escapeHTML(n.authorName)}</span>
                <span class="note-time">${escapeHTML(n.timeLabel)}</span>
            </div>
            <div class="note-content">${escapeHTML(n.note)}</div>
        </div>`).join('\n');

  const notesHtml = `
    <aside class="sidebar">
        <h2>📝 Notlar</h2>
        ${noteItems || '<div class="empty-state">Bu ticket\'a not eklenmemiş.</div>'}
    </aside>`;

  // 5. Build Full HTML
  const html = `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHTML(channel.guild.name)} | Ticket #${ticket.id}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; background-color: #111214; color: #dbdee1; font-family: 'Inter', sans-serif; }
        
        .header { 
            background: linear-gradient(135deg, #1e1f22, #2b2d31); 
            padding: 40px 20px; 
            border-bottom: 1px solid #3f4147; 
            text-align: center; 
        }
        .header h1 { margin: 0; color: #fff; font-size: 30px; font-weight: 700; letter-spacing: -0.5px; }
        .header p { color: #949ba4; font-size: 15px; margin-top: 10px; }
        
        /* Horizontal Meta Panel (Top) */
        .meta-panel { 
            display: flex; 
            flex-wrap: wrap; 
            gap: 16px; 
            max-width: 1200px; 
            margin: 28px auto 0 auto; 
            padding: 0 20px; 
        }
        .meta-item { 
            flex: 1 1 220px; 
            background: #1e1f22; 
            border: 1px solid #2b2d31; 
            border-top: 4px solid #5865F2; 
            border-radius: 12px; 
            padding: 16px 18px; 
            box-shadow: 0 8px 24px rgba(0,0,0,0.2);
        }
        .meta-item.green { border-top-color: #23a559; }
        .meta-item.orange { border-top-color: #faa61a; }
        .meta-item.red { border-top-color: #f23f42; }
        .meta-item.blue { border-top-color: #5865F2; }
        
        .meta-item h3 { margin: 0 0 6px 0; font-size: 11px; color: #80848e; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; }
        .meta-item p { margin: 0; font-size: 16px; font-weight: 600; color: #f2f3f5; word-break: break-word; }
        .meta-item small { display: block; margin-top: 4px; font-size: 12px; color: #949ba4; font-weight: 400; }
        
        .layout { 
            display: grid; 
            grid-template-columns: 260px 1fr; 
            gap: 24px; 
            max-width: 1200px; 
            margin: 28px auto 0 auto; 
            padding: 0 20px; 
            align-items: start;
        }
        
        /* Left Notes Sidebar */
        .sidebar { 
            background: #1e1f22; 
            border: 1px solid #2b2d31; 
            border-top: 4px solid #faa61a; 
            border-radius: 12px; 
            padding: 20px; 
            box-shadow: 0 8px 24px rgba(0,0,0,0.2); 
            position: sticky; 
            top: 20px;
        }
        .sidebar h2 { margin: 0 0 16px 0; font-size: 15px; color: #f2f3f5; }
        .note { padding: 12px 0; border-bottom: 1px solid #2b2d31; }
        .note:last-child { border-bottom: none; }
        .note-header { margin-bottom: 4px; display: flex; align-items: baseline; gap: 8px; }
        .note-author { color: #faa61a; font-weight: 600; font-size: 14px; }
        .note-time { color: #949ba4; font-size: 12px; }
        .note-content { color: #dbdee1; font-size: 14px; line-height: 1.5; white-space: pre-wrap; word-wrap: break-word; }
        .empty-state { text-align: center; color: #949ba4; padding: 12px; }
        
        /* Messages */
        .content { min-width: 0; }
        .messages { padding-bottom: 40px; }
        .message { display: flex; margin-bottom: 26px; }
        .avatar { width: 44px; height: 44px; border-radius: 50%; object-fit: cover; margin-right: 16px; flex-shrink: 0; background-color: #2b2d31; }
        .msg-body { flex: 1; min-width: 0; }
        .msg-header { margin-bottom: 4px; display: flex; align-items: baseline; gap: 8px; }
        .username { color: #f2f3f5; font-weight: 600; font-size: 16px; }
        .timestamp { color: #949ba4; font-size: 12px; }
        .msg-content { color: #dbdee1; font-size: 15px; line-height: 1.5; white-space: pre-wrap; word-wrap: break-word; }
        
        /* Bot panel (ticket kanalındaki karşılama paneli) */
        .bot-panel { 
            background: #1e1f22; 
            border: 1px solid #2b2d31; 
            border-left: 4px solid #5865F2; 
            border-radius: 12px; 
            padding: 18px; 
            margin-bottom: 28px; 
            box-shadow: 0 8px 24px rgba(0,0,0,0.2);
        }
        .bot-panel .avatar { background-color: #5865F2; }
        
        .attachment { margin-top: 12px; border-radius: 8px; max-width: 400px; width: 100%; height: auto; display: block; border: 1px solid #2b2d31; }
        .file-attachment { margin-top: 10px; background: #2b2d31; padding: 10px 16px; border-radius: 6px; display: inline-block; font-size: 14px; }
        .file-attachment a { color: #00a8fc; text-decoration: none; }
        .file-attachment a:hover { text-decoration: underline; }
        
        /* Discord Markdown Styles */
        .msg-content b, .msg-content strong { font-weight: 700; color: #fff; }
        .msg-content i, .msg-content em { font-style: italic; }
        .msg-content u { text-decoration: underline; }
        .msg-content s { text-decoration: line-through; }
        .msg-content code { background: #1e1f22; padding: 2px 4px; border-radius: 4px; font-family: monospace; font-size: 14px; }
        .msg-content pre { background: #1e1f22; padding: 12px; border-radius: 6px; overflow-x: auto; border: 1px solid #2b2d31; margin: 8px 0; }
        .msg-content pre code { padding: 0; background: transparent; border: none; }
        
        @media (max-width: 768px) {
            .layout { grid-template-columns: 1fr; }
            .sidebar { position: static; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🛡️ ${escapeHTML(channel.guild.name)}</h1>
        <p>Ticket #${ticket.id} • Transkript Arşivi</p>
    </div>
    
${metaPanelHtml}
    
    <div class="layout">
${notesHtml}
        
        <main class="content">
            <div class="messages">
                ${messagesHtml || '<div class="empty-state">Bu Ticket\'ta hiçbir mesaj bulunmuyor.</div>'}
            </div>
        </main>
    </div>

    <div class="footer" style="text-align: center; margin-top: 40px; padding: 20px; border-top: 1px solid #313338; color: #949ba4; font-size: 0.8rem;">
        <p>${escapeHTML(channel.guild.name)} • Powered by akuyage</p>
        <p>${new Date().toLocaleString('tr-TR')}</p>
    </div>
</body>
</html>`;

  return html;
}

export default generateTranscript;