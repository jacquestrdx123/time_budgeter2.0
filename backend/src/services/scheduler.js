import cron from 'node-cron';
import config from '../config.js';
import db from '../database.js';
import { sendNotification } from './notificationService.js';

let cronTask = null;

async function checkUpcomingShifts() {
  try {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + config.SHIFT_REMINDER_MINUTES * 60 * 1000);

    const upcoming = await db('shifts')
      .where('start_time', '>', now.toISOString())
      .where('start_time', '<=', windowEnd.toISOString())
      .where('reminder_sent', false);

    if (upcoming.length === 0) return;

    console.log(`Found ${upcoming.length} shift(s) starting within ${config.SHIFT_REMINDER_MINUTES} minutes`);

    for (const shift of upcoming) {
      const project = await db('projects').where({ id: shift.project_id }).first();
      const projectName = project ? project.name : 'Unknown project';
      const startDate = new Date(shift.start_time);
      const startStr = startDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

      const title = 'Shift starting soon';
      const body = `Your shift on ${projectName} starts at ${startStr} (in ~${config.SHIFT_REMINDER_MINUTES} min).`;

      try {
        await sendNotification({
          userId: shift.user_id,
          title,
          body,
          notificationType: 'shift_reminder',
          data: {
            shift_id: shift.id,
            project_id: shift.project_id,
            start_time: shift.start_time,
          },
        });

        await db('shifts').where({ id: shift.id }).update({ reminder_sent: true });
        console.log(`Reminder sent for shift ${shift.id} (user ${shift.user_id}, project ${projectName} at ${startStr})`);
      } catch (err) {
        console.error(`Failed to send reminder for shift ${shift.id}:`, err.message);
      }
    }
  } catch (err) {
    console.error('Shift reminder check failed:', err.message);
  }
}

export function startScheduler() {
  if (!config.SCHEDULER_ENABLED) {
    console.log('Scheduler disabled via SCHEDULER_ENABLED=false');
    return;
  }

  const intervalSec = config.SCHEDULER_CHECK_INTERVAL_SECONDS;

  // node-cron uses cron expressions; for second-level intervals we use setInterval
  cronTask = setInterval(checkUpcomingShifts, intervalSec * 1000);

  // Run once immediately
  checkUpcomingShifts();

  console.log(
    `Shift reminder scheduler started (checking every ${intervalSec}s, reminder window ${config.SHIFT_REMINDER_MINUTES} min)`
  );
}

export function stopScheduler() {
  if (cronTask) {
    clearInterval(cronTask);
    cronTask = null;
    console.log('Scheduler shut down');
  }
}
