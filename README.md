# Reminder inteligent (MVP)

Aplicatie web pentru remindere simple de familie cu Supabase Auth, invitatii prin email si notificari automate.

## Stack
- Next.js (App Router) + TypeScript
- Tailwind CSS
- Supabase (Auth + Postgres)
- Resend (email, optional)
- Vercel Cron

## Environment variables
Copy `.env.example` to `.env.local` and fill values. These are the exact names used:

Client-side (exposed in browser via `NEXT_PUBLIC_`):
- `NEXT_PUBLIC_APP_URL` (ex: http://localhost:3000)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Server-only (never exposed to browser):
- `SUPABASE_URL` (optional override for server-side Supabase URL, useful in Docker)
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `RESEND_FROM`

To get local Supabase keys/URLs after starting Supabase:
```bash
supabase status
```

## Setup local (non-Docker)
Necesita Node.js 18+ si Supabase CLI instalat.

1) Instaleaza dependintele:
```bash
npm install
```

2) Copiaza env:
```bash
cp .env.example .env.local
```

3) Porneste Supabase local si obtine cheile:
```bash
supabase start
supabase status
```

4) Completeaza `.env.local` folosind valorile locale din `supabase status`.

5) Ruleaza migratiile:
```bash
supabase db reset
```

6) Porneste aplicatia:
```bash
npm run dev
```

## Setup local with Docker
Necesita Docker + Docker Compose.

1) Copiaza env:
```bash
cp .env.example .env.local
```

2) Completeaza `.env.local` (aceleasi variabile ca mai sus).

3) Porneste tot stack-ul:
```bash
docker compose up --build
```

4) Deschide aplicatia: http://localhost:3000

5) Supabase Studio: http://localhost:54323

Pentru a vedea URL + chei locale:
```bash
docker compose exec supabase supabase status
```

Comenzi utile:
- Stop: `docker compose down`
- Reset DB + migratii: `docker compose exec supabase supabase db reset`
- Loguri: `docker compose logs -f app` sau `docker compose logs -f supabase`

Docker networking (important):
- Supabase CLI ruleaza containere pe HOST, nu in containerul `supabase`.
- In browser, `NEXT_PUBLIC_SUPABASE_URL` trebuie sa fie `http://localhost:54321`.
- Din containerul `app`, Supabase este accesibil la `http://host.docker.internal:54321` si este folosit prin `SUPABASE_URL`.
- Linux: `host.docker.internal` este mapat prin `extra_hosts` in `docker-compose.yml`.
- `docker-compose.yml` seteaza implicit `NEXT_PUBLIC_SUPABASE_URL` la `localhost` si `SUPABASE_URL` la `host.docker.internal`.

Persistenta date:
- Supabase isi pastreaza datele in volumele Docker create de CLI.
- Pentru reset complet: `docker compose down -v` si apoi `docker compose up --build`.

## Scripts
- `npm run dev` - local dev
- `npm run build` - build
- `npm run lint` - lint
- `npm run typecheck` - TS strict
- `npm run docker:up` - docker compose up --build
- `npm run docker:down` - docker compose down
- `npm run docker:reset` - supabase db reset in container
- `npm run docker:logs` - follow logs

## End-to-end test (local)
1) Deschide `/auth` si autentifica-te cu magic link.
2) Creeaza un household din `/app`.
3) Creeaza un reminder din `/app/reminders/new`.
4) Marcheaza Done sau Snooze din dashboard.
5) Invita un membru din `/app/household`.
   - Daca `RESEND_API_KEY` lipseste, link-ul de invitatie apare in UI.
6) Ruleaza manual cron-ul:
```bash
curl http://localhost:3000/api/cron/dispatch-notifications
```

## Common issues / Troubleshooting
- Ports already in use (54321/54322/54323/3000): opreste serviciile care folosesc portul sau modifica porturile in `supabase/config.toml` si `docker-compose.yml`.
- Docker socket permissions: `supabase` container are nevoie de `/var/run/docker.sock`. Asigura-te ca Docker ruleaza si socket-ul este accesibil.
- `host.docker.internal` pe Linux: este adaugat prin `extra_hosts`. Daca folosesti alt runtime, seteaza `NEXT_PUBLIC_SUPABASE_URL` manual la `http://<host-ip>:54321`.
- Google OAuth se blocheaza in browser: verifica ca `NEXT_PUBLIC_SUPABASE_URL` este `http://localhost:54321` (nu `host.docker.internal`).
- node_modules volume issues: sterge `node_modules` local si ruleaza `docker compose up --build` din nou.
- Resend not configured: fara `RESEND_API_KEY`, emailurile se sar si sunt marcate ca skipped in cron.
- Google OAuth missing: daca providerul nu e configurat in Supabase, butonul Google va afisa un mesaj explicativ.

## Supabase Auth
- Activeaza Google OAuth in Supabase Dashboard (optional).
- Configureaza redirect URL: `https://<vercel-url>/auth/callback`.
- Magic link email este activ implicit.
 - Pentru local, `supabase/config.toml` include `site_url` + `additional_redirect_urls` astfel incat magic link sa poata reveni la `/auth/callback`.
 - Dupa modificari la config, reporneste Supabase: `supabase stop && supabase start`.

## Vercel Cron
Cron este configurat in `vercel.json`:
- `/api/cron/dispatch-notifications` ruleaza la 15 minute.

## Supabase Edge Function (Backfill embeddings)
Functia edge pentru a genera embeddings direct in Supabase Cloud.

Deploy:
```bash
supabase functions deploy backfill-reminder-embeddings
```

Seteaza variabilele in Supabase (Project Settings → Functions):
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `OPENAI_EMBEDDING_MODEL` (optional, default `text-embedding-3-small`)
- `ADMIN_TOKEN`

Apel:
```bash
curl -X POST \
  -H "x-admin-token: <ADMIN_TOKEN>" \
  "https://<projectref>.functions.supabase.co/backfill-reminder-embeddings?forceAll=true"
```

## Structura
- `app/` - Next.js App Router pages + API routes
- `components/` - UI
- `lib/` - logic (Supabase, notificari)
- `supabase/migrations/` - schema + RLS

## Observatii
- RLS este activ pentru toate tabelele principale.
- Notificarile folosesc `notification_log` pentru idempotenta.
