export async function up(knex) {
  await knex.schema.alterTable('notification_preferences', (t) => {
    t.boolean('custom_reminder').notNullable().defaultTo(true);
  });
}

export async function down(knex) {
  await knex.schema.alterTable('notification_preferences', (t) => {
    t.dropColumn('custom_reminder');
  });
}
