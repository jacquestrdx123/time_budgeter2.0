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

// Get the currently active (clocked-in) shift for a user
router.get('/active/:userId', async (req, res) => {
  try {
    const shift = await db('shifts')
      .where({ user_id: req.params.userId })
      .whereNull('end_time')
      .orderBy('start_time', 'desc')
      .first();
    res.json(shift || null);
  } catch (err) {
    console.error('Get active shift error:', err);
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
    const { start_time, end_time, user_id, project_id, is_break, break_type } = req.body;
    const isBreakShift = is_break === true || is_break === 1;

    if (!start_time || !user_id) {
      return res.status(422).json({ detail: 'start_time and user_id are required' });
    }
    if (!isBreakShift && !project_id) {
      return res.status(422).json({ detail: 'project_id is required for non-break shifts' });
    }

    const [id] = await db('shifts').insert({
      start_time,
      end_time: end_time || null,
      user_id,
      project_id: isBreakShift ? (project_id || null) : project_id,
      is_break: isBreakShift ? 1 : 0,
      break_type: isBreakShift ? (break_type || null) : null,
    });

    const shift = await db('shifts').where({ id }).first();
    res.json(shift);
  } catch (err) {
    console.error('Create shift error:', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

// Clock in: create a new shift with start_time = now and no end_time
router.post('/clock-in', async (req, res) => {
  try {
    const { user_id, project_id } = req.body;
    if (!user_id || !project_id) {
      return res.status(422).json({ detail: 'user_id and project_id are required' });
    }

    // Check for an existing active shift
    const existing = await db('shifts')
      .where({ user_id })
      .whereNull('end_time')
      .first();
    if (existing) {
      return res.status(409).json({ detail: 'Already clocked in. Please clock out first.' });
    }

    const now = new Date().toISOString();
    const [id] = await db('shifts').insert({
      start_time: now,
      end_time: null,
      user_id,
      project_id,
    });

    const shift = await db('shifts').where({ id }).first();
    res.json(shift);
  } catch (err) {
    console.error('Clock-in error:', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

// Clock out: set end_time on the active shift
router.post('/clock-out', async (req, res) => {
  try {
    const { user_id } = req.body;
    if (!user_id) {
      return res.status(422).json({ detail: 'user_id is required' });
    }

    const active = await db('shifts')
      .where({ user_id })
      .whereNull('end_time')
      .first();
    if (!active) {
      return res.status(404).json({ detail: 'No active shift to clock out from.' });
    }

    const now = new Date().toISOString();
    await db('shifts').where({ id: active.id }).update({ end_time: now });

    const shift = await db('shifts').where({ id: active.id }).first();
    res.json(shift);
  } catch (err) {
    console.error('Clock-out error:', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

router.patch('/:shiftId', async (req, res) => {
  try {
    const shift = await db('shifts').where({ id: req.params.shiftId }).first();
    if (!shift) return res.status(404).json({ detail: 'Shift not found' });

    const updates = {};
    for (const key of ['start_time', 'end_time', 'user_id', 'project_id', 'is_break', 'break_type']) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    if (updates.is_break !== undefined) {
      updates.is_break = (updates.is_break === true || updates.is_break === 1) ? 1 : 0;
      if (updates.is_break === 0) updates.break_type = null;
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
