import { MessageFlags } from 'discord.js';
import db from '../database/connect.js';
import { container, textDisplay, separator, footerDisplay } from './ticketTemplate.js';

const ACTION_LABELS = {
  dm: '📩 Kullanıcıya DM',
  ephemeral: '💬 Sadece kullanıcının göreceği mesaj',
  role: '🎭 Rol ver',
  ticket: '🎫 Ticket Oluştur'
};

const PANEL_TYPES = {
  select: '📋 Liste (Select Menü)',
  buttons: '🔘 Butonlar',
  rtl_list: '↔️ Sağdan Sola Liste'
};

const COLOR_PRESETS = [
  { emoji: '🔴', name: 'Kırmızı', hex: '#F23F42' },
  { emoji: '🟠', name: 'Turuncu', hex: '#FAA61A' },
  { emoji: '🟡', name: 'Sarı', hex: '#FEE75C' },
  { emoji: '🟢', name: 'Yeşil', hex: '#23A559' },
  { emoji: '🔵', name: 'Mavi', hex: '#5865F2' },
  { emoji: '🟣', name: 'Mor', hex: '#9B59B6' },
  { emoji: '🟤', name: 'Kahverengi', hex: '#A6522A' },
  { emoji: '🩷', name: 'Pembe', hex: '#EB459E' },
  { emoji: '⚫', name: 'Siyah', hex: '#2B2D31' },
  { emoji: '⚪', name: 'Beyaz', hex: '#F2F3F5' }
];

const MAX_TEXTS = 10;

const builders = new Map();

