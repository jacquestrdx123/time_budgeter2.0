import { Router } from 'express';
import db from '../database.js';

const router = Router();

const DEFAULTS = [
  {
    key: 'day_start_hour',
    value: '8',
    label: 'Work Day Start Hour',
    description: 'The hour the work day begins (24h format).',
    setting_type: 'number',
  },
  {
    key: 'day_end_hour',
    value: '16',
    label: 'Work Day End Hour',
    description: 'The hour the work day ends (24h format).',
    setting_type: 'number',
  },
  {
    key: 'day_hours',
    value: '8',
    label: 'Work Day Length (hours)',
    description: 'Total working hours in a standard day.',
    setting_type: 'number',
  },
  {
    key: 'company_name',
    value: 'Our Team',
    label: 'Company / Team Name',
    description: 'Displayed in the team schedule header.',
    setting_type: 'string',
  },
  {
    key: 'week_start',
    value: 'monday',
    label: 'Week Starts On',
    description: 'First day of the working week.',
    setting_type: 'select:monday,tuesday,wednesday,thursday,friday,saturday,sunday',
  },
];

export async function seedDefaults() {
  const existing = await db('system_settings').select('key');
  const existingKeys = new Set(existing.map((s) => s.key));

  for (const d of DEFAULTS) {
    if (!existingKeys.has(d.key)) {
      await db('system_settings').insert(d);
    }
  }
}

router.get('/', async (_req, res) => {
  try {
    const settings = await db('system_settings').orderBy('key');
    res.json(settings);
  } catch (err) {
    console.error('List settings error:', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

router.get('/:key', async (req, res) => {
  try {
    const setting = await db('system_settings').where({ key: req.params.key }).first();
    if (!setting) return res.status(404).json({ detail: 'Setting not found' });
    res.json(setting);
  } catch (err) {
    console.error('Get setting error:', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

router.put('/:key', async (req, res) => {
  try {
    const setting = await db('system_settings').where({ key: req.params.key }).first();
    if (!setting) return res.status(404).json({ detail: 'Setting not found' });

    await db('system_settings')
      .where({ key: req.params.key })
      .update({ value: req.body.value, updated_at: new Date().toISOString() });

    const updated = await db('system_settings').where({ key: req.params.key }).first();
    res.json(updated);
  } catch (err) {
    console.error('Update setting error:', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { key, value, label, description, setting_type } = req.body;
    if (!key || !value || !label) {
      return res.status(422).json({ detail: 'key, value, and label are required' });
    }

    const existing = await db('system_settings').where({ key }).first();
    if (existing) {
      return res.status(409).json({ detail: 'Setting already exists' });
    }

    await db('system_settings').insert({
      key,
      value,
      label,
      description: description || null,
      setting_type: setting_type || 'string',
    });

    const setting = await db('system_settings').where({ key }).first();
    res.status(201).json(setting);
  } catch (err) {
    console.error('Create setting error:', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

router.delete('/:key', async (req, res) => {
  try {
    const setting = await db('system_settings').where({ key: req.params.key }).first();
    if (!setting) return res.status(404).json({ detail: 'Setting not found' });

    await db('system_settings').where({ key: req.params.key }).del();
    res.status(204).send();
  } catch (err) {
    console.error('Delete setting error:', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

export default router;
