import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import config from './config.js';
import db from './database.js';

const ALGORITHM = 'HS256';
const ACCESS_TOKEN_EXPIRE_HOURS = 24;

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
