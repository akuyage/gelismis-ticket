import fs from 'fs';
import path from 'path';

const configPath = path.resolve(process.cwd(), 'config.json');

export let config = {};

function validateConfig(parsed) {
  const warnings = [];
  if (typeof parsed.staffRoleId !== 'string') warnings.push('staffRoleId eksik/geçersiz');
  if (typeof parsed.logChannelId !== 'string') warnings.push('logChannelId eksik/geçersiz');
  if (typeof parsed.ticketCategoryId !== 'string') warnings.push('ticketCategoryId eksik/geçersiz');
  if (typeof parsed.noteLogChannelId !== 'string') warnings.push('noteLogChannelId eksik/geçersiz');
  if (typeof parsed.transcriptChannelId !== 'string') warnings.push('transcriptChannelId eksik/geçersiz');
  if (typeof parsed.feedbackSystemChannelId !== 'string') warnings.push('feedbackSystemChannelId eksik/geçersiz');
  if (typeof parsed.feedbackChannelId !== 'string') warnings.push('feedbackChannelId eksik/geçersiz');
  if (typeof parsed.scoreLogChannelId !== 'string') warnings.push('scoreLogChannelId eksik/geçersiz');
  if (typeof parsed.blacklistLogChannelId !== 'string') warnings.push('blacklistLogChannelId eksik/geçersiz');
  if (typeof parsed.panelChannelId !== 'string') warnings.push('panelChannelId eksik/geçersiz');
  if (!Array.isArray(parsed.developers)) warnings.push('developers dizisi eksik/geçersiz');
  if (parsed.slaWarningTimeout != null && (!Number.isInteger(parsed.slaWarningTimeout) || parsed.slaWarningTimeout < 0)) {
    warnings.push('slaWarningTimeout pozitif bir sayı olmalı');
  }
  if (parsed.status && parsed.status.text && parsed.status.text.length > 128) {
    warnings.push('status.text 128 karakteri aşamaz');
  }
  for (const w of warnings) {
    console.warn(`[Config] Uyarı: ${w}`);
  }
}

export function loadConfig() {
  try {
    let data = fs.readFileSync(configPath, 'utf8');
    if (data.charCodeAt(0) === 0xFEFF) {
      data = data.slice(1);
    }
    const parsed = JSON.parse(data);

    for (const key in config) {
      delete config[key];
    }
    Object.assign(config, parsed);
    validateConfig(config);
    return config;
  } catch (error) {
    console.error('Config load error:', error);
    return null;
  }
}

export function saveConfig(newConfig) {
  try {
    const updated = { ...config, ...newConfig };
    fs.writeFileSync(configPath, JSON.stringify(updated, null, 2), 'utf8');
    loadConfig();
    return true;
  } catch (error) {
    console.error('Config save error:', error);
    return false;
  }
}

loadConfig();