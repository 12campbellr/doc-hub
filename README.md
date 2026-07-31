# DOC Hub

Shared document & manual library for DOC Services field technicians. Everyone signs in with their own account; all folders and files are visible to the whole team.

## Running it locally

Node.js is not installed system-wide on this machine — a portable copy lives in `.tools/node` and is only used by the scripts below. It's just files in a folder; delete `.tools` anytime to remove it.

Local dev connects to the same Postgres/Blob storage as production (see "Deploying" below) via `.env` — there's no separate local database.

**Run it:**
```
start-dev.bat
```
Double-click it (or run from a terminal). It starts the dev server at http://localhost:3000.

**Log in** with the seeded admin account:
- Email: `admin@dochub.local`
- Password: `ChangeMe123!`

Change this immediately: create your own admin account from **Users** in the top nav, or at least treat the seeded password as temporary.

## Testing from a phone

- **Same Wi-Fi as this computer**: run `npm run dev:lan` instead of the normal dev command (via a terminal, with `.tools\node` on PATH), find this computer's LAN IP (`ipconfig`, look for IPv4 Address), then visit `http://<that-ip>:3000` from your phone's browser.
- **From anywhere** (real field use, cellular data): use the deployed Vercel URL once set up — see "Deploying" below.

## What's built

- Separate login per technician; admins create accounts from **Users** (no public sign-up)
- Shared folder tree: create folders, upload files/photos (including directly from a phone camera), rename, move, delete
- Delete is restricted to admins or whoever uploaded/created the item
- Mobile-responsive layout; "Add to Home Screen" support via the PWA manifest

## Project layout

- `prisma/schema.prisma` — data model (User, Folder, File), Postgres
- `src/lib/auth.ts`, `src/middleware.ts` — authentication & route protection
- `src/lib/storage.ts` — file storage via Vercel Blob
- `src/app/api/*` — folders/files/admin-users API routes
- `src/components/LibraryView.tsx` — the main folder/file browser UI

## Deploying (Vercel)

1. Push this repo to GitHub.
2. In Vercel: "Add New Project" → import the repo.
3. Before deploying, open the project's **Storage** tab → create a **Postgres** database and a **Blob** store. Vercel auto-adds their connection env vars (`POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING`, `BLOB_READ_WRITE_TOKEN`) to the project.
4. Add one more env var: `NEXTAUTH_SECRET` (a long random string).
5. Deploy. Once you have the assigned `*.vercel.app` URL, set `NEXTAUTH_URL` to it and redeploy.
6. Run `prisma migrate deploy` and the seed script (`npm run db:seed`) once against the same Postgres connection (e.g. from a local `.env` pointed at the Vercel-provisioned database) to create the tables and the initial admin account.

See `.env.example` for the full list of required environment variables.
