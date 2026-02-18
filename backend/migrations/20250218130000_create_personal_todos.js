export async function up(knex) {
  await knex.schema.createTable('personal_todos', (t) => {
    t.increments('id').primary();
    t.integer('tenant_id').unsigned().notNullable().references('id').inTable('tenants');
    t.integer('user_id').unsigned().notNullable().references('id').inTable('users');
    t.string('title', 255).notNullable();
    t.string('description', 1024).nullable();
    t.string('status', 64).notNullable().defaultTo('pending');
    t.dateTime('created_at').notNullable().defaultTo(knex.fn.now());
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('personal_todos');
}
