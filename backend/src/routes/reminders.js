import { Router } from 'express';
import db from '../database.js';
import { authenticate } from '../auth.js';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;
    const reminders = await db('reminders')
      .where({ tenant_id: tenantId, user_id: userId })
      .select('*')
      .orderBy('trigger_at', 'asc');
    res.json(reminders);
  } catch (err) {
    console.error('List reminders error:', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

router.get('/:reminderId', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;
    const reminder = await db('reminders')
      .where({ id: req.params.reminderId, tenant_id: tenantId, user_id: userId })
      .first();
    if (!reminder) return res.status(404).json({ detail: 'Reminder not found' });
    res.json(reminder);
  } catch (err) {
    console.error('Get reminder error:', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;
    const { title, description, trigger_at } = req.body;
    if (!title || !trigger_at) {
      return res.status(422).json({ detail: 'title and trigger_at are required' });
    }

    const [id] = await db('reminders').insert({
      tenant_id: tenantId,
      user_id: userId,
      title,
      description: description || null,
      trigger_at,
    });

    const reminder = await db('reminders').where({ id }).first();
    res.status(201).json(reminder);
  } catch (err) {
    console.error('Create reminder error:', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

router.patch('/:reminderId', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;
    const reminder = await db('reminders')
      .where({ id: req.params.reminderId, tenant_id: tenantId, user_id: userId })
      .first();
    if (!reminder) return res.status(404).json({ detail: 'Reminder not found' });

    const updates = {};
    for (const key of ['title', 'description', 'trigger_at']) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    if (Object.keys(updates).length > 0) {
      await db('reminders')
        .where({ id: req.params.reminderId, tenant_id: tenantId, user_id: userId })
        .update(updates);
    }

    const updated = await db('reminders').where({ id: req.params.reminderId }).first();
    res.json(updated);
  } catch (err) {
    console.error('Update reminder error:', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

router.delete('/:reminderId', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;
    const reminder = await db('reminders')
      .where({ id: req.params.reminderId, tenant_id: tenantId, user_id: userId })
      .first();
    if (!reminder) return res.status(404).json({ detail: 'Reminder not found' });

    await db('reminders')
      .where({ id: req.params.reminderId, tenant_id: tenantId, user_id: userId })
      .del();
    res.status(204).send();
  } catch (err) {
    console.error('Delete reminder error:', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

export default router;
