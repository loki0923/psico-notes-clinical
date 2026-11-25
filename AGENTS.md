# AGENTS.md

## Stack
- Frontend: Vite + React 19 + TypeScript + Tailwind v4. Multi-page build (`index.html`, `portal.html`). Entry points in root (e.g., `app.js`, `portal.js`).
- Backend: Express 4 (ESM, `"type":"module"`) in `server.js` with HMAC-SHA256 sessions, CORS whitelist, rate limiting, audit logs, and clinical/security hardening.
- DB: Dual mode — PostgreSQL via `pg`/`postgres` if `DATABASE_URL` set (runs `schema.sql` on init), else embedded JSON store in `data/psiconotes_relacional.json` (atomic writes with `.bak`/tmp).
- AI: Gemini API proxied server-side via `GEMINI_API_KEY` (no client key). Models used: `gemini-2.5-flash`.
- Node: `>=20.0.0 <=22.x` (see `package.json` engines).

## Quick Start
```bash
npm install
# set env (see .env.example): GEMINI_API_KEY, DATABASE_URL (optional), SESSION_SECRET, NODE_ENV
npm run dev        # Vite on 0.0.0.0:3000
npm start          # node server.js (production)
```
- Dev server: `vite --port=3000 --host=0.0.0.0`. HMR disabled if `DISABLE_HMR=true`.
- Build: `npm run build` (outputs to `dist/`, multi-page). Preview: `npm run preview`.
- Lint/typecheck: `npm run lint` runs `tsc --noEmit` (no ESLint configured).

## Environment & Secrets
- `GEMINI_API_KEY`: required for AI endpoints (`/api/v1/clinical/*`). Server reads only from env.
- `DATABASE_URL`: enables Postgres; in `production` without it throws unless `ALLOW_LOCAL_DB_IN_PROD=true`. SSL required for non-local hosts.
- `SESSION_SECRET`: HMAC sessions (min 32). If missing/weak/insecure default in prod, server generates a CSPRNG secret at runtime (warns).
- `ALLOWED_ORIGINS`: comma-separated, merged with defaults (localhost/127.0.0.1 and `psico-notes-clinical.onrender.com`).
- `PORT`, `NODE_ENV` as usual. See `.env.example`.

## Architecture Notes (non-obvious)
- **Static serving is whitelisted**: `server.js` only serves explicit root files (`ALLOWED_STATIC_FILES`) and `/assets/*`. API routes start with `/api/`. Everything else returns 403. HTML/JS/CSS get `no-cache`, images/assets get longer cache.
- **Auth model**: Therapist sessions are HMAC-signed tokens (`generateSessionToken`/`verifySessionToken`) with revocation sets and global revocation by therapist. Auth via `Authorization: Bearer ...` or `x-session-token`/query. Multi-tenant: routes like `/api/v1/patients/*` enforce ownership (BOLA/IDOR) and cross-tenant attempts are audit-logged and blocked.
- **Patient portal**: Token-based auth (no PII leakage), rate-limited (`/api/v1/portal/auth`), mood/CBT/tasks/evaluations/crisis endpoints. Kids portal under `/api/v1/portal/kid/*`. Portal HTML is `portal.html` (separate build entry).
- **Data layer**: `db.js` is dual-adapter. Local JSON uses atomic rename + backup (`.bak`) and blocks persistence if in corrupt state. Postgres schema in `schema.sql` (therapists, patients, tasks, cbt_records, mood_logs, evaluations, crisis_alerts, clinical_notes, appointments, therapist_cloud_sync, password_resets, audit_logs, billing_config/invoices, kid_portal_activities, therapist_style_profiles, therapy_roadmap_sessions).
- **AI synthesis**: `/api/v1/clinical/session-synthesize` supports SOAP/DAP/BIRP/GIRP/NARRATIVE/TREATMENT_PLAN, optional audio (base64), style profiles, few-shot. All go through server proxy with `GEMINI_API_KEY`.
- **Telehealth**: `/api/v1/telehealth/session` generates high-entropy room IDs (crypto.randomBytes) pointing to Jitsi.
- **Sync**: Cloud sync endpoints for therapist snapshots; zero-knowledge style blob sync exists. Billing (SENIAT) persisted to DB/local.
- **Tests**: `npm test` runs `node tests.js` (custom browser/Node test suite; many tests assert DOM/exports from modules like `finance.js`, `adm.js`, `scales.js`, etc.). It's not Jest/Vitest.

## Conventions & Gotchas
- **ESM everywhere**: imports use `import`/`export`; `__dirname` computed via `fileURLToPath`. Server exports helpers (`generateSessionToken`, `verifySessionToken`, `requireTherapistAuth`, `ALLOWED_ORIGINS`) used by tests/other modules.
- **Security-first**: Don't add new static files without updating `ALLOWED_STATIC_FILES` in `server.js`. All therapist-protected routes must use `requireTherapistAuth` and enforce tenant checks. Never log secrets/tokens; audit logs are written via `recordAuditLog`/`db.createAuditLog`.
- **DB writes**: Prefer using `db` methods. For local mode, changes must go through methods that call `_persistLocalStore()` (or ensure persistence). Corrupt local DB halts writes.
- **Paths/aliases**: `tsconfig.json` has `"paths": {"@/*": ["./*"]}` and Vite alias `@` → `.`. Many modules are plain JS in root; TS is used selectively.
- **Production**: On Render, set `SESSION_SECRET`, `DATABASE_URL`, `GEMINI_API_KEY`. Server auto-generates session secret in prod if missing but logs warning and loses sessions on restart.
- **Rate limits**: Applied to auth/portal/crisis-sensitive endpoints (in-memory buckets). 
- **Tests are comprehensive but custom**: Running `npm test` may start/close a test server instance; some tests read files directly (`index.html`, module sources). They expect specific globals/exports.

## Where to Look
- API surface/security: `server.js`
- Persistence/schema: `db.js`, `schema.sql`
- Build/config: `vite.config.ts`, `tsconfig.json`, `package.json`
- Client entry: `index.html`, `app.js`; portal: `portal.html`, `portal.js`
- Env/deploy: `.env.example`, `docker-compose.yml`, `Dockerfile`, `render.yaml`, `netlify.toml`
