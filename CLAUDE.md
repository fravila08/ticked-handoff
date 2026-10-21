# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Ticked is a mobile-first task manager: tasks, projects, tags, due dates, tick to complete. The repo has two halves:

- `front-end/`: the React SPA. It was built from the specs in `front-end/app_outline/` (read `user_journey.md` first, then `app.png`, then `pages/*/user_story.md` and the wireframe next to each, then `style_guide.md`).
- `supabase/`: the Supabase back-end: the database design (`user_stories.md`, `task-manager-erd.png`, `schema.sql`), the donation Edge Functions' source (`functions/`), and `README.md` / `DONATION_REVIEW.md`.

Docs: `README.md` (whole project, setup, handoff notes), `front-end/README.md` (routes, state, data layer), `supabase/README.md` (database, Edge Functions, donations). `obsidian-canvas/ticked-app-map.canvas` maps every page and its data flows to Supabase and Stripe; update it when routes, `db.js` functions or Edge Functions change.

The front end reads and writes the live Supabase project (its ref is in your `.mcp.json` and `front-end/.env.local`, both gitignored) through its auto-generated REST API, using supabase-js and the publishable key. Users register and log in with Supabase Auth (email + password; email confirmation is off, so Register logs straight in). Every user sees and changes only their own projects and tasks; tags are shared. Row level security enforces this in the database, so the app never sends a user id. Data persists across refresh; there is no seed data.

Logged-in users can also make a one-time Stripe donation (test mode): the `/donate` page asks the `process-donation` Edge Function for a PaymentIntent, confirms the card with Stripe.js, and Stripe's webhook (`stripe-webhook` Edge Function) records the result in `public.donations`.

## Commands

Run these from `front-end/`. Copy `.env.example` to `.env.local` first (gitignored) and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (and `VITE_STRIPE_PUBLISHABLE_KEY`, a `pk_test_...` key, for `/donate`); a build also needs them.

```bash
npm install
npm run dev       # http://localhost:5173
npm run lint      # oxlint
npm run build     # BASE=/sub/path/ npm run build for a sub-folder deploy
```

## Front end (`front-end/`)

