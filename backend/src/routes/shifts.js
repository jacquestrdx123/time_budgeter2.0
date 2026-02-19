import { Router } from 'express';
import db from '../database.js';
import { authenticate } from '../auth.js';

const router = Router();
router.use(authenticate);

const MYSQL_DATETIME_RE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function toMySQLDateTime(date) {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

function normalizeDateParam(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return DATE_RE.test(trimmed) ? trimmed : null;
}

function normalizeDateTime(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (MYSQL_DATETIME_RE.test(trimmed)) return trimmed;
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) return toMySQLDateTime(parsed);
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return toMySQLDateTime(parsed);
}

router.get('/', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    let query = db('shifts').where({ tenant_id: tenantId });

    if (req.query.user_id) {
      query = query.where('user_id', req.query.user_id);
    }

    if (req.query.date) {
      const day = normalizeDateParam(req.query.date);
      if (!day) {
        return res.status(422).json({ detail: 'date must be in YYYY-MM-DD format' });
      }
      const dayStart = `${day} 00:00:00`;
      const dayEnd = `${day} 23:59:59`;
      query = query.where('start_time', '>=', dayStart).where('start_time', '<=', dayEnd);
    } else if (req.query.date_from && req.query.date_to) {
      const rangeDateFrom = normalizeDateParam(req.query.date_from);
      const rangeDateTo = normalizeDateParam(req.query.date_to);
      if (!rangeDateFrom || !rangeDateTo) {
        return res.status(422).json({ detail: 'date_from and date_to must be in YYYY-MM-DD format' });
      }
      const rangeStart = `${rangeDateFrom} 00:00:00`;
      const rangeEnd = `${rangeDateTo} 23:59:59`;
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
    const shift = await db('shifts')
      .where({ user_id: req.params.userId, tenant_id: tenantId })
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
    const normalizedStartTime = normalizeDateTime(start_time);
    const normalizedEndTime = normalizeDateTime(end_time);

    if (!start_time || !user_id) {
      return res.status(422).json({ detail: 'start_time and user_id are required' });
    }
    if (!normalizedStartTime) {
      return res.status(422).json({ detail: 'start_time must be a valid datetime' });
    }
    if (end_time !== undefined && end_time !== null && end_time !== '' && !normalizedEndTime) {
      return res.status(422).json({ detail: 'end_time must be a valid datetime' });
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
      start_time: normalizedStartTime,
      end_time: normalizedEndTime,
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
    const { user_id, project_id } = req.body;
    if (!user_id || !project_id) {
      return res.status(422).json({ detail: 'user_id and project_id are required' });
    }
    const user = await db('users').where({ id: user_id, tenant_id: tenantId }).first();
    if (!user) return res.status(404).json({ detail: 'User not found' });
    const project = await db('projects').where({ id: project_id, tenant_id: tenantId }).first();
    if (!project) return res.status(404).json({ detail: 'Project not found' });

    const existing = await db('shifts')
      .where({ user_id, tenant_id: tenantId })
      .whereNull('end_time')
      .first();
    if (existing) {
      return res.status(409).json({ detail: 'Already clocked in. Please clock out first.' });
    }

    const [id] = await db('shifts').insert({
      tenant_id: tenantId,
      start_time: db.raw('NOW()'),
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

router.post('/clock-out', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { user_id } = req.body;
    if (!user_id) {
      return res.status(422).json({ detail: 'user_id is required' });
    }

    const active = await db('shifts')
      .where({ user_id, tenant_id: tenantId })
      .whereNull('end_time')
      .first();
    if (!active) {
      return res.status(404).json({ detail: 'No active shift to clock out from.' });
    }

    await db('shifts').where({ id: active.id }).update({ end_time: db.raw('NOW()') });

    const shift = await db('shifts').where({ id: active.id }).first();
    res.json(shift);
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
    if (updates.start_time !== undefined) {
      const normalizedStartTime = normalizeDateTime(updates.start_time);
      if (!normalizedStartTime) {
        return res.status(422).json({ detail: 'start_time must be a valid datetime' });
      }
      updates.start_time = normalizedStartTime;
    }
    if (updates.end_time !== undefined) {
      const normalizedEndTime = normalizeDateTime(updates.end_time);
      if (updates.end_time !== null && updates.end_time !== '' && !normalizedEndTime) {
        return res.status(422).json({ detail: 'end_time must be a valid datetime' });
      }
      updates.end_time = normalizedEndTime;
    }
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
