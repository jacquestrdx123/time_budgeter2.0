import { Router } from 'express';
import db from '../database.js';
import { authenticate } from '../auth.js';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const tasks = await db('tasks').where({ tenant_id: tenantId }).select('*');
    res.json(tasks);
  } catch (err) {
    console.error('List tasks error:', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

router.get('/:taskId', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const task = await db('tasks').where({ id: req.params.taskId, tenant_id: tenantId }).first();
    if (!task) return res.status(404).json({ detail: 'Task not found' });
    res.json(task);
  } catch (err) {
    console.error('Get task error:', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { title, description, status, project_id, user_id } = req.body;
    if (!title || !project_id) {
      return res.status(422).json({ detail: 'title and project_id are required' });
    }
    const project = await db('projects').where({ id: project_id, tenant_id: tenantId }).first();
    if (!project) return res.status(404).json({ detail: 'Project not found' });

    const [id] = await db('tasks').insert({
      tenant_id: tenantId,
      title,
      description: description || null,
      status: status || 'pending',
      project_id,
      user_id: user_id || null,
    });

    const task = await db('tasks').where({ id }).first();
    res.json(task);
  } catch (err) {
    console.error('Create task error:', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

router.patch('/:taskId', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const task = await db('tasks').where({ id: req.params.taskId, tenant_id: tenantId }).first();
    if (!task) return res.status(404).json({ detail: 'Task not found' });

    const updates = {};
    for (const key of ['title', 'description', 'status', 'project_id', 'user_id']) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    if (Object.keys(updates).length > 0) {
      await db('tasks').where({ id: req.params.taskId, tenant_id: tenantId }).update(updates);
    }

    const updated = await db('tasks').where({ id: req.params.taskId }).first();
    res.json(updated);
  } catch (err) {
    console.error('Update task error:', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

router.delete('/:taskId', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const task = await db('tasks').where({ id: req.params.taskId, tenant_id: tenantId }).first();
    if (!task) return res.status(404).json({ detail: 'Task not found' });

    await db('tasks').where({ id: req.params.taskId, tenant_id: tenantId }).del();
    res.status(204).send();
  } catch (err) {
    console.error('Delete task error:', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

export default router;
