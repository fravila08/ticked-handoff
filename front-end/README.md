# Ticked front end

The React single page app for Ticked: tasks, projects, tags, due dates, tick to complete, and a one-time Stripe donation. React 19 + Vite + React Router 7, talking to Supabase with supabase-js.

The root [`README.md`](../README.md) covers the whole project and the Supabase side is in [`../supabase/README.md`](../supabase/README.md). There is a map of every page and where its data goes in [`../obsidian-canvas/ticked-app-map.canvas`](../obsidian-canvas/ticked-app-map.canvas).

## Run it

You need Node 20+ and a Supabase project that has [`../supabase/schema.sql`](../supabase/schema.sql) applied.

```bash
cp .env.example .env.local      # then fill it in (below)
npm install
npm run dev                     # http://localhost:5173
npm run lint                    # oxlint
npm run build                   # BASE=/sub/path/ npm run build for a sub-folder deploy
npm run preview                 # serve the build
```

A build needs the environment variables too.

### Environment variables

| Variable | What | Where to find it |
|---|---|---|
| `VITE_SUPABASE_URL` | Project URL, no `/rest/v1/`, no trailing slash | Supabase → Integrations → Data API |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | The publishable (anon) key. Safe in the browser because RLS is on | Supabase → Project Settings → API Keys |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe **test** publishable key (`pk_test_...`). Needed only for `/donate` | Stripe dashboard → Developers → API keys |

`.env`, `.env.local` and anything `*.local` are gitignored. **Never put a secret key (`sk_...`, `STRIPE_SECRET_KEY`, a service-role key) in this folder.** Those live in Supabase's Edge Function secrets. If the Stripe key is missing, `/donate` shows a friendly notice instead of the card form.

## Routes (`src/App.jsx`)

| Path | Page | Who | What it does |
|---|---|---|---|
| `/login` | `Login` | logged out | Email + password. Goes back to the page you came from. |
| `/register` | `Register` | logged out | Name, email, password. Logs straight in (email confirmation is off). |
| `/` | `Tasks` | logged in | All tasks, newest first; tick to complete, delete. |
| `/tasks/new` | `NewTask` | logged in | Title, project (`?project=<id>` pre-picks one), due date, tags. |
| `/projects` | `Projects` | logged in | Projects with progress, a new-project form, and a random Pokémon badge (PokeAPI). |
| `/projects/:id` | `ProjectDetail` | logged in | One project's tasks; delete the project (its tasks are kept). |
| `/donate` | `Donate` | logged in | One-time Stripe donation (see below). |
| `*` | `NotFound` | logged in | |

