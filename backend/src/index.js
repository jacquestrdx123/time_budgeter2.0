import express from 'express';
import cors from 'cors';
import { initDatabase } from './database.js';
import { seedDefaults } from './routes/settings.js';
import { startScheduler, stopScheduler } from './services/scheduler.js';

import authRouter from './routes/auth.js';
import usersRouter from './routes/users.js';
import projectsRouter from './routes/projects.js';
import tasksRouter from './routes/tasks.js';
import shiftsRouter from './routes/shifts.js';
import notificationsRouter from './routes/notifications.js';
import settingsRouter from './routes/settings.js';

const app = express();
const PORT = parseInt(process.env.PORT || '8000', 10);

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

app.use(express.json());
app.use(
  cors({
    origin: [
      'http://localhost:8080',
      'http://localhost:8081',
      'http://localhost:5173',
      'https://proxy.heartbeatnetworks.com',
      'https://time_budgeter20-0aprwuxe.on-forge.com',
    ],
    credentials: true,
  })
);

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

app.use('/auth', authRouter);
app.use('/users', usersRouter);
app.use('/projects', projectsRouter);
app.use('/tasks', tasksRouter);
app.use('/shifts', shiftsRouter);
app.use('/notifications', notificationsRouter);
app.use('/settings', settingsRouter);

// ---------------------------------------------------------------------------
// Startup
// ---------------------------------------------------------------------------

async function main() {
  await initDatabase();
  console.log('Database tables initialised');

  await seedDefaults();
  console.log('Default settings seeded');

  startScheduler();

  const server = app.listen(PORT, () => {
    console.log(`TimeBudget API running on http://localhost:${PORT}`);
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log('\nShutting down…');
    stopScheduler();
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
