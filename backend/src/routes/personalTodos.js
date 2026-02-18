import { Router } from 'express';
import db from '../database.js';
import { authenticate } from '../auth.js';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;
    const todos = await db('personal_todos')
      .where({ tenant_id: tenantId, user_id: userId })
      .select('*');
    res.json(todos);
  } catch (err) {
    console.error('List personal todos error:', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

router.get('/:todoId', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;
    const todo = await db('personal_todos')
      .where({ id: req.params.todoId, tenant_id: tenantId, user_id: userId })
      .first();
    if (!todo) return res.status(404).json({ detail: 'Personal todo not found' });
    res.json(todo);
  } catch (err) {
    console.error('Get personal todo error:', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;
    const { title, description, status } = req.body;
    if (!title) {
      return res.status(422).json({ detail: 'title is required' });
    }
    const [id] = await db('personal_todos').insert({
      tenant_id: tenantId,
      user_id: userId,
      title,
      description: description || null,
      status: status || 'pending',
    });
    const todo = await db('personal_todos').where({ id }).first();
    res.json(todo);
  } catch (err) {
    console.error('Create personal todo error:', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

router.patch('/:todoId', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;
    const todo = await db('personal_todos')
      .where({ id: req.params.todoId, tenant_id: tenantId, user_id: userId })
      .first();
    if (!todo) return res.status(404).json({ detail: 'Personal todo not found' });

    const updates = {};
    for (const key of ['title', 'description', 'status']) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    if (Object.keys(updates).length > 0) {
      await db('personal_todos')
        .where({ id: req.params.todoId, tenant_id: tenantId, user_id: userId })
        .update(updates);
    }

    const updated = await db('personal_todos').where({ id: req.params.todoId }).first();
    res.json(updated);
  } catch (err) {
    console.error('Update personal todo error:', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

router.delete('/:todoId', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;
    const todo = await db('personal_todos')
      .where({ id: req.params.todoId, tenant_id: tenantId, user_id: userId })
      .first();
    if (!todo) return res.status(404).json({ detail: 'Personal todo not found' });

    await db('personal_todos')
      .where({ id: req.params.todoId, tenant_id: tenantId, user_id: userId })
      .del();
    res.status(204).send();
  } catch (err) {
    console.error('Delete personal todo error:', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

export default router;
