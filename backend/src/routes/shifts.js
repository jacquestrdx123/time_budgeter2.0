import { Router } from 'express';
import db from '../database.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    let query = db('shifts');

    if (req.query.user_id) {
      query = query.where('user_id', req.query.user_id);
    }

    if (req.query.date) {
      const dayStart = `${req.query.date}T00:00:00.000`;
      const dayEnd = `${req.query.date}T23:59:59.999`;
      query = query.where('start_time', '>=', dayStart).where('start_time', '<=', dayEnd);
    } else if (req.query.date_from && req.query.date_to) {
      const rangeStart = `${req.query.date_from}T00:00:00.000`;
      const rangeEnd = `${req.query.date_to}T23:59:59.999`;
      query = query.where('start_time', '>=', rangeStart).where('start_time', '<=', rangeEnd);
    }

    const shifts = await query.orderBy('start_time', 'asc');
    res.json(shifts);
  } catch (err) {
    console.error('List shifts error:', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

router.get('/:shiftId', async (req, res) => {
  try {
    const shift = await db('shifts').where({ id: req.params.shiftId }).first();
    if (!shift) return res.status(404).json({ detail: 'Shift not found' });
    res.json(shift);
  } catch (err) {
    console.error('Get shift error:', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { start_time, end_time, user_id, project_id } = req.body;
    if (!start_time || !end_time || !user_id || !project_id) {
      return res.status(422).json({ detail: 'start_time, end_time, user_id, and project_id are required' });
    }

    const [id] = await db('shifts').insert({
      start_time,
      end_time,
      user_id,
      project_id,
    });

    const shift = await db('shifts').where({ id }).first();
    res.json(shift);
  } catch (err) {
    console.error('Create shift error:', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

router.patch('/:shiftId', async (req, res) => {
  try {
    const shift = await db('shifts').where({ id: req.params.shiftId }).first();
    if (!shift) return res.status(404).json({ detail: 'Shift not found' });

    const updates = {};
    for (const key of ['start_time', 'end_time', 'user_id', 'project_id']) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    if (Object.keys(updates).length > 0) {
      await db('shifts').where({ id: req.params.shiftId }).update(updates);
    }

    const updated = await db('shifts').where({ id: req.params.shiftId }).first();
    res.json(updated);
  } catch (err) {
    console.error('Update shift error:', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

router.delete('/:shiftId', async (req, res) => {
  try {
    const shift = await db('shifts').where({ id: req.params.shiftId }).first();
    if (!shift) return res.status(404).json({ detail: 'Shift not found' });

    await db('shifts').where({ id: req.params.shiftId }).del();
    res.status(204).send();
  } catch (err) {
    console.error('Delete shift error:', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

export default router;
