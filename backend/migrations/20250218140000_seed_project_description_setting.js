/**
 * Ensures project_description setting exists for all tenants.
 * New tenants get it via seedSettings; this migration backfills existing tenants
 * that may have been created before the setting was added to defaults.
 */
export async function up(knex) {
  const tenants = await knex('tenants').select('id');
  for (const { id: tenantId } of tenants) {
    const existing = await knex('system_settings')
      .where({ tenant_id: tenantId, key: 'project_description' })
      .first();
    if (!existing) {
      await knex('system_settings').insert({
        tenant_id: tenantId,
        key: 'project_description',
        value: 'Project',
        label: 'Project Label',
        description: 'Custom label for "Project" shown in menus, dashboards, and forms (e.g. Client, Engagement). Singular form; plural is auto-derived.',
        setting_type: 'string',
        updated_at: knex.fn.now(),
      });
    }
  }
}

export async function down(knex) {
  // Optional: remove project_description if we want a clean rollback.
  // Leaving it in place is usually safer for data integrity.
  // await knex('system_settings').where({ key: 'project_description' }).del();
}
