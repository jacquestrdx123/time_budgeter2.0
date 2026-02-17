import { Router } from 'express';
import db from '../database.js';
import { authenticate } from '../auth.js';
import { getOrCreatePreferences, sendNotification } from '../services/notificationService.js';

const router = Router();

// All notification routes require authentication
router.use(authenticate);

// ---------------------------------------------------------------------------
// Notifications CRUD
// ---------------------------------------------------------------------------

router.get('/', async (req, res) => {
  try {
    let query = db('notifications').where({ user_id: req.user.id });
    if (req.query.unread_only === 'true') {
      query = query.where({ is_read: false });
    }
    const notifications = await query.orderBy('created_at', 'desc');
    res.json(notifications);
  } catch (err) {
    console.error('List notifications error:', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

router.get('/unread-count', async (req, res) => {
  try {
    const [{ count }] = await db('notifications')
      .where({ user_id: req.user.id, is_read: false })
      .count('* as count');
    res.json({ unread_count: count });
  } catch (err) {
    console.error('Unread count error:', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

router.get('/preferences/me', async (req, res) => {
  try {
    const prefs = await getOrCreatePreferences(req.user.id);
    res.json(prefs);
  } catch (err) {
    console.error('Get preferences error:', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

router.put('/preferences/me', async (req, res) => {
  try {
    const prefs = await getOrCreatePreferences(req.user.id);

    const updates = {};
    for (const key of ['push_enabled', 'email_enabled', 'task_assigned', 'task_updated', 'shift_reminder', 'project_updated']) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    if (Object.keys(updates).length > 0) {
      await db('notification_preferences').where({ id: prefs.id }).update(updates);
    }

    const updated = await db('notification_preferences').where({ id: prefs.id }).first();
    res.json(updated);
  } catch (err) {
    console.error('Update preferences error:', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

router.get('/devices/me', async (req, res) => {
  try {
    const devices = await db('fcm_devices').where({ user_id: req.user.id });
    res.json(devices);
  } catch (err) {
    console.error('List devices error:', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

router.post('/devices', async (req, res) => {
  try {
    const { token, device_name } = req.body;
    if (!token) return res.status(422).json({ detail: 'token is required' });

    const existing = await db('fcm_devices')
      .where({ token, user_id: req.user.id })
      .first();
    if (existing) return res.json(existing);

    const [id] = await db('fcm_devices').insert({
      user_id: req.user.id,
      token,
      device_name: device_name || null,
    });

    const device = await db('fcm_devices').where({ id }).first();
    res.json(device);
  } catch (err) {
    console.error('Register device error:', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

router.delete('/devices/:deviceId', async (req, res) => {
  try {
    const device = await db('fcm_devices')
      .where({ id: req.params.deviceId, user_id: req.user.id })
      .first();
    if (!device) return res.status(404).json({ detail: 'Device not found' });

    await db('fcm_devices').where({ id: req.params.deviceId }).del();
    res.status(204).send();
  } catch (err) {
    console.error('Remove device error:', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

router.get('/:notificationId', async (req, res) => {
  try {
    const notification = await db('notifications')
      .where({ id: req.params.notificationId, user_id: req.user.id })
      .first();
    if (!notification) return res.status(404).json({ detail: 'Notification not found' });
    res.json(notification);
  } catch (err) {
    console.error('Get notification error:', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

router.patch('/:notificationId/read', async (req, res) => {
  try {
    const notification = await db('notifications')
      .where({ id: req.params.notificationId, user_id: req.user.id })
      .first();
    if (!notification) return res.status(404).json({ detail: 'Notification not found' });

    await db('notifications').where({ id: req.params.notificationId }).update({ is_read: true });

    const updated = await db('notifications').where({ id: req.params.notificationId }).first();
    res.json(updated);
  } catch (err) {
    console.error('Mark as read error:', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

router.post('/mark-all-read', async (req, res) => {
  try {
    await db('notifications')
      .where({ user_id: req.user.id, is_read: false })
      .update({ is_read: true });
    res.json({ detail: 'All notifications marked as read' });
  } catch (err) {
    console.error('Mark all read error:', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

router.delete('/:notificationId', async (req, res) => {
  try {
    const notification = await db('notifications')
      .where({ id: req.params.notificationId, user_id: req.user.id })
      .first();
    if (!notification) return res.status(404).json({ detail: 'Notification not found' });

    await db('notifications').where({ id: req.params.notificationId }).del();
    res.status(204).send();
  } catch (err) {
    console.error('Delete notification error:', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

router.post('/send', async (req, res) => {
  try {
    const { user_id, title, body, notification_type, data } = req.body;
    if (!user_id || !title || !body) {
      return res.status(422).json({ detail: 'user_id, title, and body are required' });
    }

    const targetUser = await db('users').where({ id: user_id }).first();
    if (!targetUser) return res.status(404).json({ detail: 'Target user not found' });

    const notification = await sendNotification({
      userId: user_id,
      title,
      body,
      notificationType: notification_type || 'general',
      data,
    });
    res.json(notification);
  } catch (err) {
    console.error('Send notification error:', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

export default router;
