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
      t.datetime('end_time').notNullable();
      t.integer('user_id').notNullable().references('id').inTable('users');
      t.integer('project_id').notNullable().references('id').inTable('projects');
      t.boolean('reminder_sent').notNullable().defaultTo(false);
      t.datetime('created_at').notNullable().defaultTo(knex.fn.now());
    });
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
