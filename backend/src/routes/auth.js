import { Router } from 'express';
import db from '../database.js';
import { hashPassword, verifyPassword, createAccessToken, authenticate, sanitizeUser } from '../auth.js';

const router = Router();

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(422).json({ detail: 'name, email, and password are required' });
    }

    const existing = await db('users').where({ email }).first();
    if (existing) {
      return res.status(409).json({ detail: 'A user with this email already exists' });
    }

    const [id] = await db('users').insert({
      name,
      email,
      password_hash: hashPassword(password),
    });

    const user = await db('users').where({ id }).first();
    const token = createAccessToken({ sub: String(user.id) });

    res.status(201).json({
      access_token: token,
      token_type: 'bearer',
      user: sanitizeUser(user),
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(422).json({ detail: 'email and password are required' });
    }

    const user = await db('users').where({ email }).first();
    if (!user || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ detail: 'Invalid email or password' });
    }

    const token = createAccessToken({ sub: String(user.id) });

    res.json({
      access_token: token,
      token_type: 'bearer',
      user: sanitizeUser(user),
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

router.get('/me', authenticate, (req, res) => {
  res.json(sanitizeUser(req.user));
});

export default router;
