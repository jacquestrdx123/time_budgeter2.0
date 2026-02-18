import { Router } from 'express';
import db from '../database.js';
import { authenticate, hashPassword, sanitizeUser } from '../auth.js';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const users = await db('users').where({ tenant_id: tenantId }).select('*');
    res.json(users.map(sanitizeUser));
  } catch (err) {
    console.error('List users error:', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

router.get('/:userId', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const user = await db('users').where({ id: req.params.userId, tenant_id: tenantId }).first();
    if (!user) return res.status(404).json({ detail: 'User not found' });
    res.json(sanitizeUser(user));
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ detail: 'Only admins can create users' });
    }

    const tenantId = req.user.tenant_id;
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(422).json({ detail: 'name, email, and password are required' });
    }

    const existing = await db('users').where({ tenant_id: tenantId, email }).first();
    if (existing) {
      return res.status(409).json({ detail: 'A user with this email already exists in your team' });
    }

    const [id] = await db('users').insert({
      tenant_id: tenantId,
      role: 'member',
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
    const tenantId = req.user.tenant_id;
    const targetUser = await db('users').where({ id: req.params.userId, tenant_id: tenantId }).first();
    if (!targetUser) return res.status(404).json({ detail: 'User not found' });

    const isSelf = String(targetUser.id) === String(req.user.id);
    const isOtherUser = !isSelf;
    if (isOtherUser && req.user.role !== 'admin') {
      return res.status(403).json({ detail: 'Only admins can update other users' });
    }

    const updates = {};
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.email !== undefined) updates.email = req.body.email;
    if (req.body.role !== undefined && req.user.role === 'admin') {
      if (['admin', 'member'].includes(req.body.role)) updates.role = req.body.role;
    }

    if (Object.keys(updates).length > 0) {
      if (updates.role === 'member' && targetUser.role === 'admin') {
        if (isSelf) {
          return res.status(400).json({ detail: 'You cannot demote yourself.' });
        }
        const adminCount = await db('users').where({ tenant_id: tenantId, role: 'admin' }).count('* as count').first();
        if (adminCount && Number(adminCount.count) <= 1) {
          return res.status(400).json({ detail: 'Cannot demote the last admin. Assign another admin first.' });
        }
      }
      if (updates.email !== undefined) {
        const conflict = await db('users').where({ tenant_id: tenantId, email: updates.email }).first();
        if (conflict && conflict.id !== targetUser.id) {
          return res.status(409).json({ detail: 'A user with this email already exists in your team' });
        }
      }
      await db('users').where({ id: req.params.userId, tenant_id: tenantId }).update(updates);
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
    const tenantId = req.user.tenant_id;
    const targetUser = await db('users').where({ id: req.params.userId, tenant_id: tenantId }).first();
    if (!targetUser) return res.status(404).json({ detail: 'User not found' });

    const isSelf = String(targetUser.id) === String(req.user.id);
    const isOtherUser = !isSelf;
    if (isOtherUser && req.user.role !== 'admin') {
      return res.status(403).json({ detail: 'Only admins can delete other users' });
    }

    if (targetUser.role === 'admin') {
      const adminCount = await db('users').where({ tenant_id: tenantId, role: 'admin' }).count('* as count').first();
      if (adminCount && Number(adminCount.count) <= 1) {
        return res.status(400).json({ detail: 'Cannot delete the last admin. Assign another admin first.' });
      }
    }

    await db('users').where({ id: req.params.userId, tenant_id: tenantId }).del();
    res.status(204).send();
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

export default router;
