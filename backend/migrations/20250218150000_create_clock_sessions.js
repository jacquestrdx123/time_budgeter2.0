export async function up(knex) {
  await knex.schema.createTable('clock_sessions', (t) => {
    t.increments('id').primary();
    t.integer('tenant_id').unsigned().notNullable().references('id').inTable('tenants');
    t.integer('user_id').unsigned().notNullable().references('id').inTable('users');
    t.integer('shift_id').unsigned().nullable().references('id').inTable('shifts');
    t.integer('project_id').unsigned().nullable().references('id').inTable('projects');
    t.dateTime('clocked_in_at').notNullable();
    t.dateTime('clocked_out_at').nullable();
    t.dateTime('created_at').notNullable().defaultTo(knex.fn.now());
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('clock_sessions');
}
