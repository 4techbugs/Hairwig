# HairWigHouse Business Management System

This project includes:

- React + Vite frontend in `client/`
- Express + SQL Server backend in `server/`
- SQL schema in `database/setup.sql`

## Quick start

### 1. Backend

```bash
cd server
npm install
cp .env.example .env
```

Copy `.env.example` to `.env`, generate a unique JWT secret locally, and fill in the database settings before starting the server:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
npm start
```

For Windows PowerShell, use `Copy-Item .env.example .env` instead of `cp`.

### 2. Frontend

```bash
cd client
npm install
npm run dev -- --host 0.0.0.0
```

There are no default login credentials. When using mock data, set `MOCK_ADMIN_PASSWORD` in `server/.env`. To use the optional mock branch administrator, also set `MOCK_BRANCH_ADMIN_PASSWORD`.

### Database configuration

Set `DB_SERVER`, `DB_NAME`, and the authentication settings in `server/.env`. For SQL authentication, also set `DB_USER`, `DB_PASSWORD`, and optionally `DB_PORT` (defaults to 1433). The checked-in `database/setup.sql` is a reference schema; ensure your database schema matches the SQL queries used by the backend.

For a clean database setup only, generate a bcrypt hash locally with `node -e "require('bcryptjs').hash('YOUR_NEW_PASSWORD', 10).then(console.log)"`, set it in `@InitialAdminPasswordHash` in `database/setup.sql`, and run the reference script. Do not run it against the existing `hairpatchdb` database. Do not commit `.env` files or real credentials.

Set `USE_MOCK_DATA=true` to use in-memory sample records instead of SQL Server.

### Master screens

For the existing `hairpatchdb` database, run `database/masters.sql` first, then `database/sales.sql`. The scripts add the branch State Code, treatment HSN Code, bill tax snapshots, and treatment HSN snapshots, while preserving existing rows. They also prepare the Client, Brand, Unit, Group, Treatment, and Item masters. Branch terms and conditions are managed as rows within Branch Master and do not have a separate screen or lookup master. Treatment type and product type are selected from fixed dropdowns.

`database/setup.sql` is a reference schema for a clean setup; do not run it for the existing `hairpatchdb` database.

Sale bill numbers use the selected branch code and bill month, with an independent three-digit sequence for each branch and month (for example, `DL-Nov-001` and `MUM-Nov-001`). The month is based on the bill date. The Bills form shows a next-number preview; the final number is allocated when the bill is saved.

### Role access

The Role Master screen is hidden from navigation and direct visits redirect to the dashboard. Roles remain selectable in User Master. Super Admins can access all branches; Branch Admins are limited to their assigned branch; Users see current-month transactions for their assigned branch. Client and product catalogs remain shared across branches.
