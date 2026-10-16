# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Ticked is a mobile-first task manager: tasks, projects, tags, due dates, tick to complete. Each person has an account (Supabase Auth: email + password) and sees only their own projects and tasks. The repo has two halves:

- `front-end/`: the React SPA. It was built from the specs in `front-end/app_outline/` (read `user_journey.md` first, then `app.png`, then `pages/*/user_story.md` and the wireframe next to each, then `style_guide.md`).
- `supabase/`: the database (`schema.sql` is the source of truth, plus `user_stories.md` and the original ERD).

The front end talks to Supabase only through supabase-js and the publishable key. Supabase Auth handles register/log in/log out; supabase-js saves the session (access + refresh token) in localStorage and sends the access token (a JWT) as `Authorization: Bearer` on every request. Row Level Security uses `auth.uid()` from that token.

## Commands

Run these from `front-end/`. Copy `.env.example` to `.env` (gitignored) and fill in `VITE_SUPABASE_URL` (no `/rest/v1`, no trailing slash) and `VITE_SUPABASE_PUBLISHABLE_KEY`. Restart the dev server after changing `.env`.

```bash
npm install
npm run dev       # http://localhost:5173
npm run lint      # oxlint
npm run build     # BASE=/sub/path/ npm run build for a sub-folder deploy
```

## Front end (`front-end/`)

- **Stack:** React 19 + Vite + React Router DOM 7 (`BrowserRouter`, `basename` = Vite's `BASE_URL`) + `@supabase/supabase-js`.
- **Routes** (`src/App.jsx`):
  - Public (inside `AuthLayout`, which sends logged-in users to `/`): `/login`, `/register`.
  - Protected (inside `RequireAuth`, which sends everyone else to `/login`), all inside `Layout`: `/` Tasks, `/tasks/new` New Task (`?project=<id>` pre-picks a project), `/projects`, `/projects/:id`, `*` Not Found.
- **Data layer: `src/data/db.js` is the ONLY file that talks to Supabase.** It creates the client lazily, turns every `{ error }` into a thrown `Error`, and exports:
  - Accounts: `signUp({ name, email, password })` (name goes in user metadata), `signIn`, `signOut`, `getSession`, `onAuthChange(callback)`, `getProfile(id)`, `configProblem()`.
  - Data: `listProjects`, `createProject`, `deleteProject`, `listTasks` (`select('*, tags(id, name)')`), `createTask` (the `create_task_with_tags` RPC), `setTaskComplete`, `deleteTask`, `listTags`, `createTag`.
  - Nothing sends a `user_id`: the database fills it in from `auth.uid()`.
- **State:**
  - `src/context/AuthContext.jsx` (`useAuth()` from `useAuth.js`): `session`, `user`, `profile` (the `public.users` row), `checking` (true until the saved session is checked), `authError`, `signUp`, `signIn`, `signOut`.
  - `src/context/TaskContext.jsx` (`useTasks()`): loads everything through `db.js` when the user changes, labels the rows with their owner, and shows nothing that belongs to a previous user.
- **Pages** in `src/pages/` (Login, Register, Tasks, NewTask, Projects, ProjectDetail, NotFound), shared UI in `src/components/` (TopBar shows the user's name + Log out; RequireAuth, AuthLayout, TaskRow, ConfirmDialog, Toast, ErrorBanner, …), helpers in `src/utils/`.
- `src/main.jsx` handles the GitHub Pages `?p=` deep-link redirect. `vercel.json` rewrites every path to `index.html` for Vercel.

## Database (`supabase/schema.sql`)

- `auth.users` (managed by Supabase Auth) → trigger `on_auth_user_created` → `public.handle_new_user()` (security definer) inserts `public.users (id, name, email)`. `public.users.id` = `auth.users.id`.
- Five tables: `users`, `projects`, `tags`, `tasks`, `task_tags`. UUID keys, `created_at timestamptz default now()`.
  - `projects.user_id` and `tasks.user_id`: `not null default auth.uid()`, FK to `public.users`, `on delete cascade`.
  - Deleting a project sets its tasks' `project_id` to null. Deleting a task or tag cascades to `task_tags`.
  - Tags are global (no `user_id`).
- RLS on every table, all policies `to authenticated` (the anon role gets nothing):
  - `users`: select/update own row.
  - `projects`, `tasks`: select/insert/update/delete where `auth.uid() = user_id`; a task's `project_id` must be one of your projects.
  - `tags`: any logged-in user can select and insert.
  - `task_tags`: follows the owner of the task.
- RPC `create_task_with_tags(p_title, p_project_id, p_due_date, p_tag_ids)`: security invoker, one transaction, executable by `authenticated` only.
- Status codes to expect: anon blocked → 401; logged in and blocked on insert → 403; update/delete of someone else's row → 204 with 0 rows changed (RLS hides the row).
- `.mcp.json` (repo root, not committed) connects the Supabase MCP server.

## Conventions

- Keep all Supabase calls (auth and data) in `front-end/src/data/db.js`; components never import supabase-js.
- Never send `user_id` from the browser; never use the secret/service-role key in the front end.
- Column names match the database: `id`, `created_at`, `is_complete`, `due_date` (`YYYY-MM-DD` or null), `project_id` (or null). Keep `db.js` and `schema.sql` in step; schema changes go in `schema.sql` (or a migration) too.
- Validation messages, empty states and confirm dialogs use the exact wording in the user journey and user stories.
- Mobile-first, 44px touch targets, real form controls with labels, visible focus, `prefers-reduced-motion` respected.

## Agents and skills

- `.claude/agents/front-end-agent.md`: front-end specialist (Context7, Playwright, Chrome DevTools MCPs).
- `.claude/agents/supabase-agent.md`: back-end specialist (Supabase MCP, Context7, postgresql-table-design).
- `.claude/skills/`: front-end design skills (frontend-design, ui-ux-pro-max, taste-skill, design-motion-principles) and `postgresql-table-design`.
