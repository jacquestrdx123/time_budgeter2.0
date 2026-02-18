import db from './database.js';

const DEFAULTS = [
  { key: 'day_start_hour', value: '8', label: 'Work Day Start Hour', description: 'The hour the work day begins (24h format).', setting_type: 'number' },
  { key: 'day_end_hour', value: '16', label: 'Work Day End Hour', description: 'The hour the work day ends (24h format).', setting_type: 'number' },
  { key: 'day_hours', value: '8', label: 'Work Day Length (hours)', description: 'Total working hours in a standard day.', setting_type: 'number' },
  { key: 'company_name', value: 'Our Team', label: 'Company / Team Name', description: 'Displayed in the team schedule header.', setting_type: 'string' },
  { key: 'week_start', value: 'monday', label: 'Week Starts On', description: 'First day of the working week.', setting_type: 'select:monday,tuesday,wednesday,thursday,friday,saturday,sunday' },
];

export async function seedDefaultsForTenant(tenantId) {
  const existing = await db('system_settings').where({ tenant_id: tenantId }).select('key');
  const existingKeys = new Set(existing.map((s) => s.key));
  for (const d of DEFAULTS) {
    if (!existingKeys.has(d.key)) {
      await db('system_settings').insert({ tenant_id: tenantId, ...d });
    }
  }
}

export async function seedDefaults() {
  const tenants = await db('tenants').select('id');
  for (const t of tenants) {
    await seedDefaultsForTenant(t.id);
  }
}
