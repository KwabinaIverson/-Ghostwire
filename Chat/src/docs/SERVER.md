# GhostWire Server — Documentation

## Overview

`server.ts` boots the GhostWire API. It performs the following tasks:

- Loads environment variables
- Initializes the MySQL connection pool via `Database.init()`
- Configures global middleware (CORS, JSON/urlencoded body parsing)
- Mounts API routes (eg. `/api/auth`)
- Provides a global error handler to return friendly errors
- Starts the Express server on `process.env.PORT || 3000`

---

## Quick Start

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start in development (with nodemon):

   ```bash
   npm run dev
   ```

   Or run directly using ts-node register (works around some PowerShell restrictions):

   ```bash
   node -r ts-node/register ./server.ts
   ```

> Tip: If PowerShell blocks `npm`/`npx` due to execution policy, run commands in `cmd.exe` or adjust execution policy with care.

---

## Environment Variables

| Variable     | Description                    | Default     |
|--------------|--------------------------------|-------------|
| PORT         | Port the server listens on     | `3000`      |
| DB_HOST      | MySQL host                     | `localhost` |
| DB_USER      | MySQL user                     | `root`      |
| DB_PASSWORD  | MySQL password                 | ``          |
| DB_NAME      | MySQL database name            | `ghostwire` |
| NODE_ENV     | `development` or `production`  | `development` |

---

## Routes (high level)

- `GET /` — Health check (returns a simple running message)
- `POST /api/auth/register` — Register a new user (`username`, `email`, `password`)
- `POST /api/auth/login` — Login (`email`, `password`)

For route and controller details, see `src/routes` and `src/controllers`.

---

## Error Handling

The application uses a global error handler that logs the stack and returns a 500 response with a generic message. In development mode (`NODE_ENV=development`) the error message is included in the response for easier debugging.

---

## Troubleshooting

- "Cannot find module" errors: Check that import paths match file names and include `.ts` or `.js` extensions consistently across the codebase.
- PowerShell "running scripts is disabled": Use `node -r ts-node/register ./server.ts` or open a `cmd.exe` session.
- ESM/CommonJS errors around named exports from `express`: use a default runtime import (`import express from 'express'`) combined with `import type { Request, Response } from 'express'` for types only.

---

## Notes

- The server intentionally initializes the DB pool at startup so requests can use a ready pool.
- Keep secrets (DB credentials, JWT secrets) out of repo and in your environment or a secret manager.

---

If you'd like, I can add automated smoke tests for the health route and auth endpoints, or integrate a small README snippet into the project root. Let me know which you'd prefer.