export async function up(knex) {
  await knex.schema.createTable('tenants', (t) => {
    t.increments('id').primary();
    t.string('name', 255).nullable().defaultTo('My Team');
    t.dateTime('created_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('users', (t) => {
    t.increments('id').primary();
    t.integer('tenant_id').unsigned().notNullable().references('id').inTable('tenants');
    t.string('name', 255).notNullable();
    t.string('email', 255).notNullable();
    t.string('password_hash', 255).notNullable();
    t.string('role', 64).notNullable().defaultTo('member');
    t.dateTime('created_at').notNullable().defaultTo(knex.fn.now());
    t.unique(['tenant_id', 'email']);
  });

  await knex.schema.createTable('projects', (t) => {
    t.increments('id').primary();
    t.integer('tenant_id').unsigned().notNullable().references('id').inTable('tenants');
    t.string('name', 255).notNullable();
    t.string('description', 1024).nullable();
    t.dateTime('created_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('tasks', (t) => {
    t.increments('id').primary();
    t.integer('tenant_id').unsigned().notNullable().references('id').inTable('tenants');
    t.string('title', 255).notNullable();
    t.string('description', 1024).nullable();
    t.string('status', 64).notNullable().defaultTo('pending');
    t.integer('project_id').unsigned().notNullable().references('id').inTable('projects');
    t.integer('user_id').unsigned().nullable().references('id').inTable('users');
    t.dateTime('created_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('shifts', (t) => {
    t.increments('id').primary();
    t.integer('tenant_id').unsigned().notNullable().references('id').inTable('tenants');
    t.dateTime('start_time').notNullable();
    t.dateTime('end_time').nullable();
    t.integer('user_id').unsigned().notNullable().references('id').inTable('users');
    t.integer('project_id').unsigned().nullable().references('id').inTable('projects');
    t.boolean('is_break').notNullable().defaultTo(false);
    t.string('break_type', 255).nullable();
    t.boolean('reminder_sent').notNullable().defaultTo(false);
    t.dateTime('created_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('notifications', (t) => {
    t.increments('id').primary();
    t.integer('tenant_id').unsigned().notNullable().references('id').inTable('tenants');
    t.integer('user_id').unsigned().notNullable().references('id').inTable('users');
    t.string('title', 255).notNullable();
    t.text('body').notNullable();
    t.string('notification_type', 64).notNullable().defaultTo('general');
    t.string('channel', 32).notNullable().defaultTo('all');
    t.boolean('is_read').notNullable().defaultTo(false);
    t.boolean('sent_push').notNullable().defaultTo(false);
    t.boolean('sent_email').notNullable().defaultTo(false);
    t.dateTime('created_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('notification_preferences', (t) => {
    t.increments('id').primary();
    t.integer('user_id').unsigned().notNullable().unique().references('id').inTable('users');
    t.boolean('push_enabled').notNullable().defaultTo(true);
    t.boolean('email_enabled').notNullable().defaultTo(true);
    t.boolean('task_assigned').notNullable().defaultTo(true);
    t.boolean('task_updated').notNullable().defaultTo(true);
    t.boolean('shift_reminder').notNullable().defaultTo(true);
    t.boolean('project_updated').notNullable().defaultTo(true);
  });

  await knex.schema.createTable('fcm_devices', (t) => {
    t.increments('id').primary();
    t.integer('user_id').unsigned().notNullable().references('id').inTable('users');
    t.string('token', 512).notNullable().unique();
    t.string('device_name', 255).nullable();
    t.dateTime('created_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('password_reset_tokens', (t) => {
    t.increments('id').primary();
    t.integer('user_id').unsigned().notNullable().references('id').inTable('users');
    t.string('token', 64).notNullable().unique();
    t.dateTime('expires_at').notNullable();
    t.dateTime('created_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('system_settings', (t) => {
    t.integer('tenant_id').unsigned().notNullable().references('id').inTable('tenants');
    t.string('key', 255).notNullable();
    t.text('value').notNullable();
    t.string('label', 255).notNullable();
    t.string('description', 1024).nullable();
    t.string('setting_type', 64).notNullable().defaultTo('string');
    t.dateTime('updated_at').notNullable().defaultTo(knex.fn.now());
    t.primary(['tenant_id', 'key']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('system_settings');
  await knex.schema.dropTableIfExists('password_reset_tokens');
  await knex.schema.dropTableIfExists('fcm_devices');
  await knex.schema.dropTableIfExists('notification_preferences');
  await knex.schema.dropTableIfExists('notifications');
  await knex.schema.dropTableIfExists('shifts');
  await knex.schema.dropTableIfExists('tasks');
  await knex.schema.dropTableIfExists('projects');
  await knex.schema.dropTableIfExists('users');
  await knex.schema.dropTableIfExists('tenants');
}
