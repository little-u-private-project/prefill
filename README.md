# prefill

A personal web tool that turns saved answer sets into **prefilled Google Form
links**, so the routine parts of a form arrive already filled and only the parts
worth thinking about are left blank. Every generated link is logged, so past
fills are searchable.

Single user, no accounts.

## How it works

1. Paste a Google Form URL. The app fetches the public `viewform` page
   server-side and reads the `FB_PUBLIC_LOAD_DATA_` blob embedded in it to
   recover every question — its title, type, choices, and `entry.<id>`.
2. Every question starts as **fill by hand**. Turn on `autofill` per question
   and give it a value. Save the set as a named preset.
3. Generating a link builds
   `…/viewform?usp=pp_url&entry.<id>=<value>…` and opens it. Review and submit
   inside Google Forms as usual.
4. The values actually sent are appended to the history table in D1.

The core requirement — "this question I want to answer myself" — needs no
feature: a question left off `autofill` is simply absent from the query string,
so it arrives blank.

The app never submits a form. It only prefills; the submit button stays with the
human.

For a form filled over and over:

- **เปิดฟอร์มเลย** on a saved preset rediscovers the form, builds the link,
  opens it and logs it in one click.
- A date or time question can be set to **today / now**; the preset stores a
  token and the real value is filled in each time a link is built.
- When a preset no longer matches its form (a choice renamed, a question
  removed), the app lists what Google would silently drop and opens the editor
  instead of the form.
- It installs to a phone's home screen (web app manifest + icons in `public/`).

`npm run check` runs the self-check for the preset logic.

## Stack

- React 19 + TypeScript + Vite, served as static assets by one Cloudflare Worker
- The Worker runs only for `/api/*` — the two things a browser cannot do: fetch
  a cross-origin page, and reach the database
- Cloudflare D1 (SQLite) for presets and history, reached only through the
  Worker's `DB` binding — no keys, no secrets, no environment variables

```
browser ──▶ /api/discover-form ──▶ docs.google.com/forms/…/viewform
        └─▶ /api/history       ──▶ D1 (presets, history)
everything else ──▶ static assets (no Worker run, free and unmetered)
```

Schema: [`migrations/0001_init.sql`](migrations/0001_init.sql). Routing and
the SPA fallback: [`wrangler.jsonc`](wrangler.jsonc).

## Develop

```sh
npm install
npx wrangler d1 migrations apply DB --local
npm run dev
```

`npm run dev` is Vite with `@cloudflare/vite-plugin`, which runs `worker/` in
the real Workers runtime against a local D1 (kept under `.wrangler/`). A fresh
clone needs `npm run types` (or any build) once, so `worker-configuration.d.ts`
exists for the editor.

`npm run build` runs `wrangler types`, `tsc -b` (app and worker configs) then
`vite build`.

## Deploy (Cloudflare)

One-time, on a new account:

```sh
npx wrangler login
npx wrangler d1 create prefill --location apac   # paste database_id into wrangler.jsonc
npx wrangler d1 migrations apply DB --remote
```

Then every release:

```sh
npm run deploy
```

A new migration file goes out with `npx wrangler d1 migrations apply DB --remote`
before the deploy that needs it.

Optional: Cloudflare dashboard › Workers & Pages › prefill › Settings › Builds,
connect this repo to deploy on every push (build `npm run build`, deploy
`npx wrangler deploy`).

## Free tier

Workers Free gives 100,000 Worker runs a day and 10 ms CPU per run; only
`/api/*` counts (`run_worker_first`), page and asset loads do not. D1 Free
fails queries — rather than slowing down — once the daily row-read or
row-write budget is spent, until midnight UTC; history reads are capped at the
newest 1000 rows for that reason.

## Known limits

- **Public forms only.** A form that requires Google sign-in cannot have its
  schema read unauthenticated; the app says so instead of half-working.
- **`forms.gle` short links are rejected** — open one once and paste the
  `docs.google.com` URL it lands on.
- **The `/edit` URL will not work.** A form's editor id differs from its
  published id and cannot be converted; paste the `/viewform` link.
- **File upload questions can never be prefilled** (Google's rule, not this
  app's) and are shown as permanently manual.
- **Anyone with the site URL can use it** and read the history (the database itself is reachable only through the Worker). That is the
  accepted trade for a single-user tool with no login — so anything sensitive
  belongs in a *fill by hand* question, never in a preset.

## Verification status

Confirmed against a live public Google Form: schema discovery (titles, types,
`entry` ids, required flags, choice lists), and a generated link arriving at
Google with exactly the chosen answers prefilled and every other question blank.

Not yet exercised against a real form: **grid** questions (row labels are read
from an unverified array index, with a positional fallback), **date**/**time**
splitting, the **"Other"** free-text option, and **file upload** detection.

Presets and history on D1: every action exercised against the local Worker
(upsert, delete, missing name, newest-first history, `'`/`;`/Thai round-trip).
