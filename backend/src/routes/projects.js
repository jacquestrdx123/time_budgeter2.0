import { Router } from 'express';
import db from '../database.js';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const projects = await db('projects').select('*');
    res.json(projects);
  } catch (err) {
    console.error('List projects error:', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

router.get('/:projectId', async (req, res) => {
  try {
    const project = await db('projects').where({ id: req.params.projectId }).first();
    if (!project) return res.status(404).json({ detail: 'Project not found' });
    res.json(project);
  } catch (err) {
    console.error('Get project error:', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

router.get('/:projectId/tasks', async (req, res) => {
  try {
    const project = await db('projects').where({ id: req.params.projectId }).first();
    if (!project) return res.status(404).json({ detail: 'Project not found' });

    const tasks = await db('tasks').where({ project_id: req.params.projectId });
    res.json(tasks);
  } catch (err) {
    console.error('List project tasks error:', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

router.get('/:projectId/shifts', async (req, res) => {
  try {
    const project = await db('projects').where({ id: req.params.projectId }).first();
    if (!project) return res.status(404).json({ detail: 'Project not found' });

    const shifts = await db('shifts').where({ project_id: req.params.projectId });
    res.json(shifts);
  } catch (err) {
    console.error('List project shifts error:', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(422).json({ detail: 'name is required' });

    const [id] = await db('projects').insert({
      name,
      description: description || null,
    });

    const project = await db('projects').where({ id }).first();
    res.json(project);
  } catch (err) {
    console.error('Create project error:', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

router.patch('/:projectId', async (req, res) => {
  try {
    const project = await db('projects').where({ id: req.params.projectId }).first();
    if (!project) return res.status(404).json({ detail: 'Project not found' });

    const updates = {};
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.description !== undefined) updates.description = req.body.description;

    if (Object.keys(updates).length > 0) {
      await db('projects').where({ id: req.params.projectId }).update(updates);
    }

    const updated = await db('projects').where({ id: req.params.projectId }).first();
    res.json(updated);
  } catch (err) {
    console.error('Update project error:', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

router.delete('/:projectId', async (req, res) => {
  try {
    const project = await db('projects').where({ id: req.params.projectId }).first();
    if (!project) return res.status(404).json({ detail: 'Project not found' });

    await db('projects').where({ id: req.params.projectId }).del();
    res.status(204).send();
  } catch (err) {
    console.error('Delete project error:', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

export default router;
