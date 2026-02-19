import { Router } from 'express';
import db from '../database.js';
import { authenticate } from '../auth.js';

/** Convert ISO string or Date to MySQL DATETIME format (YYYY-MM-DD HH:mm:ss) */
function toMySQLDateTime(value) {
  if (value == null) return null;
  const d = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

/** Map clock_session row to shift-like shape for frontend (start_time, end_time, project_id) */
function clockSessionToShiftLike(row) {
  if (!row) return null;
  return {
    id: row.id,
    user_id: row.user_id,
    tenant_id: row.tenant_id,
    project_id: row.project_id,
    shift_id: row.shift_id,
    start_time: row.clocked_in_at,
    end_time: row.clocked_out_at,
    clocked_in_at: row.clocked_in_at,
    clocked_out_at: row.clocked_out_at,
    created_at: row.created_at,
  };
}

const router = Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    let query = db('shifts').where({ tenant_id: tenantId });

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

router.get('/active/:userId', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const session = await db('clock_sessions')
      .where({ user_id: req.params.userId, tenant_id: tenantId })
      .whereNull('clocked_out_at')
      .orderBy('clocked_in_at', 'desc')
      .first();
    res.json(clockSessionToShiftLike(session));
  } catch (err) {
    console.error('Get active clock session error:', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

router.get('/:shiftId', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const shift = await db('shifts').where({ id: req.params.shiftId, tenant_id: tenantId }).first();
    if (!shift) return res.status(404).json({ detail: 'Shift not found' });
    res.json(shift);
  } catch (err) {
    console.error('Get shift error:', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { start_time, end_time, user_id, project_id, is_break, break_type } = req.body;
    const isBreakShift = is_break === true || is_break === 1;

    if (!start_time || !user_id) {
      return res.status(422).json({ detail: 'start_time and user_id are required' });
    }
    if (!isBreakShift && !project_id) {
      return res.status(422).json({ detail: 'project_id is required for non-break shifts' });
    }
    const user = await db('users').where({ id: user_id, tenant_id: tenantId }).first();
    if (!user) return res.status(404).json({ detail: 'User not found' });
    if (!isBreakShift) {
      const project = await db('projects').where({ id: project_id, tenant_id: tenantId }).first();
      if (!project) return res.status(404).json({ detail: 'Project not found' });
    }

    const [id] = await db('shifts').insert({
      tenant_id: tenantId,
      start_time: toMySQLDateTime(start_time),
      end_time: toMySQLDateTime(end_time) || null,
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

router.post('/clock-in', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { user_id, project_id, shift_id } = req.body;
    if (!user_id || !project_id) {
      return res.status(422).json({ detail: 'user_id and project_id are required' });
    }
    const user = await db('users').where({ id: user_id, tenant_id: tenantId }).first();
    if (!user) return res.status(404).json({ detail: 'User not found' });
    const project = await db('projects').where({ id: project_id, tenant_id: tenantId }).first();
    if (!project) return res.status(404).json({ detail: 'Project not found' });

    const existing = await db('clock_sessions')
      .where({ user_id, tenant_id: tenantId })
      .whereNull('clocked_out_at')
      .first();
    if (existing) {
      return res.status(409).json({ detail: 'Already clocked in. Please clock out first.' });
    }

    let shiftIdRef = null;
    if (shift_id) {
      const shift = await db('shifts').where({ id: shift_id, tenant_id: tenantId }).first();
      if (shift) shiftIdRef = shift_id;
    }

    const [id] = await db('clock_sessions').insert({
      tenant_id: tenantId,
      user_id,
      shift_id: shiftIdRef,
      project_id,
      clocked_in_at: db.raw('NOW()'),
      clocked_out_at: null,
    });

    const session = await db('clock_sessions').where({ id }).first();
    res.json(clockSessionToShiftLike(session));
  } catch (err) {
    console.error('Clock-in error:', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

router.post('/clock-out', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { user_id } = req.body;
    if (!user_id) {
      return res.status(422).json({ detail: 'user_id is required' });
    }

    const active = await db('clock_sessions')
      .where({ user_id, tenant_id: tenantId })
      .whereNull('clocked_out_at')
      .first();
    if (!active) {
      return res.status(404).json({ detail: 'No active clock session to clock out from.' });
    }

    await db('clock_sessions').where({ id: active.id }).update({ clocked_out_at: db.raw('NOW()') });

    const session = await db('clock_sessions').where({ id: active.id }).first();
    res.json(clockSessionToShiftLike(session));
  } catch (err) {
    console.error('Clock-out error:', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

router.patch('/:shiftId', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const shift = await db('shifts').where({ id: req.params.shiftId, tenant_id: tenantId }).first();
    if (!shift) return res.status(404).json({ detail: 'Shift not found' });

    const updates = {};
    for (const key of ['start_time', 'end_time', 'user_id', 'project_id', 'is_break', 'break_type']) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    if (updates.start_time !== undefined) updates.start_time = toMySQLDateTime(updates.start_time);
    if (updates.end_time !== undefined) updates.end_time = toMySQLDateTime(updates.end_time);
    if (updates.is_break !== undefined) {
      updates.is_break = (updates.is_break === true || updates.is_break === 1) ? 1 : 0;
      if (updates.is_break === 0) updates.break_type = null;
    }

    if (Object.keys(updates).length > 0) {
      await db('shifts').where({ id: req.params.shiftId, tenant_id: tenantId }).update(updates);
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
    const tenantId = req.user.tenant_id;
    const shift = await db('shifts').where({ id: req.params.shiftId, tenant_id: tenantId }).first();
    if (!shift) return res.status(404).json({ detail: 'Shift not found' });

    await db('shifts').where({ id: req.params.shiftId, tenant_id: tenantId }).del();
    res.status(204).send();
  } catch (err) {
    console.error('Delete shift error:', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

export default router;
