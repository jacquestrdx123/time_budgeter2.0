export async function up(knex) {
  await knex.schema.createTable('reminders', (t) => {
    t.increments('id').primary();
    t.integer('tenant_id').unsigned().notNullable().references('id').inTable('tenants');
    t.integer('user_id').unsigned().notNullable().references('id').inTable('users');
    t.string('title', 255).notNullable();
    t.text('description').nullable();
    t.dateTime('trigger_at').notNullable();
    t.boolean('sent').notNullable().defaultTo(false);
    t.dateTime('created_at').notNullable().defaultTo(knex.fn.now());
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('reminders');
}