- **Stack:** React 19 + Vite + React Router DOM (`BrowserRouter`, `basename` = Vite's `BASE_URL`).
- **Routes** (`src/App.jsx`):
  - Logged out (`AuthLayout`: app name + form, no tab bar; a logged-in user is sent on): `/login` Log in, `/register` Register.
  - Logged in (`RequireAuth` sends anyone else to `/login`, remembering the page in `state.from` and returning there after login): `/` Tasks, `/tasks/new` New Task (`?project=<id>` pre-picks a project), `/projects` Projects, `/projects/:id` Project Detail, `/donate` Donate (Stripe card donation; a coffee-cup link pinned bottom-right on every logged-in page leads there), `*` Not Found.
- **Data layer: `src/data/db.js` is the ONLY file that reads or changes data, including logging in.** It creates the Supabase client (lazily, so missing env vars show in the ErrorBanner) and turns every Supabase `{ error }` into a thrown `Error`. The data exports kept the names and return shapes they had when the data was in-memory arrays, so the UI didn't change:
  - Accounts: `register({ name, email, password })` (the name goes in the sign-up metadata, where the database trigger reads it), `logIn`, `logOut` (scope `local`: this device only; supabase-js deletes the saved token), `getCurrentUser` (after a refresh: reads the saved session, confirms it with `auth.getUser()`, drops a token Supabase refuses). Each returns the profile `{ id, name, email }` from `public.users`. Supabase Auth error codes are turned into the app's wording, with `err.field` saying which input the message belongs under.
  - `listProjects`, `createProject`, `deleteProject`
  - `listTasks` (`select('*, tags(id, name)')`, each task returned with `tags: [{ id, name }]`), `createTask` (calls the `create_task_with_tags` RPC), `setTaskComplete`, `deleteTask`
  - `listTags`, `createTag`
  - `createDonationIntent(amount)` (amount in cents; calls the `process-donation` Edge Function through `supabase.functions.invoke` and returns the Stripe `client_secret`; `err.network` is true when the function is unreachable). The Donate page confirms the payment with Stripe.js using `VITE_STRIPE_PUBLISHABLE_KEY` (publishable key only; secrets stay in Supabase).
  - `src/data/pokeapi.js` is the separate module for PokeAPI (`getRandomPokemon`, used by the Projects page's `PokemonBadge`); `db.js` stays Supabase-only.
  - Order: projects oldest first, tasks newest first, tags A→Z (the tags table has no `created_at`).
- **State:**
  - `src/context/AuthContext.jsx` holds `user` (profile or null), `checking` (true while the saved login is read on startup; `RequireAuth` and `AuthLayout` show "Checking who's logged in…" instead of redirecting), and `register`, `logIn`, `logOut`. Components read it with `useAuth()` (`src/context/useAuth.js`).
  - `src/context/TaskContext.jsx` (inside `AuthProvider`) loads everything through `db.js` whenever the logged-in user changes, clearing the old lists first so one user's data never shows for the next. It exposes the data, `loading`, `error`, toasts and actions. Components read it with `useTasks()` (`src/context/useTasks.js`).
- **Pages** in `src/pages/` (including `Login.jsx`, `Register.jsx`, `Donate.jsx`), shared UI in `src/components/` (Layout, TopBar with the user's name + Log out, FormField, RequireAuth, AuthLayout, TaskRow, TaskList, ConfirmDialog, Toast, ErrorBanner, BottomNav, DonateButton, PokemonBadge, …), helpers in `src/utils/` (dates, task sorting, tag colors).
- **Donate page:** presets $5/$10/$25/$50 plus a custom amount (max $10,000, 2 decimals, sent as integer cents), a Stripe `CardElement`, and `stripe.confirmCardPayment(client_secret)`. It calls `createDonationIntent` directly (not through TaskContext). Results: thank-you with the amount; a plain message for a declined card (never raw Stripe codes); "Something went wrong" + Retry when the function is unreachable. If `VITE_STRIPE_PUBLISHABLE_KEY` is missing it shows a notice instead of the form.
- `src/main.jsx` handles the GitHub Pages `?p=` deep-link redirect.
- `screenshots/` holds screenshots of the main pages and the donation flow.

## Database (`supabase/`)

- `user_stories.md`: the 8 stories the database has to remember (story 1 is the user account).
- `README.md`: the state of the Supabase project (database, auth, Edge Functions, secrets).
- `task-manager-erd.png`: the ERD (DrawSQL).
- `schema.sql`: matches the live database. Its header comment lists the approved changes from the diagram. Sections in creation order:
  1. `users`: the profile table for Supabase Auth. `users.id` is the `auth.users` id (on delete cascade). A trigger on `auth.users` (`on_auth_user_created` → `handle_new_user`, security definer, not callable through the API) creates the row at sign-up. It is the one object outside the app's own tables and functions. Email is unique case-insensitively, and users can edit only `name` (email is locked by a column grant).
  2. to 5. `projects`, `tags`, `tasks`, `task_tags`. UUID primary keys (`gen_random_uuid()`), `created_at timestamptz default now()`. `projects.user_id` and `tasks.user_id` are not null, default `auth.uid()`, on delete cascade. Deleting a project sets its tasks' `project_id` to null (tasks are kept). Deleting a task or tag cascades to `task_tags`. Tags are global (no `user_id`). There is an index on every foreign key.
  6. RLS policies, all `to authenticated` (anon gets nothing): own profile/projects/tasks/task_tags only; a task can only go in one of the user's own projects; tags: any signed-in user can read and add, nobody can edit or delete.
  7. `create_task_with_tags(p_title, p_project_id, p_due_date, p_tag_ids)`: the one custom endpoint (`POST /rest/v1/rpc/create_task_with_tags`). It inserts a task (owner from `auth.uid()`) and its `task_tags` rows in one transaction and returns the task row. SECURITY INVOKER, executable by `authenticated` only.
  8. `donations`: `user_id` → `auth.users` (on delete cascade, indexed), `amount` integer cents (> 0), `stripe_payment_intent_id` text unique, `status` (`succeeded` | `failed`), `created_at`. RLS: authenticated can select only their own rows; no insert/update/delete for anon or authenticated (the webhook writes with the service role).
- **Practice Edge Functions** (deployed through the Supabase MCP; their source is only in the Supabase project, not in the repo; the app doesn't call them): `hello-world`, `multiply-numbers` (`?a=&b=` or POST `{a,b}` → `{a,b,result}`) and `dog-picture` (`?name=` → `{img}`, calls the Dog API with the `DOG_API_KEY` secret). All three have `verify_jwt` false and CORS allow-all. Details in `supabase/README.md`.
- **Donation Edge Functions** (source IS in the repo, `supabase/functions/<name>/index.ts`; the deployed code must match the file):
  - `process-donation` (`verify_jwt` true): POST `{ amount }` (integer cents, 1 to 1,000,000). The user comes only from the JWT (a `user_id` in the body is ignored). Creates a Stripe PaymentIntent with `metadata.user_id` and returns `{ client_secret }`. 401 without a login, 400 bad amount, generic 502 on Stripe errors.
  - `stripe-webhook` (`verify_jwt` false, because Stripe has no Supabase login): verifies the signature on the raw body with `STRIPE_WEBHOOK_SECRET` (400 on failure). Handles `payment_intent.succeeded` / `payment_intent.payment_failed` in snapshot payloads and in thin payloads (type `v1.payment_intent.*`, no data: it fetches the PaymentIntent from Stripe with `STRIPE_SECRET_KEY` and checks the status). Idempotent (skips an existing `stripe_payment_intent_id`), inserts with the service role, logs one JSON line per delivery with the `action` taken.
  - Secrets `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` live only in Supabase. Webhook URL to register in Stripe: `https://<project-ref>.supabase.co/functions/v1/stripe-webhook`. Details in `supabase/README.md`.
- **Never drop `rls_auto_enable()`** (the project's event-trigger function that turns RLS on for new tables). It isn't in `schema.sql`.
- `.mcp.json` (repo root, gitignored: each person adds their own with `claude mcp add`) connects the Supabase MCP server to the project.

## Conventions

- Keep all front-end data access (including auth) in `front-end/src/data/db.js`; components never call Supabase directly.
- Never send `user_id` from the front end: the database fills it from the login (`auth.uid()`) and RLS rejects anything else.
- Column names match the database: `id` (UUID), `created_at`, `is_complete`, `due_date` (`YYYY-MM-DD` or null), `project_id` (or null). Keep `db.js` and `schema.sql` in step.
- Deleting a project keeps its tasks (their `project_id` becomes null). Deleting a task removes its `task_tags` rows.
- Validation messages, empty states and confirm dialogs use the exact wording in the user stories. Login/Register wording: "Give your name", "Enter your email", "Enter your password", "Password must be at least 6 characters", "Wrong email or password", "An account with this email already exists"; toasts "Welcome, {name}" and "Signed out".
- Mobile-first, 44px touch targets, real form controls with labels, visible focus, `prefers-reduced-motion` respected.
- Stripe: test mode only. Never put a Stripe secret (`sk_...`, `STRIPE_SECRET_KEY`, `whsec_...`) or the service-role key in `front-end/`, in any committed file, or in logs; the front end holds only `VITE_STRIPE_PUBLISHABLE_KEY` (`pk_...`). The browser never writes `donations`; only `stripe-webhook` does. Call Edge Functions from `db.js` with `supabase.functions.invoke()`. Test cards: `4242 4242 4242 4242` succeeds, `4000 0000 0000 0002` is declined.
- Edge Function changes: edit the file in `supabase/functions/`, redeploy with the Supabase MCP `deploy_edge_function` (keep `verify_jwt` as above), and update `supabase/README.md`.

## Agents and skills

- `.claude/agents/front-end-agent.md`: front-end specialist (Context7, Playwright, Chrome DevTools MCPs).
- `.claude/agents/supabase-agent.md`: back-end specialist from the curriculum (Supabase and Context7 MCPs, postgresql-table-design skill). Added at handoff for the Beyond Building lessons.
- The donation feature was built in three gated phases: `supabase-agent` (table, RLS, Edge Functions; only `supabase/`), `front-end-agent` (Donate page and mug button; only `front-end/`), then an Opus supervisor review (`supabase/DONATION_REVIEW.md`). Keep each agent inside its own half.
- `.claude/skills/`: front-end design skills (frontend-design, ui-ux-pro-max, taste-skill, design-motion-principles) and `postgresql-table-design` for schema work.
