import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const backendDir = join(__dirname, '..');

const envFile = join(backendDir, '.env');
if (existsSync(envFile)) {
  dotenv.config({ path: envFile });
} else {
  dotenv.config({ path: join(backendDir, '..', '.env') });
}

function envBool(key, fallback = false) {
  const val = process.env[key];
  if (val === undefined) return fallback;
  return val.toLowerCase() === 'true';
}

const config = {
  SECRET_KEY: process.env.SECRET_KEY || 'timebudget-dev-secret-change-in-production',
  DATABASE_URL: process.env.DATABASE_URL || 'sqlite:///./timebudget.db',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:8081',

  FIREBASE_CREDENTIALS_PATH: process.env.FIREBASE_CREDENTIALS_PATH || 'firebase-service-account.json',
  FIREBASE_ENABLED: envBool('FIREBASE_ENABLED'),

  SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_USERNAME: process.env.SMTP_USERNAME || '',
  SMTP_PASSWORD: process.env.SMTP_PASSWORD || '',
  SMTP_FROM_EMAIL: process.env.SMTP_FROM_EMAIL || '',
  SMTP_FROM_NAME: process.env.SMTP_FROM_NAME || 'TimeBudget',
  SMTP_USE_TLS: envBool('SMTP_USE_TLS', true),
  EMAIL_ENABLED: envBool('EMAIL_ENABLED'),

  SHIFT_REMINDER_MINUTES: parseInt(process.env.SHIFT_REMINDER_MINUTES || '5', 10),
  SCHEDULER_ENABLED: envBool('SCHEDULER_ENABLED', true),
  SCHEDULER_CHECK_INTERVAL_SECONDS: parseInt(process.env.SCHEDULER_CHECK_INTERVAL_SECONDS || '60', 10),
};

export function getDatabasePath() {
  const url = config.DATABASE_URL;
  const match = url.match(/sqlite:\/\/\/(.+)/);
  if (match) {
    const dbPath = match[1];
    if (dbPath.startsWith('./') || dbPath.startsWith('../')) {
      return join(backendDir, dbPath);
    }
    return dbPath;
  }
  return join(backendDir, 'timebudget.db');
}

export default config;
