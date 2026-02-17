import { readFileSync } from 'fs';
import { resolve } from 'path';
import nodemailer from 'nodemailer';
import config from '../config.js';
import db from '../database.js';

let firebaseApp = null;
let firebaseInitialised = false;

async function initFirebase() {
  if (firebaseInitialised) return firebaseApp;
  firebaseInitialised = true;

  try {
    const admin = await import('firebase-admin');
    const credPath = resolve(config.FIREBASE_CREDENTIALS_PATH);
    const cred = JSON.parse(readFileSync(credPath, 'utf-8'));

    firebaseApp = admin.default.initializeApp({
      credential: admin.default.credential.cert(cred),
    });
    console.log('Firebase Admin SDK initialised');
  } catch (err) {
    console.warn('Firebase Admin SDK failed to initialise:', err.message);
    firebaseApp = null;
  }

  return firebaseApp;
}

// ---------------------------------------------------------------------------
// Push notifications via Firebase Cloud Messaging
// ---------------------------------------------------------------------------

async function sendPushNotification(token, title, body, data = null) {
  if (!config.FIREBASE_ENABLED) return false;

  const app = await initFirebase();
  if (!app) return false;

  try {
    const { getMessaging } = await import('firebase-admin/messaging');
    const messaging = getMessaging(app);

    const message = {
      notification: { title, body },
      data: data
        ? Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)]))
        : {},
      token,
    };

    await messaging.send(message);
    console.log(`Push sent to token ${token.substring(0, 20)}…`);
    return true;
  } catch (err) {
    console.error('Push send failed:', err.message);
    return false;
  }
}

async function sendPushToUser(userId, title, body, data = null) {
  const devices = await db('fcm_devices').where({ user_id: userId });
  let anySent = false;
  for (const device of devices) {
    if (await sendPushNotification(device.token, title, body, data)) {
      anySent = true;
    }
  }
  return anySent;
}

// ---------------------------------------------------------------------------
// Email notifications
// ---------------------------------------------------------------------------

async function sendEmail(toEmail, subject, htmlBody) {
  if (!config.EMAIL_ENABLED) return false;

  try {
    const transportOpts = {
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      secure: !config.SMTP_USE_TLS,
    };

    if (config.SMTP_USERNAME) {
      transportOpts.auth = { user: config.SMTP_USERNAME, pass: config.SMTP_PASSWORD };
    }

    if (config.SMTP_USE_TLS) {
      transportOpts.tls = { rejectUnauthorized: false };
    }

    const transporter = nodemailer.createTransport(transportOpts);
    const plainText = htmlBody.replace(/<br\s*\/?>/g, '\n').replace(/<[^>]+>/g, '');

    await transporter.sendMail({
      from: `"${config.SMTP_FROM_NAME}" <${config.SMTP_FROM_EMAIL}>`,
      to: toEmail,
      subject,
      text: plainText,
      html: htmlBody,
    });

    console.log(`Email sent to ${toEmail}`);
    return true;
  } catch (err) {
    console.error('Email send failed:', err.message);
    return false;
  }
}

function buildNotificationHtml(title, body) {
  return `
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #4f46e5; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0;">TimeBudget</h2>
        </div>
        <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <h3 style="color: #1f2937;">${title}</h3>
            <p style="color: #4b5563; line-height: 1.6;">${body}</p>
        </div>
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 16px;">
            You received this email from TimeBudget notifications.
        </p>
    </body>
    </html>`;
}

// ---------------------------------------------------------------------------
// High-level dispatch
// ---------------------------------------------------------------------------

export async function getOrCreatePreferences(userId) {
  let prefs = await db('notification_preferences').where({ user_id: userId }).first();
  if (!prefs) {
    const [id] = await db('notification_preferences').insert({ user_id: userId });
    prefs = await db('notification_preferences').where({ id }).first();
  }
  return prefs;
}

function isTypeEnabled(prefs, notificationType) {
  const typeMap = {
    task_assigned: prefs.task_assigned,
    task_updated: prefs.task_updated,
    shift_reminder: prefs.shift_reminder,
    project_updated: prefs.project_updated,
  };
  return typeMap[notificationType] ?? true;
}

export async function sendNotification({
  userId,
  title,
  body,
  notificationType = 'general',
  data = null,
}) {
  const prefs = await getOrCreatePreferences(userId);

  let sentPush = false;
  let sentEmail = false;

  if (prefs.push_enabled && isTypeEnabled(prefs, notificationType)) {
    sentPush = await sendPushToUser(userId, title, body, data);
  }

  if (prefs.email_enabled && isTypeEnabled(prefs, notificationType)) {
    const user = await db('users').where({ id: userId }).first();
    if (user) {
      const html = buildNotificationHtml(title, body);
      sentEmail = await sendEmail(user.email, title, html);
    }
  }

  let channel = 'none';
  if (sentPush && sentEmail) channel = 'all';
  else if (sentPush) channel = 'push';
  else if (sentEmail) channel = 'email';

  const [id] = await db('notifications').insert({
    user_id: userId,
    title,
    body,
    notification_type: notificationType,
    channel,
    sent_push: sentPush,
    sent_email: sentEmail,
  });

  return db('notifications').where({ id }).first();
}
