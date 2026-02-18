import { Router } from 'express';
import db from '../database.js';
import { authenticate } from '../auth.js';
import { seedDefaults, seedDefaultsForTenant } from '../seedSettings.js';

const router = Router();
router.use(authenticate);

export { seedDefaults, seedDefaultsForTenant };

router.get('/', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const settings = await db('system_settings').where({ tenant_id: tenantId }).orderBy('key');
    res.json(settings);
  } catch (err) {
    console.error('List settings error:', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

router.get('/:key', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const setting = await db('system_settings').where({ tenant_id: tenantId, key: req.params.key }).first();
    if (!setting) return res.status(404).json({ detail: 'Setting not found' });
    res.json(setting);
  } catch (err) {
    console.error('Get setting error:', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

router.put('/:key', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const setting = await db('system_settings').where({ tenant_id: tenantId, key: req.params.key }).first();
    if (!setting) return res.status(404).json({ detail: 'Setting not found' });

    const value = req.body?.value;
    if (value === undefined) {
      return res.status(422).json({ detail: 'value is required' });
    }

    await db('system_settings')
      .where({ tenant_id: tenantId, key: req.params.key })
      .update({
        value: String(value),
        updated_at: db.raw('NOW()'),
      });

    const updated = await db('system_settings').where({ tenant_id: tenantId, key: req.params.key }).first();
    res.json(updated);
  } catch (err) {
    console.error('Update setting error:', err);
    const detail = process.env.NODE_ENV === 'development'
      ? (err.message || 'Internal server error')
      : 'Internal server error';
    res.status(500).json({ detail });
  }
});

router.post('/', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { key, value, label, description, setting_type } = req.body;
    if (!key || !value || !label) {
      return res.status(422).json({ detail: 'key, value, and label are required' });
    }

    const existing = await db('system_settings').where({ tenant_id: tenantId, key }).first();
    if (existing) {
      return res.status(409).json({ detail: 'Setting already exists' });
    }

    await db('system_settings').insert({
      tenant_id: tenantId,
      key,
      value,
      label,
      description: description || null,
      setting_type: setting_type || 'string',
    });

    const setting = await db('system_settings').where({ tenant_id: tenantId, key }).first();
    res.status(201).json(setting);
  } catch (err) {
    console.error('Create setting error:', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

router.delete('/:key', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const setting = await db('system_settings').where({ tenant_id: tenantId, key: req.params.key }).first();
    if (!setting) return res.status(404).json({ detail: 'Setting not found' });

    await db('system_settings').where({ tenant_id: tenantId, key: req.params.key }).del();
    res.status(204).send();
  } catch (err) {
    console.error('Delete setting error:', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

export default router;
