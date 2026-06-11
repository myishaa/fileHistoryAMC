# Recordkeeper PostgreSQL Database

This folder contains the PostgreSQL schema for the Recordkeeper app.

Run these files against a new PostgreSQL database:

```sh
psql "$DATABASE_URL" -f database/001_initial_schema.sql
psql "$DATABASE_URL" -f database/002_seed_defaults.sql
```

The backend will read the same `DATABASE_URL` from `backend/.env`.

```sh
cd backend
cp .env.example .env
npm install
npm run dev
```

Once the server is running, the database connection health check is:

```sh
curl http://localhost:3000/api/health
```

## Main Tables

- `files`: core file/procurement records.
- `divisions`: office divisions such as Mechanical, Electrical, Electronics.
- `app_users`: temporary app users and future login users.
- `user_divisions`: division access for non-admin users.
- `app_settings`: workspace settings currently stored in localStorage.
- `file_firms`: invited and bidder firm rows.
- `supply_orders`: multiple supply order rows for a file.
- `file_remarks`: remarks grouped by section.
- `file_completed_milestones`: completed milestone names per file.

The schema is designed so the current frontend can later receive data in the same shape as `FileRecord`, while the backend stores repeated data like firms, remarks, and supply orders in proper child tables.
