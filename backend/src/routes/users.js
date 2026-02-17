import { Router } from 'express';
import db from '../database.js';
import { hashPassword, sanitizeUser } from '../auth.js';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const users = await db('users').select('*');
    res.json(users.map(sanitizeUser));
  } catch (err) {
    console.error('List users error:', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

router.get('/:userId', async (req, res) => {
  try {
    const user = await db('users').where({ id: req.params.userId }).first();
    if (!user) return res.status(404).json({ detail: 'User not found' });
    res.json(sanitizeUser(user));
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(422).json({ detail: 'name, email, and password are required' });
    }

    const [id] = await db('users').insert({
      name,
      email,
      password_hash: hashPassword(password),
    });

    const user = await db('users').where({ id }).first();
    res.json(sanitizeUser(user));
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

router.patch('/:userId', async (req, res) => {
  try {
    const user = await db('users').where({ id: req.params.userId }).first();
    if (!user) return res.status(404).json({ detail: 'User not found' });

    const updates = {};
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.email !== undefined) updates.email = req.body.email;

    if (Object.keys(updates).length > 0) {
      await db('users').where({ id: req.params.userId }).update(updates);
    }

    const updated = await db('users').where({ id: req.params.userId }).first();
    res.json(sanitizeUser(updated));
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

router.delete('/:userId', async (req, res) => {
  try {
    const user = await db('users').where({ id: req.params.userId }).first();
    if (!user) return res.status(404).json({ detail: 'User not found' });

    await db('users').where({ id: req.params.userId }).del();
    res.status(204).send();
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

export default router;