Logged-out pages sit in `AuthLayout` (app name + form, no tab bar; a logged-in user is sent on). Everything else is inside `RequireAuth`, which sends anyone else to `/login` and remembers the page in `state.from`. `Layout` is the frame: header (`TopBar` with the user's name and Log out), error banner, the page, toast, the coffee-mug `DonateButton` and the `BottomNav`.

## How the code is organised

```
src/
├── main.jsx            entry; handles the GitHub Pages ?p= deep-link redirect
├── App.jsx             the routes
├── data/
│   ├── db.js           the ONLY file that reads or changes Supabase data (logins and Edge Functions too)
│   └── pokeapi.js      the only place that talks to PokeAPI
├── context/
│   ├── AuthContext.jsx   user, checking, register, logIn, logOut      → useAuth()
│   └── TaskContext.jsx   projects, tasks, tags, loading, error, toasts, actions → useTasks()
├── pages/              one file per route
├── components/         TopBar, BottomNav, Layout, AuthLayout, RequireAuth, FormField, TaskRow, TaskList,
│                       ConfirmDialog, Toast, ErrorBanner, DonateButton, PokemonBadge, ProgressBar, …
└── utils/              dates, task sorting and progress, tag colours
```

### Data layer: `src/data/db.js`

Components never call Supabase directly. `db.js` creates the client lazily (so missing env vars show in the error banner), turns every Supabase `{ error }` into a thrown `Error`, and never sends a `user_id` (the database fills it from the login and RLS enforces it).

| Area | Exports |
|---|---|
| Accounts | `register({ name, email, password })`, `logIn({ email, password })`, `logOut()` (this device only), `getCurrentUser()` (reads the saved session, confirms it with `auth.getUser()`). Each returns the profile `{ id, name, email }` from `public.users`. Auth errors come back in the app's wording, with `err.field` saying which input they belong under. |
| Projects | `listProjects` (oldest first), `createProject`, `deleteProject` |
| Tasks | `listTasks` (newest first, each with `tags: [{ id, name }]`), `createTask` (the `create_task_with_tags` RPC), `setTaskComplete`, `deleteTask` |
| Tags | `listTags` (A to Z), `createTag` |
| Donations | `createDonationIntent(amount)`: invokes the `process-donation` Edge Function with `{ amount }` in cents and returns the Stripe `client_secret`. Throws with `err.network = true` when the function can't be reached. |

Column names match the database: `id`, `created_at`, `is_complete`, `due_date` (`YYYY-MM-DD` or null), `project_id` (or null).

### State

- **`AuthContext`** holds `user` (the profile or null), `checking` (true while the saved login is read on startup; `RequireAuth` and `AuthLayout` show "Checking who's logged in…" instead of redirecting), and `register`, `logIn`, `logOut`. Read it with `useAuth()`.
- **`TaskContext`** (inside `AuthProvider`) loads projects, tasks and tags through `db.js` whenever the logged-in user changes, clearing the old lists first so one user's data never shows for the next. Every change goes through `db.js` and then re-loads. Read it with `useTasks()`.
- `Donate` is the exception: it calls `createDonationIntent` directly and keeps its own form state, because donations aren't part of the task data.

## Donations

`/donate` (`src/pages/Donate.jsx`) shows a heading and description, amount options ($5, $10, $25, $50, or "Other" up to $10,000 with at most 2 decimals), a Stripe `CardElement` (`@stripe/react-stripe-js`) and a Donate button. The coffee-mug `DonateButton` (fixed bottom-right on every logged-in page, hidden on `/donate`) links to it.

```
submit ─► createDonationIntent(cents)  ─► process-donation Edge Function ─► { client_secret }
       ─► stripe.confirmCardPayment(client_secret, { payment_method: { card } })   (Stripe.js, direct to Stripe)
       ─► success | declined | something went wrong
```

| Result | What the user sees |
|---|---|
| Success | "Thank you for your $10.00 donation", with a "Donate again" button |
| Card declined or invalid | A plain message such as "Your card has been declined. Check the card details or try another card." Never a raw Stripe code. |
| Function unreachable or rejected | "Something went wrong" and a Retry button. They have not been charged. |

The donation is recorded in `public.donations` by Stripe's webhook, not by the browser. Test cards (test mode only): `4242 4242 4242 4242` succeeds, `4000 0000 0000 0002` is declined; any future expiry, any CVC.

## Conventions

- All data access, including auth and Edge Functions, stays in `src/data/db.js` (PokeAPI is the one other module, `pokeapi.js`).
- Never send `user_id` from the front end.
- Validation messages, empty states and confirm dialogs use the exact wording in `app_outline/pages/*/user_story.md`. Login/Register wording: "Give your name", "Enter your email", "Enter your password", "Password must be at least 6 characters", "Wrong email or password", "An account with this email already exists"; toasts "Welcome, {name}" and "Signed out".
- Mobile-first, 44px touch targets, real form controls with labels, visible focus, `prefers-reduced-motion` respected.
- The app was built from the specs in `app_outline/`: read `user_journey.md` first, then `app.png`, then `pages/*/user_story.md` and the wireframe next to each, then `style_guide.md`. `screenshots/` holds screenshots of the main pages and the donation flow.

## Deploying

- **Vercel:** set the Root Directory to `front-end`. `vercel.json` rewrites every path to `index.html`, so refreshing `/projects` works. Build with the default `BASE` (`/`). Add the three environment variables above. Then, in Supabase → Authentication → URL Configuration, set the Site URL to the Vercel URL and add it (and `http://localhost:5173`) to Redirect URLs.
- **GitHub Pages / sub-folder:** `BASE=/sub/path/ npm run build`. `main.jsx` handles the `?p=` deep-link redirect.