function randomId(prefix, length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = prefix;
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
function generateEmbedId() {
  let id;
  do {
    id = randomId('EP', 6);
  } while (db.prepare('SELECT embedId FROM EmbedPanels WHERE embedId = ?').get(id));
  return id;
}

export function generateOptionId() {
  return randomId('opt_', 6);
}

export function getBuilder(userId) {
  return builders.get(userId) || null;
}

export function cancelBuilder(userId) {
  builders.delete(userId);
}

export async function startBuilder(interaction) {
  const builder = {
    embedId: generateEmbedId(),
    name: '',
    type: 'select',
    title: '',
    description: '',
    color: '#5865F2',
    image: '',
    texts: [],
    options: [],
    createdBy: interaction.user.id,
    createdAt: Date.now()
  };
  builders.set(interaction.user.id, builder);
  return interaction.reply({ ...renderDraft(builder), flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
}

export async function startEditor(interaction, embedId) {
  const panel = getPanel(embedId);
  if (!panel) return null;

  const builder = {
    embedId: panel.embedId,
    name: panel.name || '',
    type: panel.type || 'select',
    title: panel.title || '',
    description: panel.description || '',
    color: panel.color || '#5865F2',
    image: panel.image || '',
    texts: Array.isArray(panel.texts) ? panel.texts : [],
    options: Array.isArray(panel.options) ? panel.options : [],
    createdBy: interaction.user.id,
    createdAt: panel.createdAt
  };

  builders.set(interaction.user.id, builder);
  return { ...renderDraft(builder), flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] };
}

function actionLabel(action) {
  if (!action || !action.type) return '⚙️ Aksiyon seçilmedi';
  return ACTION_LABELS[action.type] || `⚙️ ${action.type}`;
}

export function renderDraft(panel) {
  const optionLines = panel.options.map((o, i) =>
    `**${i + 1}.** ${o.label}${o.description ? ` — ${o.description}` : ''}\n   ${actionLabel(o.action)}`
  );

  const textLines = panel.texts.map((t, i) =>
    `**${i + 1}.** ${t.title || '*Başlıksız*'}${t.content ? ` — ${t.content.slice(0, 60)}` : ''}`
  );

  const content = [
    '## 🧱 Embed / Panel Oluşturucu',
    `**Panel ID:** \`${panel.embedId}\``,
    '',
    `**Panel Tipi:** ${PANEL_TYPES[panel.type] || PANEL_TYPES.select}`,
    `**Başlık:** ${panel.title || '*boş*'}`,
    `**Açıklama:** ${panel.description || '*boş*'}`,
    `**Renk:** 🎨 \`${panel.color}\``,
    `**Görsel:** ${panel.image ? `🖼️ ${panel.image.slice(0, 60)}` : '*yok*'}`,
    `**Metinler (${panel.texts.length}/${MAX_TEXTS}):**`,
    ...(textLines.length ? textLines : ['*Henüz metin eklenmedi.*']),
    `**Seçenekler (${panel.options.length}/25):**`,
    ...(optionLines.length ? optionLines : ['*Henüz seçenek eklenmedi.*'])
  ].join('\n');

  const inner = [textDisplay(content)];

  if (panel.image) {
    inner.push({
      type: 12,
      items: [{ media: { url: panel.image } }]
    });
  }

  inner.push(
    separator(true, 1),
    {
      type: 1,
      components: [
        { type: 2, style: 2, custom_id: `btn_embedbuild_title_${panel.embedId}`, label: '📝 Başlık & Açıklama' },
        { type: 2, style: 2, custom_id: `btn_embedbuild_color_${panel.embedId}`, label: '🎨 Renk' },
        { type: 2, style: 2, custom_id: `btn_embedbuild_type_${panel.embedId}`, label: '🧩 Panel Tipi' },
        { type: 2, style: 2, custom_id: `btn_embedbuild_image_${panel.embedId}`, label: '🖼️ Görsel' }
      ]
    },
    {
      type: 1,
      components: [
        { type: 2, style: 3, custom_id: `btn_embedbuild_text_${panel.embedId}`, label: '📝 Metin Ekle' },
        { type: 2, style: 3, custom_id: `btn_embedbuild_deltext_${panel.embedId}`, label: '🗑️ Metin Kaldır' },
        { type: 2, style: 3, custom_id: `btn_embedbuild_addopt_${panel.embedId}`, label: '➕ Seçenek Ekle' },
        { type: 2, style: 3, custom_id: `btn_embedbuild_delopt_${panel.embedId}`, label: '🗑️ Seçenek Kaldır' }
      ]
    },
    {
      type: 1,
      components: [
        { type: 2, style: 3, custom_id: `btn_embedbuild_save_${panel.embedId}`, label: '💾 Kaydet' },
        { type: 2, style: 4, custom_id: `btn_embedbuild_cancel_${panel.embedId}`, label: '🗑️ İptal' }
      ]
    },
    separator(true, 1),
    footerDisplay()
  );

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [container(inner, panel.color)]
  };
}

export function renderTypeSelect(panel) {
  return {
    flags: MessageFlags.IsComponentsV2,
    components: [
      container([
        textDisplay('### 🧩 Panel Tipi\n\nPanelin nasıl görüneceğini seçin:'),
        separator(true, 1),
        {
          type: 1,
          components: [
            {
              type: 3,
              custom_id: `select_embedtype_${panel.embedId}`,
              placeholder: 'Panel tipini seçin...',
              options: [
                { label: '📋 Liste (Select Menü)', value: 'select', description: 'Seçenekler açılır listede görünür.' },
                { label: '🔘 Butonlar', value: 'buttons', description: 'Seçenekler butonlar halinde görünür.' },
                { label: '↔️ Sağdan Sola Liste', value: 'rtl_list', description: 'Seçenekler açıklama ve sağda İncele butonuyla görünür.' }
              ]
            }
          ]
        }
      ])
    ]
  };
}

export function renderColorSelect(panel) {
  return {
    flags: MessageFlags.IsComponentsV2,
    components: [
      container([
        textDisplay('### 🎨 Renk Seç\n\nAşağıdaki topçuklardan birini seçerek panel rengini belirleyin:'),
        separator(true, 1),
        {
          type: 1,
          components: [
            {
              type: 3,
              custom_id: `select_embedcolor_${panel.embedId}`,
              placeholder: 'Renk seçin...',
              options: COLOR_PRESETS.map(c => ({
                label: c.name,
                value: c.hex,
                emoji: { name: c.emoji },
                description: `#${c.hex.replace('#', '')}`,
                default: panel.color === c.hex
              }))
            }
          ]
        }
      ])
    ]
  };
}

export function renderTextRemoveSelect(panel) {
  const options = panel.texts.slice(0, 25).map((t, i) => ({
    label: t.title || `Metin ${i + 1}`,
    value: String(i),
    description: t.content ? t.content.slice(0, 100) : undefined
  }));

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [
      container([
        textDisplay('### 🗑️ Metin Kaldır\n\nKaldırmak istediğiniz metni seçin:'),
        separator(true, 1),
        {
          type: 1,
          components: [
            {
              type: 3,
              custom_id: `select_embeddeltext_${panel.embedId}`,
              placeholder: 'Metin seçin...',
              options
            }
          ]
        }
      ])
    ]
  };
}

