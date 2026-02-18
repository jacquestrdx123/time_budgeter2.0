import { Router } from 'express';
import db from '../database.js';
import config from '../config.js';
import {
  hashPassword,
  verifyPassword,
  createAccessToken,
  createPasswordResetToken,
  consumePasswordResetToken,
  authenticate,
  sanitizeUser,
} from '../auth.js';
import { sendPasswordResetEmail } from '../services/notificationService.js';
import { seedDefaultsForTenant } from '../seedSettings.js';

const router = Router();

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, organization_name } = req.body;
    if (!name || !email || !password) {
      return res.status(422).json({ detail: 'name, email, and password are required' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await db('users').where({ email: normalizedEmail }).first();
    if (existing) {
      return res.status(409).json({ detail: 'A user with this email already exists' });
    }

    const [tenantId] = await db('tenants').insert({
      name: organization_name && String(organization_name).trim() ? String(organization_name).trim() : 'My Team',
    });
    await seedDefaultsForTenant(tenantId);

    const [id] = await db('users').insert({
      tenant_id: tenantId,
      name,
      email: normalizedEmail,
      password_hash: hashPassword(password),
      role: 'admin',
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

    const normalizedEmail = email.trim().toLowerCase();
    const candidates = await db('users').where({ email: normalizedEmail }).orderBy('id');
    let user = null;
    for (const u of candidates) {
      if (verifyPassword(password, u.password_hash)) {
        user = u;
        break;
      }
    }
    if (!user) {
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

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(422).json({ detail: 'Email is required' });
    }
    const normalizedEmail = email.trim().toLowerCase();
    const user = await db('users').where({ email: normalizedEmail }).first();
    const message = 'If an account exists with this email, you will receive a password reset link shortly.';
    if (user) {
      const token = await createPasswordResetToken(user.id);
      const resetLink = `${config.FRONTEND_URL.replace(/\/$/, '')}/reset-password?token=${token}`;
      await sendPasswordResetEmail(user.email, resetLink);
      if (!config.EMAIL_ENABLED) {
        console.warn('[Auth] Password reset skipped: EMAIL_ENABLED is false');
      }
    }
    return res.status(200).json({ detail: message });
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(422).json({ detail: 'Token and password are required' });
    }
    if (password.length < 6) {
      return res.status(422).json({ detail: 'Password must be at least 6 characters' });
    }
    const user = await consumePasswordResetToken(token);
    if (!user) {
      return res.status(422).json({ detail: 'Invalid or expired reset link. Please request a new one.' });
    }
    await db('users').where({ id: user.id }).update({ password_hash: hashPassword(password) });
    return res.status(200).json({ detail: 'Your password has been reset. You can now sign in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

export default router;
