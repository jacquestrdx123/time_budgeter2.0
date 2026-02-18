import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import config from './config.js';
import db from './database.js';

const ALGORITHM = 'HS256';
const ACCESS_TOKEN_EXPIRE_HOURS = 24;
const RESET_TOKEN_EXPIRY_HOURS = 1;

export function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(plainPassword, hashedPassword) {
  return bcrypt.compareSync(plainPassword, hashedPassword);
}

export function createAccessToken(payload) {
  return jwt.sign(payload, config.SECRET_KEY, {
    algorithm: ALGORITHM,
    expiresIn: `${ACCESS_TOKEN_EXPIRE_HOURS}h`,
  });
}

export function verifyToken(token) {
  return jwt.verify(token, config.SECRET_KEY, { algorithms: [ALGORITHM] });
}

export async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ detail: 'Invalid or expired token' });
  }

  const token = authHeader.slice(7);
  try {
    const payload = verifyToken(token);
    const userId = parseInt(payload.sub, 10);
    if (isNaN(userId)) {
      return res.status(401).json({ detail: 'Invalid or expired token' });
    }

    const user = await db('users').where({ id: userId }).first();
    if (!user) {
      return res.status(401).json({ detail: 'Invalid or expired token' });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ detail: 'Invalid or expired token' });
  }
}

export function sanitizeUser(user) {
  const { password_hash, ...safe } = user;
  return safe;
}

function toMySQLDateTime(date) {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

export async function createPasswordResetToken(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);
  await db('password_reset_tokens').insert({
    user_id: userId,
    token,
    expires_at: toMySQLDateTime(expiresAt),
  });
  return token;
}

export async function consumePasswordResetToken(token) {
  const row = await db('password_reset_tokens').where({ token }).first();
  if (!row) return null;
  const expiresAt = new Date(row.expires_at);
  if (expiresAt <= new Date()) return null;
  const user = await db('users').where({ id: row.user_id }).first();
  if (!user) return null;
  await db('password_reset_tokens').where({ token }).del();
  return user;
}
