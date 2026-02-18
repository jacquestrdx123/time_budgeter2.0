# TimeBudget API

Node.js/Express backend with MySQL.

## MySQL setup

1. Create the database and user (e.g. in MySQL client):

```sql
CREATE DATABASE timebudget CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'timebudget'@'%' IDENTIFIED BY 'your-password';
GRANT ALL ON timebudget.* TO 'timebudget'@'%';
FLUSH PRIVILEGES;
```

2. Copy `.env.example` to `.env` and set:

- `MYSQL_HOST` (default `127.0.0.1`)
- `MYSQL_PORT` (default `3306`)
- `MYSQL_USER` (default `timebudget`)
- `MYSQL_PASSWORD`
- `MYSQL_DATABASE` (default `timebudget`)

3. Run migrations (optional; the app also runs them on startup):

```bash
npm run migrate:latest
```

Other commands:

- `npm run migrate:status` — show migration status
- `npm run migrate:rollback` — rollback last batch

## Run

```bash
npm install
npm run dev
```
