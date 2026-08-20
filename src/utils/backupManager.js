import fs from 'fs';
import path from 'path';
import db from '../database/connect.js';
import { loadConfig, saveConfig } from './configLoader.js';

export const BACKUP_DIR = path.resolve(process.cwd(), 'backups');

export const BACKUP_TABLES = [
  'Tickets',
  'Transcripts',
  'TicketRatings',
  'TicketNotes',
  'TicketBlacklist',
  'Feedbacks',
  'EmbedPanels',
  'TicketCategories'
];

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export function listBackups() {
  ensureBackupDir();
  const files = fs.readdirSync(BACKUP_DIR);
  const timestamps = new Set();

  for (const file of files) {
    const match = file.match(/^(database|config)-(\d+)\.json$/);
    if (match) timestamps.add(parseInt(match[2], 10));
  }

  const backups = [];
  for (const ts of timestamps) {
    const dbFile = `database-${ts}.json`;
    const cfgFile = `config-${ts}.json`;
    const dbStats = fs.existsSync(path.join(BACKUP_DIR, dbFile)) ? fs.statSync(path.join(BACKUP_DIR, dbFile)) : null;
    const cfgStats = fs.existsSync(path.join(BACKUP_DIR, cfgFile)) ? fs.statSync(path.join(BACKUP_DIR, cfgFile)) : null;

    backups.push({
      timestamp: ts,
      databaseFile: dbStats ? dbFile : null,
      configFile: cfgStats ? cfgFile : null,
      databaseSize: dbStats ? dbStats.size : 0,
      configSize: cfgStats ? cfgStats.size : 0,
      dateLabel: new Date(ts).toLocaleString('tr-TR'),
      sizeLabel: `${dbStats ? formatBytes(dbStats.size) : '-'} / ${cfgStats ? formatBytes(cfgStats.size) : '-'}`
    });
  }

  return backups.sort((a, b) => b.timestamp - a.timestamp);
}

export function getBackup(timestamp) {
  return listBackups().find(b => String(b.timestamp) === String(timestamp)) || null;
}

export function readDbBackup(timestamp) {
  const dbFile = path.join(BACKUP_DIR, `database-${timestamp}.json`);
  if (!fs.existsSync(dbFile)) return null;
  return JSON.parse(fs.readFileSync(dbFile, 'utf8'));
}

export function readCfgBackup(timestamp) {
  const cfgFile = path.join(BACKUP_DIR, `config-${timestamp}.json`);
  if (!fs.existsSync(cfgFile)) return null;
  return JSON.parse(fs.readFileSync(cfgFile, 'utf8'));
}

export function deleteBackup(timestamp) {
  let deleted = [];
  for (const file of [`database-${timestamp}.json`, `config-${timestamp}.json`]) {
    const filePath = path.join(BACKUP_DIR, file);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      deleted.push(file);
    }
  }
  return deleted;
}

export function createAutoBackup() {
  ensureBackupDir();
  const timestamp = Date.now();

  const dbBackup = {};
  for (const table of BACKUP_TABLES) {
    dbBackup[table] = db.prepare(`SELECT * FROM ${table}`).all();
  }
  fs.writeFileSync(path.join(BACKUP_DIR, `database-${timestamp}.json`), JSON.stringify(dbBackup, null, 2), 'utf-8');

  const configPath = path.resolve(process.cwd(), 'config.json');
  const configContent = fs.existsSync(configPath) ? fs.readFileSync(configPath, 'utf-8') : '{}';
  fs.writeFileSync(path.join(BACKUP_DIR, `config-${timestamp}.json`), configContent, 'utf-8');

  return timestamp;
}

function tableColumns(table) {
  return db.prepare(`PRAGMA table_info(${table})`).all().map(col => col.name);
}

export function restoreDatabase(timestamp) {
  const data = readDbBackup(timestamp);
  if (!data || typeof data !== 'object') {
    return { error: 'Yedek dosyası bulunamadı veya geçersiz.' };
  }

  const counts = {};

  const restoreTransaction = db.transaction(() => {
    for (const table of BACKUP_TABLES) {
      db.prepare(`DELETE FROM ${table}`).run();

      const rows = Array.isArray(data[table]) ? data[table] : [];
      if (rows.length === 0) {
        counts[table] = 0;
        continue;
      }

      const columns = tableColumns(table);
      const insert = db.prepare(
        `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`
      );

      for (const row of rows) {
        insert.run(columns.map(col => row[col] ?? null));
      }
      counts[table] = rows.length;
    }

    db.prepare("DELETE FROM sqlite_sequence WHERE name IN ('TicketNotes')").run();
  });

  restoreTransaction();
  db.pragma('wal_checkpoint(TRUNCATE)');

  return { counts };
}

export function restoreConfig(timestamp) {
  const data = readCfgBackup(timestamp);
  if (!data || typeof data !== 'object') {
    return { error: 'Yedek dosyası bulunamadı veya geçersiz.' };
  }

  const configPath = path.resolve(process.cwd(), 'config.json');
  fs.writeFileSync(configPath, JSON.stringify(data, null, 2), 'utf-8');

  const reloaded = loadConfig();
  if (!reloaded) {
    return { error: 'config.json yazıldı ancak yeniden yüklenemedi.' };
  }

  return { success: true };
}