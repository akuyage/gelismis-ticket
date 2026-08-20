import db from '../connect.js';
import { ensureDefaultCategories } from '../../managers/categoryManager.js';

const tableSchemas = {
Tickets: {
    ticketId: 'TEXT PRIMARY KEY',
    channelId: 'TEXT',
    userId: 'TEXT',
    categoryId: 'TEXT',
    status: 'TEXT DEFAULT "open"',
    priority: 'TEXT DEFAULT "normal"',
    claimedBy: 'TEXT',
    createdAt: 'INTEGER',
    lastActivityAt: 'INTEGER',
    slaWarnedAt: 'INTEGER',
    closedAt: 'INTEGER',
    closedBy: 'TEXT',
    closeReason: 'TEXT'
  },
  Transcripts: {
    ticketId: 'TEXT PRIMARY KEY',
    html: 'TEXT',
    createdAt: 'INTEGER'
  },
TicketRatings: {
    ticketId: 'TEXT PRIMARY KEY',
    userId: 'TEXT',
    rating: 'INTEGER',
    comment: 'TEXT',
    createdAt: 'INTEGER'
  },
TicketNotes: {
    noteId: 'INTEGER PRIMARY KEY AUTOINCREMENT',
    ticketId: 'TEXT',
    authorId: 'TEXT',
    note: 'TEXT',
    createdAt: 'INTEGER',
    isDeleted: 'INTEGER DEFAULT 0'
  },
TicketBlacklist: {
    userId: 'TEXT PRIMARY KEY',
    addedBy: 'TEXT',
    reason: 'TEXT',
    createdAt: 'INTEGER'
  },
  Feedbacks: {
    feedbackId: 'TEXT PRIMARY KEY',
    ticketId: 'TEXT',
    userId: 'TEXT',
    content: 'TEXT',
    status: 'TEXT DEFAULT "pending"',
    createdAt: 'INTEGER'
  },
  EmbedPanels: {
    embedId: 'TEXT PRIMARY KEY',
    name: 'TEXT',
    type: 'TEXT DEFAULT "select"',
    title: 'TEXT',
    description: 'TEXT',
    color: 'TEXT DEFAULT "#5865F2"',
    image: 'TEXT DEFAULT ""',
    texts: 'TEXT DEFAULT "[]"',
    options: 'TEXT',
    createdBy: 'TEXT',
    createdAt: 'INTEGER',
    updatedAt: 'INTEGER'
  },
  TicketCategories: {
    categoryId: 'TEXT PRIMARY KEY',
    name: 'TEXT NOT NULL',
    description: 'TEXT DEFAULT ""',
    emoji: 'TEXT DEFAULT ""',
    modalTitle: 'TEXT DEFAULT ""',
    modalLabel: 'TEXT DEFAULT ""',
    createdAt: 'INTEGER',
    updatedAt: 'INTEGER'
  }
};

export function setupTables() {
  for (const [tableName, columns] of Object.entries(tableSchemas)) {
    // 1. Create table if not exists with primary key column or the first one
    const primaryKeyCol = Object.keys(columns).find(col => columns[col].includes('PRIMARY KEY')) || Object.keys(columns)[0];
    const primaryKeyDef = columns[primaryKeyCol];
    
    db.prepare(`CREATE TABLE IF NOT EXISTS ${tableName} (${primaryKeyCol} ${primaryKeyDef})`).run();
    
    // 2. Get existing columns
    const tableInfo = db.prepare(`PRAGMA table_info(${tableName})`).all();
    const existingColumns = new Set(tableInfo.map(col => col.name));
    
    // 3. Add missing columns with ALTER TABLE
    for (const [colName, colType] of Object.entries(columns)) {
      if (!existingColumns.has(colName)) {
        console.log(`[Database] Adding column ${colName} to table ${tableName}...`);
        db.prepare(`ALTER TABLE ${tableName} ADD COLUMN ${colName} ${colType}`).run();
      }
    }
  }
  // Create indexes for query optimization
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_tickets_channelId ON Tickets(channelId)',
    'CREATE INDEX IF NOT EXISTS idx_tickets_userId ON Tickets(userId)',
    'CREATE INDEX IF NOT EXISTS idx_tickets_status ON Tickets(status)',
    'CREATE INDEX IF NOT EXISTS idx_tickets_claimedBy ON Tickets(claimedBy)',
    'CREATE INDEX IF NOT EXISTS idx_ticket_notes_ticketId ON TicketNotes(ticketId)',
    'CREATE INDEX IF NOT EXISTS idx_feedbacks_ticketId ON Feedbacks(ticketId)'
  ];

  for (const idxQuery of indexes) {
    db.prepare(idxQuery).run();
  }

  // Drop tables that are no longer used
  db.prepare('DROP TABLE IF EXISTS StaffStats').run();

  // Seed default ticket categories if the table is empty
  ensureDefaultCategories();

  console.log('[Database] Tables check, migrations, and indexing completed.');
}
