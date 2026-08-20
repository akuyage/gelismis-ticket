import db from '../database/connect.js';
import { MessageFlags } from 'discord.js';
import { container, textDisplay, separator, footerDisplay } from './ticketTemplate.js';

export const DEFAULT_CATEGORIES = [
  {
    categoryId: 'cat_general',
    name: 'Genel Destek',
    description: 'Genel sorular, öneriler ve bilgi talepleri.',
    emoji: '❓',
    modalTitle: 'Destek Talebi Formu',
    modalLabel: 'Sorununuzu Kısaca Açıklayınız'
  },
  {
    categoryId: 'cat_technical',
    name: 'Teknik Destek',
    description: 'Hata bildirimleri, teknik problemler ve kurulum yardımı.',
    emoji: '💻',
    modalTitle: 'Teknik Destek Formu',
    modalLabel: 'Karşılaştığınız Hata / Teknik Detaylar'
  },
  {
    categoryId: 'cat_payment',
    name: 'Ödeme & Fatura',
    description: 'Satın alımlar, ödeme bildirimleri ve fatura işlemleri.',
    emoji: '💳',
    modalTitle: 'Ödeme & Fatura Destek Formu',
    modalLabel: 'Sipariş/İşlem Numarası ve Sorununuz'
  }
];

export const FALLBACK_NAMES = Object.fromEntries(
  DEFAULT_CATEGORIES.map(c => [c.categoryId, c.name])
);

export function ensureDefaultCategories() {
  const count = db.prepare('SELECT COUNT(*) as count FROM TicketCategories').get().count;
  if (count > 0) return;

  const insert = db.prepare(`
    INSERT INTO TicketCategories (categoryId, name, description, emoji, modalTitle, modalLabel, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const now = Date.now();
  const seed = db.transaction(() => {
    for (const cat of DEFAULT_CATEGORIES) {
      insert.run(cat.categoryId, cat.name, cat.description, cat.emoji, cat.modalTitle, cat.modalLabel, now, now);
    }
  });
  seed();
}

export function listCategories() {
  return db.prepare('SELECT * FROM TicketCategories ORDER BY createdAt ASC').all();
}

export function getCategory(categoryId) {
  if (!categoryId) return null;
  return db.prepare('SELECT * FROM TicketCategories WHERE categoryId = ?').get(categoryId) || null;
}

export function getCategoryName(categoryId) {
  const cat = getCategory(categoryId);
  if (cat) return cat.name;
  return FALLBACK_NAMES[categoryId] || categoryId || 'Ticket';
}

export function generateCategoryId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id;
  do {
    let suffix = '';
    for (let i = 0; i < 6; i++) {
      suffix += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    id = `cat_${suffix.toLowerCase()}`;
  } while (db.prepare('SELECT categoryId FROM TicketCategories WHERE categoryId = ?').get(id));
  return id;
}

export function addCategory(data) {
  const categoryId = data.categoryId || generateCategoryId();
  const now = Date.now();
  db.prepare(`
    INSERT INTO TicketCategories (categoryId, name, description, emoji, modalTitle, modalLabel, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    categoryId,
    data.name || 'Kategori',
    data.description || '',
    data.emoji || '',
    data.modalTitle || '',
    data.modalLabel || '',
    now,
    now
  );
  return getCategory(categoryId);
}

export function updateCategory(categoryId, data) {
  const current = getCategory(categoryId);
  if (!current) return null;
  db.prepare(`
    UPDATE TicketCategories
    SET name = ?, description = ?, emoji = ?, modalTitle = ?, modalLabel = ?, updatedAt = ?
    WHERE categoryId = ?
  `).run(
    data.name != null ? data.name : current.name,
    data.description != null ? data.description : current.description,
    data.emoji != null ? data.emoji : current.emoji,
    data.modalTitle != null ? data.modalTitle : current.modalTitle,
    data.modalLabel != null ? data.modalLabel : current.modalLabel,
    Date.now(),
    categoryId
  );
  return getCategory(categoryId);
}

export function hasOpenTickets(categoryId) {
  const row = db.prepare(
    "SELECT COUNT(*) as count FROM Tickets WHERE categoryId = ? AND status IN ('open', 'claimed')"
  ).get(categoryId);
  return row.count > 0;
}

export function deleteCategory(categoryId) {
  const result = db.prepare('DELETE FROM TicketCategories WHERE categoryId = ?').run(categoryId);
  return result.changes > 0;
}

export function resetCategories() {
  db.prepare('DELETE FROM TicketCategories').run();
  ensureDefaultCategories();
  return listCategories();
}

export function categoryChoices(focused) {
  const term = String(focused || '').toLowerCase();
  return listCategories()
    .filter(c =>
      String(c.name).toLowerCase().includes(term) ||
      String(c.categoryId).toLowerCase().includes(term)
    )
    .slice(0, 25)
    .map(c => ({
      name: `${c.name} (${c.categoryId})`,
      value: c.categoryId
    }));
}

export function renderCategoryList(categories = listCategories()) {
  const lines = categories.map((c, i) =>
    `**${i + 1}.** ${c.emoji ? c.emoji + ' ' : ''}**${c.name}** (\`${c.categoryId}\`)\n` +
    `   📝 ${c.description || '*açıklama yok*'}\n` +
    `   🧾 Form: **${c.modalTitle || '*varsayılan*'}** — *${c.modalLabel || '*varsayılan*'}*`
  );

  const content = [
    `## 🎫 Ticket Kategorileri (${categories.length})`,
    '',
    ...lines,
    '',
    '📌 **Ekle:** `/panelozellestir ekle` • **Düzenle:** `/panelozellestir duzenle` • **Sil:** `/panelozellestir kaldir`'
  ].join('\n');

  return {
    flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
    components: [
      container([
        textDisplay(content),
        separator(true, 1),
        footerDisplay()
      ])
    ]
  };
}

export function renderCategorySaved(cat, isNew) {
  const content = [
    `${isNew ? '## ✅ Kategori Eklendi' : '## ✅ Kategori Güncellendi'}`,
    `**${cat.emoji ? cat.emoji + ' ' : ''}${cat.name}** (\`${cat.categoryId}\`)`,
    `**Açıklama:** ${cat.description || '*yok*'}`,
    `**Form Başlığı:** ${cat.modalTitle || '*varsayılan*'}`,
    `**Form Etiketi:** ${cat.modalLabel || '*varsayılan*'}`,
    '',
    '📤 Panelde görünmesi için `/panelgonder` ile panoyu yeniden gönderin.'
  ].join('\n');

  return {
    flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
    components: [
      container([
        textDisplay(content),
        separator(true, 1),
        footerDisplay()
      ])
    ]
  };
}

export function renderCategoryDeleted(cat) {
  const content = [
    `## 🗑️ Kategori Silindi`,
    `**${cat.emoji ? cat.emoji + ' ' : ''}${cat.name}** (\`${cat.categoryId}\`) başarıyla silindi.`,
    '',
    '📋 Kalan kategorileri görmek için `/panelozellestir liste` kullanın.'
  ].join('\n');

  return {
    flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
    components: [
      container([
        textDisplay(content),
        separator(true, 1),
        footerDisplay()
      ])
    ]
  };
}