export function renderOptionRemoveSelect(panel) {
  const options = panel.options.slice(0, 25).map((o, i) => ({
    label: o.label || `Seçenek ${i + 1}`,
    value: String(i),
    description: o.description ? o.description.slice(0, 100) : undefined
  }));

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [
      container([
        textDisplay('### 🗑️ Seçenek Kaldır\n\nKaldırmak istediğiniz seçeneği seçin:'),
        separator(true, 1),
        {
          type: 1,
          components: [
            {
              type: 3,
              custom_id: `select_embeddelopt_${panel.embedId}`,
              placeholder: 'Seçenek seçin...',
              options
            }
          ]
        }
      ])
    ]
  };
}

export function renderActionSelect(panel, optionLabel) {
  return {
    flags: MessageFlags.IsComponentsV2,
    components: [
      container([
        textDisplay(`### ➕ Seçenek Aksiyonu\n\n**${optionLabel}** seçeneğine basılınca hangi aksiyon çalışsın?`),
        separator(true, 1),
        {
          type: 1,
          components: [
            {
              type: 3,
              custom_id: `select_embedaction_${panel.embedId}`,
              placeholder: 'Aksiyon seçin...',
              options: [
                { label: '📩 Kullanıcıya DM Gönder', value: 'dm', description: 'Seçeneğe basan kullanıcıya özel mesaj gönderilir.' },
                { label: '💬 Sadece kullanıcının göreceği mesaj', value: 'ephemeral', description: 'Kanala yazılır, sadece tıklayan kullanıcı görür.' },
                { label: '🎭 Rol Ver', value: 'role', description: 'Belirtilen rolü kullanıcıya verir.' },
                { label: '🎫 Ticket Oluştur', value: 'ticket', description: 'Seçeneğe basan kullanıcı için otomatik ticket açılır.' }
              ]
            }
          ]
        }
      ])
    ]
  };
}

export function renderRoleSelect(panel, roles) {
  const options = roles.slice(0, 25).map(r => ({
    label: r.name.slice(0, 100),
    value: r.id
  }));

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [
      container([
        textDisplay('### 🎭 Rol Seç\n\nVerilecek rolü seçin:'),
        separator(true, 1),
        {
          type: 1,
          components: [
            {
              type: 3,
              custom_id: `select_embedrole_${panel.embedId}`,
              placeholder: 'Rol seçin...',
              options
            }
          ]
        }
      ])
    ]
  };
}

export function renderTicketPrompt(panel, option) {
  const content = [
    '### 🎫 Ticket Oluştur',
    '',
    `**${option.label}** seçeneği için bir destek talebi oluşturmanız gerekmektedir.`,
    'Aşağıdaki **Ticket Oluştur** butonuna basarak talebinizi hemen açabilirsiniz.'
  ].join('\n');

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [
      container([
        textDisplay(content),
        separator(true, 1),
        {
          type: 1,
          components: [
            {
              type: 2,
              style: 3,
              custom_id: `btn_embedticket_${panel.embedId}_${option.value}`,
              label: '🎫 Ticket Oluştur'
            }
          ]
        },
        separator(true, 1),
        footerDisplay()
      ])
    ]
  };
}

