import { Router } from 'express';
import db from '../database.js';
import { authenticate } from '../auth.js';

/** Map clock_session row to shift-like shape (start_time, end_time) for frontend */
function toShiftLike(row) {
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
    let query = db('clock_sessions').where({ tenant_id: tenantId });

    if (req.query.user_id) {
      query = query.where('user_id', req.query.user_id);
    }

    if (req.query.date) {
      const dayStart = `${req.query.date}T00:00:00.000`;
      const dayEnd = `${req.query.date}T23:59:59.999`;
      query = query
        .where('clocked_in_at', '>=', dayStart)
        .where('clocked_in_at', '<=', dayEnd);
    } else if (req.query.date_from && req.query.date_to) {
      const rangeStart = `${req.query.date_from}T00:00:00.000`;
      const rangeEnd = `${req.query.date_to}T23:59:59.999`;
      query = query
        .where('clocked_in_at', '>=', rangeStart)
        .where('clocked_in_at', '<=', rangeEnd);
    }

    const rows = await query.orderBy('clocked_in_at', 'desc');
    res.json(rows.map(toShiftLike));
  } catch (err) {
    console.error('List clock sessions error:', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

export default router;
