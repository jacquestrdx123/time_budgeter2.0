import Knex from 'knex';
import { getDatabasePath } from './config.js';

const dbPath = getDatabasePath();

const knex = Knex({
  client: 'better-sqlite3',
  connection: { filename: dbPath },
  useNullAsDefault: true,
});

export async function initDatabase() {
  if (!(await knex.schema.hasTable('users'))) {
    await knex.schema.createTable('users', (t) => {
      t.increments('id').primary();
      t.string('name', 255).notNullable();
      t.string('email', 255).notNullable().unique();
      t.string('password_hash', 255).notNullable();
      t.datetime('created_at').notNullable().defaultTo(knex.fn.now());
    });
  }

  if (!(await knex.schema.hasTable('projects'))) {
    await knex.schema.createTable('projects', (t) => {
      t.increments('id').primary();
      t.string('name', 255).notNullable();
      t.string('description', 1024).nullable();
      t.datetime('created_at').notNullable().defaultTo(knex.fn.now());
    });
  }

  if (!(await knex.schema.hasTable('tasks'))) {
    await knex.schema.createTable('tasks', (t) => {
      t.increments('id').primary();
      t.string('title', 255).notNullable();
      t.string('description', 1024).nullable();
      t.string('status', 64).notNullable().defaultTo('pending');
      t.integer('project_id').notNullable().references('id').inTable('projects');
      t.integer('user_id').nullable().references('id').inTable('users');
      t.datetime('created_at').notNullable().defaultTo(knex.fn.now());
    });
  }

  if (!(await knex.schema.hasTable('shifts'))) {
    await knex.schema.createTable('shifts', (t) => {
      t.increments('id').primary();
      t.datetime('start_time').notNullable();
      t.datetime('end_time').nullable();
      t.integer('user_id').notNullable().references('id').inTable('users');
      t.integer('project_id').nullable().references('id').inTable('projects');
      t.boolean('is_break').notNullable().defaultTo(false);
      t.string('break_type', 255).nullable();
      t.boolean('reminder_sent').notNullable().defaultTo(false);
      t.datetime('created_at').notNullable().defaultTo(knex.fn.now());
    });
  }

  // Migration: make end_time nullable for existing databases (clock in/out support)
  try {
    const colInfo = await knex.raw("PRAGMA table_info('shifts')");
    const endTimeCol = colInfo.find((c) => c.name === 'end_time');
    if (endTimeCol && endTimeCol.notnull === 1) {
      await knex.raw('CREATE TABLE shifts_backup AS SELECT * FROM shifts');
      await knex.raw('DROP TABLE shifts');
      await knex.raw(`
        CREATE TABLE shifts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          start_time DATETIME NOT NULL,
          end_time DATETIME,
          user_id INTEGER NOT NULL REFERENCES users(id),
          project_id INTEGER NOT NULL REFERENCES projects(id),
          reminder_sent BOOLEAN NOT NULL DEFAULT 0,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await knex.raw('INSERT INTO shifts SELECT * FROM shifts_backup');
      await knex.raw('DROP TABLE shifts_backup');
      console.log('Migration: shifts.end_time made nullable');
    }
  } catch (migrationErr) {
    console.error('Migration (shifts.end_time nullable) skipped or failed:', migrationErr.message);
  }

  // Migration: add is_break, break_type columns and make project_id nullable
  try {
    const hasIsBreak = await knex.schema.hasColumn('shifts', 'is_break');
    if (!hasIsBreak) {
      await knex.raw('CREATE TABLE shifts_backup2 AS SELECT * FROM shifts');
      await knex.raw('DROP TABLE shifts');
      await knex.raw(`
        CREATE TABLE shifts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          start_time DATETIME NOT NULL,
          end_time DATETIME,
          user_id INTEGER NOT NULL REFERENCES users(id),
          project_id INTEGER REFERENCES projects(id),
          is_break BOOLEAN NOT NULL DEFAULT 0,
          break_type VARCHAR(255),
          reminder_sent BOOLEAN NOT NULL DEFAULT 0,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await knex.raw(`
        INSERT INTO shifts (id, start_time, end_time, user_id, project_id, is_break, break_type, reminder_sent, created_at)
        SELECT id, start_time, end_time, user_id, project_id, 0, NULL, reminder_sent, created_at
        FROM shifts_backup2
      `);
      await knex.raw('DROP TABLE shifts_backup2');
      console.log('Migration: added is_break, break_type columns; project_id made nullable');
    }
  } catch (migrationErr) {
    console.error('Migration (shifts break columns) skipped or failed:', migrationErr.message);
  }

  if (!(await knex.schema.hasTable('notifications'))) {
    await knex.schema.createTable('notifications', (t) => {
      t.increments('id').primary();
      t.integer('user_id').notNullable().references('id').inTable('users');
      t.string('title', 255).notNullable();
      t.text('body').notNullable();
      t.string('notification_type', 64).notNullable().defaultTo('general');
      t.string('channel', 32).notNullable().defaultTo('all');
      t.boolean('is_read').notNullable().defaultTo(false);
      t.boolean('sent_push').notNullable().defaultTo(false);
      t.boolean('sent_email').notNullable().defaultTo(false);
      t.datetime('created_at').notNullable().defaultTo(knex.fn.now());
    });
  }

  if (!(await knex.schema.hasTable('notification_preferences'))) {
    await knex.schema.createTable('notification_preferences', (t) => {
      t.increments('id').primary();
      t.integer('user_id').notNullable().unique().references('id').inTable('users');
      t.boolean('push_enabled').notNullable().defaultTo(true);
      t.boolean('email_enabled').notNullable().defaultTo(true);
      t.boolean('task_assigned').notNullable().defaultTo(true);
      t.boolean('task_updated').notNullable().defaultTo(true);
      t.boolean('shift_reminder').notNullable().defaultTo(true);
      t.boolean('project_updated').notNullable().defaultTo(true);
    });
  }

  if (!(await knex.schema.hasTable('fcm_devices'))) {
    await knex.schema.createTable('fcm_devices', (t) => {
      t.increments('id').primary();
      t.integer('user_id').notNullable().references('id').inTable('users');
      t.string('token', 512).notNullable().unique();
      t.string('device_name', 255).nullable();
      t.datetime('created_at').notNullable().defaultTo(knex.fn.now());
    });
  }

  if (!(await knex.schema.hasTable('system_settings'))) {
    await knex.schema.createTable('system_settings', (t) => {
      t.string('key', 255).primary();
      t.text('value').notNullable();
      t.string('label', 255).notNullable();
      t.string('description', 1024).nullable();
      t.string('setting_type', 64).notNullable().defaultTo('string');
      t.datetime('updated_at').notNullable().defaultTo(knex.fn.now());
    });
  }
}

export default knex;