export function renderSaved(panel) {
  const content = [
    '### ✅ Embed / Panel kaydedildi',
    `**Ad:** ${panel.name || panel.title}`,
    `**Başlık:** ${panel.title}`,
    `**ID:** \`${panel.embedId}\``,
    `**Seçenek:** ${panel.options.length}`,
    '',
    '📤 Göndermek için `/embedgonder` komutunu kullanın.'
  ].join('\n');

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [
      container([
        textDisplay(content),
        separator(true, 1),
        footerDisplay()
      ])
    ]
  };
}

export function createPanelMessage(panel) {
  const options = (panel.options || []).slice(0, 25);

  const bodyParts = [`## ${panel.title || 'Panel'}`];
  if (panel.description) bodyParts.push(panel.description);
  for (const t of panel.texts || []) {
    bodyParts.push('');
    bodyParts.push(t.title ? `### ${t.title}` : '');
    bodyParts.push(t.content || '');
  }

  const inner = [
    textDisplay(bodyParts.join('\n')),
    separator(true, 1)
  ];

  if (panel.image) {
    inner.push({
      type: 12,
      items: [{ media: { url: panel.image } }]
    });
    inner.push(separator(true, 1));
  }

  if (panel.type === 'rtl_list') {
    // Her seçenek, açıklaması solda ve aksiyon butonu sağda olacak şekilde gösterilir.
    for (const option of options) {
      inner.push({
        type: 9,
        components: [
          textDisplay(`**${option.label.slice(0, 80)}**${option.description ? `\n${option.description.slice(0, 200)}` : ''}`)
        ],
        accessory: {
          type: 2,
          style: 2,
          custom_id: `btn_embedoption_${panel.embedId}_${option.value}`,
          label: 'İncele'
        }
      });
    }
  } else if (panel.type === 'buttons') {
    // Seçenekler butonlar halinde, panelin içinde (satır başına 5)
    for (let i = 0; i < options.length; i += 5) {
      inner.push({
        type: 1,
        components: options.slice(i, i + 5).map(o => ({
          type: 2,
          style: 1,
          custom_id: `btn_embedoption_${panel.embedId}_${o.value}`,
          label: o.label.slice(0, 80)
        }))
      });
    }
  } else {
    // Seçenekler select menüde (liste)
    inner.push({
      type: 1,
      components: [
        {
          type: 3,
          custom_id: `select_embedpanel_${panel.embedId}`,
          placeholder: 'Bir seçenek seçin...',
          options: options.map(o => ({
            label: o.label.slice(0, 100),
            description: o.description ? o.description.slice(0, 100) : undefined,
            value: o.value
          }))
        }
      ]
    });
  }

  inner.push(separator(true, 1), footerDisplay());

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [container(inner, panel.color)]
  };
}

export function renderPanelList(panels) {
  const lines = panels.map((p, i) => {
    const optionCount = JSON.parse(p.options || '[]').length;
    const typeLabel = PANEL_TYPES[p.type] || PANEL_TYPES.select;
    return `**${i + 1}.** **${p.name || 'Panelsiz'}** (\`${p.embedId}\`)\n   ${typeLabel} • 📌 ${p.title || 'Başlıksız'} • 🎨 \`${p.color}\` • ➕ ${optionCount} seçenek\n   🕒 ${new Date(p.createdAt).toLocaleString('tr-TR')}`;
  });

  const content = [
    `## 🧱 Embed / Panel Listesi (${panels.length})`,
    '',
    ...lines,
    '',
    '📌 **Göndermek:** `/embedgonder` • **Silmek:** `/embedsil`'
  ].join('\n');

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [
      container([
        textDisplay(content),
        separator(true, 1),
        footerDisplay()
      ])
    ]
  };
}

export function renderDeleted(panel) {
  const content = [
    `## 🗑️ Embed / Panel silindi`,
    `**${panel.name || panel.title}** (\`${panel.embedId}\`) başarıyla silindi.`,
    '',
    '📋 Kalan panelleri görmek için `/embedlist` kullanın.'
  ].join('\n');

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [
      container([
        textDisplay(content),
        separator(true, 1),
        footerDisplay()
      ])
    ]
  };
}

