import Knex from 'knex';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import config from './config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const knex = Knex({
  client: 'mysql2',
  connection: {
    host: config.MYSQL_HOST,
    port: config.MYSQL_PORT,
    user: config.MYSQL_USER,
    password: config.MYSQL_PASSWORD,
    database: config.MYSQL_DATABASE,
  },
  pool: { min: 0, max: 10 },
  migrations: {
    directory: join(__dirname, '..', 'migrations'),
    tableName: 'knex_migrations',
  },
});

export async function initDatabase() {
  await knex.migrate.latest();
  console.log('Database migrations up to date');
}

export default knex;