export function savePanel(panel) {
  const optionsJson = JSON.stringify(panel.options || []);
  const textsJson = JSON.stringify(panel.texts || []);
  db.prepare(`
    INSERT INTO EmbedPanels (embedId, name, type, title, description, color, image, texts, options, createdBy, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(embedId) DO UPDATE SET
      name = excluded.name,
      type = excluded.type,
      title = excluded.title,
      description = excluded.description,
      color = excluded.color,
      image = excluded.image,
      texts = excluded.texts,
      options = excluded.options,
      updatedAt = excluded.updatedAt
  `).run(
    panel.embedId,
    panel.name || panel.title || 'Panel',
    panel.type || 'select',
    panel.title || '',
    panel.description || '',
    panel.color || '#5865F2',
    panel.image || '',
    textsJson,
    optionsJson,
    panel.createdBy,
    panel.createdAt,
    Date.now()
  );
}

export function listPanels() {
  return db.prepare('SELECT * FROM EmbedPanels ORDER BY createdAt DESC').all();
}

export function getPanel(embedId) {
  const row = db.prepare('SELECT * FROM EmbedPanels WHERE embedId = ?').get(embedId);
  if (!row) return null;
  return {
    ...row,
    options: JSON.parse(row.options || '[]'),
    texts: JSON.parse(row.texts || '[]')
  };
}

export function deletePanel(embedId) {
  const result = db.prepare('DELETE FROM EmbedPanels WHERE embedId = ?').run(embedId);
  return result.changes > 0;
}

export function panelChoices(focused) {
  return listPanels()
    .filter(p =>
      String(p.name).toLowerCase().includes(focused) ||
      String(p.embedId).toLowerCase().includes(focused)
    )
    .slice(0, 25)
    .map(p => ({
      name: `${(p.name || 'Panel').slice(0, 80)} (${p.embedId})`,
      value: p.embedId
    }));
}

export async function executeAction(interaction, panel, option) {
  const action = option.action || {};

  if (action.type === 'ticket') {
    if (!interaction.guild) {
      return interaction.reply({ content: '❌ Bu işlem bir sunucuda kullanılabilir.', flags: MessageFlags.Ephemeral });
    }
    return interaction.reply({ ...renderTicketPrompt(panel, option), flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  }

  if (action.type === 'dm') {
    try {
      await interaction.user.send(action.content || 'Size özel bir mesaj gönderildi.');
      return interaction.reply({ content: '📩 Size özel mesaj gönderildi.', flags: MessageFlags.Ephemeral });
    } catch (error) {
      console.error('[EmbedManager] DM failed:', error.message);
      return interaction.reply({ content: '❌ DM gönderilemedi (DM ayarları kapalı olabilir).', flags: MessageFlags.Ephemeral });
    }
  }

  if (action.type === 'ephemeral') {
    return interaction.reply({ content: action.content || 'Mesaj yok.', flags: MessageFlags.Ephemeral });
  }

  if (action.type === 'role') {
    if (!interaction.guild) {
      return interaction.reply({ content: '❌ Bu işlem sunucuda kullanılabilir.', flags: MessageFlags.Ephemeral });
    }
    const role = interaction.guild.roles.cache.get(action.roleId);
    if (!role) {
      return interaction.reply({ content: '❌ Rol bulunamadı.', flags: MessageFlags.Ephemeral });
    }
    try {
      await interaction.member.roles.add(role);
      return interaction.reply({ content: `✅ <@&${role.id}> rolü size verildi.`, flags: MessageFlags.Ephemeral });
    } catch (error) {
      console.error('[EmbedManager] Role add failed:', error.message);
      return interaction.reply({ content: '❌ Rol verilemedi (bot yetkisi yetersiz olabilir).', flags: MessageFlags.Ephemeral });
    }
  }

  return interaction.reply({ content: '⚠️ Bu seçenek için aksiyon tanımlı değil.', flags: MessageFlags.Ephemeral });
}