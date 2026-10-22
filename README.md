# Ticked: full-stack task manager with logins

Ticked is the running example app for Code Platoon Phase III. It's a React + Vite task manager (tasks, projects, tags, due dates) on Supabase, with **Supabase Auth** logins. Each person sees only their own projects and tasks, and the database enforces that with Row Level Security. Logged-in users can also make a one-time **Stripe** donation (test mode) from a coffee-mug button, handled by two Supabase Edge Functions.

This is **the class's own Ticked**, exactly where the class left off **at the end of 09-Building-Applications / 4-authentication**: Claude built it live in the lectures, with the students approving each step. It's ready for **10-Beyond-Building**. (Added at handoff: `supabase-agent`, `vercel.json`, a root `.gitignore`, and this README.)

- [Run it](#run-it)
- [How it fits together](#how-it-fits-together)
- [Donations (Stripe)](#donations-stripe)
- [Set up Claude Code like the class demo](#set-up-claude-code-like-the-class-demo)
- [Handoff notes for the next instructor](#handoff-notes-for-the-next-instructor)

---

## Run it

You need Node 20+, a free Supabase project, and about 10 minutes.

1. **Database:** Supabase → **SQL Editor** → paste [`supabase/schema.sql`](supabase/schema.sql) → **Run**. It needs an empty project. It makes the 6 tables (including `donations`), the trigger, the RLS policies and one function.
2. **Email confirmation (for class):** **Authentication → Sign In / Providers → Email** → turn **Confirm email** off → Save.
   - With it on, new accounts can't log in until they click an emailed link. Playwright can't open an inbox, and Supabase's built-in email sender only allows a few emails an hour.
   - Real apps keep it on.
3. **Keys:**
   ```bash
   cd front-end
   cp .env.example .env.local
   ```
   - Fill in `VITE_SUPABASE_URL`: Integrations → Data API → Project URL, **without** `/rest/v1/` and with no trailing slash.
   - Fill in `VITE_SUPABASE_PUBLISHABLE_KEY`: Project Settings → API Keys → publishable key.
   - Optional, for donations: fill in `VITE_STRIPE_PUBLISHABLE_KEY` with your Stripe **test** publishable key (`pk_test_...`). It's safe in the browser. Never put a secret key (`sk_...`) anywhere in `front-end/`.
   - `.env.local` is gitignored (`*.local` in `front-end/.gitignore`). Never commit it.
4. **Start it:**
   ```bash
   npm install
   npm run dev        # http://localhost:5173
   ```
   Register an account, add a task, and refresh: you're still logged in. Open a private window and register a second account: it sees none of the first account's tasks.
5. **Donations (optional):** the Edge Functions and secrets are set up once per Supabase project. See [Donations (Stripe)](#donations-stripe). Without them the rest of the app works normally; only the Donate page fails.

**Claude Code:** to get the same MCP servers, skills and sub-agents the class used, follow [Set up Claude Code like the class demo](#set-up-claude-code-like-the-class-demo).

---

## How it fits together

```
ticked/
├── .claude/
│   ├── agents/      front-end-agent.md, supabase-agent.md
│   └── skills/      frontend-design, ui-ux-pro-max, taste-skill,
│                    design-motion-principles, postgresql-table-design
├── front-end/       the React app (= the curriculum's "client/")
│   ├── app_outline/ user journey, style guide, a wireframe and user story per page
│   ├── src/
│   │   ├── data/db.js            ← the ONLY file that talks to Supabase (logins, Edge Functions too)
│   │   ├── data/pokeapi.js       ← the one place that talks to PokeAPI (Projects page badge)
│   │   ├── context/AuthContext   ← who is logged in: useAuth()
│   │   ├── context/TaskContext   ← their data: useTasks()
│   │   ├── components/           RequireAuth, AuthLayout, FormField, TopBar (name + Log out), DonateButton …
│   │   ├── pages/                Login, Register, Tasks, NewTask, Projects, ProjectDetail, Donate, NotFound
│   │   └── utils/                dates, task sorting, tag colours
│   ├── screenshots/              the main pages + the donation flow
│   ├── README.md                 ← the front end: routes, state, data layer, env vars
│   ├── .env.example              copy to .env.local
│   └── vercel.json               SPA rewrite for Vercel (added at handoff)
├── supabase/
│   ├── README.md                 ← the state of the Supabase project (incl. Edge Functions)
│   ├── schema.sql                ← the source of truth for the database
│   ├── functions/                process-donation, stripe-webhook (Edge Function source)
│   ├── DONATION_REVIEW.md        the supervisor's review of the donation feature
│   ├── user_stories.md
│   └── task-manager-erd.png      (the original design, before logins)
├── obsidian-canvas/              ticked-app-map.canvas: the app and its data flows (open in Obsidian)
├── CLAUDE.md                     ← read this second
└── .gitignore                    (.env, .env.local, .mcp.json, node_modules, dist)
```

**A request, start to finish:**

```
Log in ──► Supabase Auth checks auth.users ──► access token (JWT, ~1 h) + refresh token
                                                 saved by supabase-js in localStorage

Ticked ──► db.js ──► GET /rest/v1/tasks
                     apikey: <publishable key>          (which project)
                     Authorization: Bearer <access JWT> (which user)
                         │
                         ▼
               Postgres: auth.uid() = the user's id from the token
               RLS: auth.uid() = user_id  → only their rows come back
```

**What the front end can call** (all in `front-end/src/data/db.js`):

| Area | Functions |
|---|---|
| Accounts | `register({ name, email, password })`, `logIn({ email, password })`, `logOut()`, `getCurrentUser()`. Each returns the profile `{ id, name, email }` from `public.users` (or `null`) |
| Projects | `listProjects`, `createProject`, `deleteProject` |
| Tasks | `listTasks` (with their tags), `createTask` (the `create_task_with_tags` RPC), `setTaskComplete`, `deleteTask` |
| Tags | `listTags`, `createTag` |
| Donations | `createDonationIntent(amount)`: calls the `process-donation` Edge Function with `supabase.functions.invoke` (sends the user's JWT, never a user id) and returns the Stripe `client_secret` |

Supabase Auth errors come back in the app's own words ("Wrong email or password", "An account with this email already exists"), with `err.field` saying which input they belong under.

**The database:**

```
auth.users ──trigger──► public.users (id, name, email)
                              │ user_id  (default auth.uid(), on delete cascade)
                    ┌─────────┴─────────┐
              public.projects ◄── public.tasks ──► task_tags ◄── tags (shared)

auth.users ──► public.donations (user_id, amount in cents, stripe_payment_intent_id, status)
               users can only read their own; only the stripe-webhook function writes
```

| Request | What comes back |
|---|---|
| Not logged in (publishable key only) | `[]` on reads, **401** on writes |
| Logged in, your rows | 200 / 201 / 204 |
| Logged in, adding a row as someone else | **403** "violates row-level security policy" |
| Logged in, PATCH or DELETE someone else's row | **204**, but nothing changes (RLS hides the row) |
| Logged in, a task in someone else's project | **403** (the task policies check the project's owner too) |
| Logged in, changing your own email in `users` | **403**: only `name` is editable (a column grant) |

---

## Donations (Stripe)

A coffee-mug button (bottom-right, every logged-in page) opens `/donate`. The user picks $5, $10, $25, $50 or their own amount (up to $10,000), types a card, and Stripe.js takes the payment. **Test mode only**: use card `4242 4242 4242 4242` (any future expiry, any CVC) to succeed and `4000 0000 0000 0002` to be declined.

```
Donate page ──► db.js createDonationIntent(cents)
                  └─► Edge Function process-donation   (verify_jwt true; user from the JWT)
                        └─► Stripe: create PaymentIntent (STRIPE_SECRET_KEY) ──► { client_secret }
Donate page ──► stripe.confirmCardPayment(client_secret)  ──► Stripe (card never touches our servers)
Stripe ──► Edge Function stripe-webhook   (verify_jwt false; signature checked)
             └─► public.donations: insert once per PaymentIntent (service role)
```

- **The browser never writes `donations`.** Only the webhook does, after checking Stripe's signature. Users can only read their own rows (RLS).
- **The user id is never sent from the front end.** `process-donation` reads it from the login and stores it in the PaymentIntent's metadata, which the webhook reads back.
- **Messages:** success shows "Thank you for your $X.XX donation"; a declined card shows a plain message (no Stripe codes); an unreachable function shows "Something went wrong" with a Retry button.

**One-time setup per Supabase project** (details in [`supabase/README.md`](supabase/README.md#donations-stripe)):

1. Deploy `supabase/functions/process-donation` (JWT on) and `supabase/functions/stripe-webhook` (JWT **off**, since Stripe has no Supabase login). With the Supabase MCP: `deploy_edge_function`.
2. Set two Edge Function secrets: `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`. They live only in Supabase, never in the repo or the browser.
3. In the Stripe dashboard (test mode) add a webhook destination at `https://<project-ref>.supabase.co/functions/v1/stripe-webhook` for `payment_intent.succeeded` and `payment_intent.payment_failed`. Thin and snapshot payloads both work. Copy its signing secret into `STRIPE_WEBHOOK_SECRET`.
4. Put the test publishable key in `front-end/.env.local` as `VITE_STRIPE_PUBLISHABLE_KEY`.

To check it: make a test payment, then look in `public.donations` for the row (status `succeeded`). If it's missing, read the `stripe-webhook` logs: every delivery logs the event type and what the function did with it.

The whole app, page by page, with its data flows, is drawn in [`obsidian-canvas/ticked-app-map.canvas`](obsidian-canvas/ticked-app-map.canvas) (open the folder as an Obsidian vault).

---

## Set up Claude Code like the class demo

The class demo uses **Claude Code in the terminal** with:

- **3 user-level MCP servers:** Playwright, Context7, Chrome DevTools.
- **1 project-level MCP server:** Supabase.
- **5 project skills.**
- **2 sub-agents.**

The skills and sub-agents are already in this repo (`.claude/`). Only the MCP servers need adding: run each command yourself, so you approve what gets installed.

```
your computer (every project)          this repo (.claude/ and .mcp.json)
├── playwright       (user MCP)        ├── .mcp.json → supabase  (project MCP, NOT committed)
├── context7         (user MCP)        ├── .claude/skills/   5 skills   (committed)
└── chrome-devtools  (user MCP)        └── .claude/agents/   2 agents   (committed)
```

### 1 · Install the tools (once per computer)

- **Node 20+** and **git**.
- **Claude Code**, then log in:
  ```bash
  curl -fsSL https://claude.ai/install.sh | bash
  claude          # first run: log in with your Claude account, then /exit
  ```

### 2 · The user-level MCP servers (once per computer)

In a normal terminal (not inside Claude Code):

```bash
claude mcp add --scope user playwright -- npx -y @playwright/mcp@latest
claude mcp add --scope user context7 -- npx -y @upstash/context7-mcp
claude mcp add --scope user chrome-devtools -- npx -y chrome-devtools-mcp@latest
claude mcp list        # all three: ✔ Connected
```

| MCP server | What the class uses it for |
|---|---|
| **Playwright** | Claude opens the app in a browser, clicks through it and checks each phase ("utilize playwright to ensure completion") |
| **Context7** | Up-to-date library docs (supabase-js, React Router, Vite) instead of Claude's memory |
| **Chrome DevTools** | Console errors, network requests and performance from a real Chrome |

If one says it already exists, that's fine.

### 3 · The Supabase MCP server (once per project)

From the **repo root**, not `front-end/`. Use your project ref, from your Supabase URL `https://<project-ref>.supabase.co`:

```bash
claude mcp add --scope project --transport http supabase "https://mcp.supabase.com/mcp?project_ref=<your-project-ref>"
```

1. That writes `.mcp.json` in the root. It holds your project ref, so it is in `.gitignore`: **never commit it**.
2. Start `claude` in the root. When it asks about the new MCP server, choose **Use this MCP server**.
3. Type `/mcp` → **supabase** → **Authenticate**. Approve in the browser tab that opens, then come back.

`project_ref=` limits Claude to this one project. Never give Claude the database password or the secret key; the MCP doesn't need them.

### 4 · Skills (already in the repo)

They're in `.claude/skills/`, so cloning gives them to you. Check with `/skills`:

| Skill | `/skills` shows | What it's for | Source |
|---|---|---|---|
| frontend-design | `frontend-design` | Distinct visual direction for UI work | [anthropics/skills](https://github.com/anthropics/skills) |
| ui-ux-pro-max | `ui-ux-pro-max` | UI/UX rules, palettes, font pairings | [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) |
| taste-skill | `design-taste-frontend` (this name is correct) | Anti-"AI look" art direction | [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) |
| design-motion-principles | `design-motion-principles` | Animation and interaction | [kylezantos/design-motion-principles](https://github.com/kylezantos/design-motion-principles) |
| postgresql-table-design | `postgresql-table-design` | Table design, types, indexes, constraints | [wshobson/agents](https://github.com/wshobson/agents) |

**Adding them to a new project** (run in that project's root; these are the scripts students used):

```bash
curl -fsSL https://kabeier.github.io/SPAs-and-Claude/lecture-2-building-spas/demo-kit/setup-skills.sh | bash      # the 4 design skills
curl -fsSL https://raw.githubusercontent.com/kabeier/Databases-and-Supabase/main/demo-kit/setup-db-skill.sh | bash  # postgresql-table-design
```

If a script fails, the [manual install guide](https://kabeier.github.io/SPAs-and-Claude/setup-guide.html) does the same thing by hand.

### 5 · Sub-agents (already in the repo)

They're in `.claude/agents/`. Check with `/agents`:

| Agent | Curriculum name | MCP servers it uses | Skills it loads |
|---|---|---|---|
| **front-end-agent** | "UI agent" | context7, playwright, chrome-devtools | frontend-design, ui-ux-pro-max, design-taste-frontend, design-motion-principles |
| **supabase-agent** (the curriculum's text, word for word) | "Supabase agent" | supabase, context7 | postgresql-table-design |

Both run on `model: sonnet` (in each file's frontmatter); the main session is the supervisor. An agent can only use an MCP server that's installed, which is why all four servers above are needed.

### 6 · Session habits from class

- Start `claude` in the **repo root**, where `.mcp.json` and `.claude/` are.
- `/model` → **Opus** for the big multi-step prompts.
- Use normal permission prompts: no skip-permissions flags. Approve MCP calls one by one. For file edits, "Yes, allow all edits during this session" is fine.

### Check it

Inside `claude`, from the repo root:

| Type | You should see |
|---|---|
| `/mcp` | playwright, context7, chrome-devtools, **supabase** (authenticated) |
| `/skills` | the 5 skills above |
| `/agents` | front-end-agent, supabase-agent |
| `/model` | Opus selected |

Then a quick test prompt: *"Using the Supabase MCP, list my tables. Don't change anything."* It should list users, projects, tasks, tags and task_tags.

---

## Handoff notes for the next instructor

### Where the class is

Lessons taught so far (all with Claude Code doing the typing and students approving):

| Curriculum | What students did | Lecture site |
|---|---|---|
| 09 / 1 Single Page Apps | Built Ticked's front end from `app_outline/` with a front-end sub-agent and design skills | [SPAs-and-Claude](https://kabeier.github.io/SPAs-and-Claude/) |
| 09 / 2 Relational DBs + Supabase | DrawSQL ERD; Claude built the tables via the Supabase MCP | [Databases-and-Supabase](https://kabeier.github.io/Databases-and-Supabase/) |
| 09 / 3 Full-Stack Apps | Postman against the auto REST API; restructured into `front-end/` + `supabase/` + one `.claude/`; connected through `db.js` with supabase-js | [Claude-and-full-stack-apps](https://kabeier.github.io/Claude-and-full-stack-apps/) |
| 09 / 4 Authentication | 401 vs 403, the four auth types, JWTs; backed up and dropped the tables; the curriculum's two phased prompts (Supabase, then Vite + React) verified with Playwright | [Claude-and-auth](https://kabeier.github.io/Claude-and-auth/) |

**What every student project should look like now** (their personal project and the Netflix clone):

- `front-end/` + `supabase/` side by side, one `.claude/` in the root, and the Supabase MCP in the root `.mcp.json`.
- `front-end/.env` or `front-end/.env.local` holds the URL and publishable key, and is gitignored.
- Supabase Auth with register, log in, log out and staying logged in after a refresh. Plus `public.users` filled by a trigger, and RLS with `auth.uid()`.
- **Each student's app was built live by Claude**, so it does the same things as this repo but the code differs: file names, a "confirm password" field, the exact policy names. Database rules are the same everywhere: `user_id` defaults to `auth.uid()`, and policies are `to authenticated` with `auth.uid() = user_id`. The front end never sends a `user_id`.
- **Students' env variable names vary.** Claude picked them: `VITE_SUPABASE_ANON_KEY`, `VITE_SUPABASE_PUBLISHABLE_KEY` or `VITE_SUPABASE_KEY`. They all mean the publishable key.
- This cohort started in Phase III, so **don't assume they've seen Django**.

### Ticked vs. what the Beyond Building lessons expect

| The lessons say | In Ticked | Tell students / Claude |
|---|---|---|
| `client/` folder, Vercel **Root Directory** `client/` | `front-end/` | Root Directory = `front-end`. `cd front-end` wherever the lesson says `cd client`. |
| "Your existing Axios instance" (Stripe prompt) | **No Axios.** All calls go through `front-end/src/data/db.js` with supabase-js | Either: "Call Edge Functions with `supabase.functions.invoke()` inside db.js" (it sends the user's JWT for you), or `npm install axios` first and have Claude add one instance in db.js. |
| "Your existing auth context" | `useAuth()` from `src/context/useAuth.js`: `user` (the profile `{ id, name, email }`, or `null`), `checking`, `register`, `logIn`, `logOut`. It does **not** expose the session or token | Need the token (e.g. for an Edge Function)? Keep it in db.js: `supabase.functions.invoke()` sends it automatically, or read it with `supabase.auth.getSession()` there. |
| React Router setup | React Router 7. Routes are in `src/App.jsx` | Put `/donate` **inside** `<RequireAuth>` so only logged-in users see it. |
| Supabase CLI "installed, authenticated, and linked" | Not set up yet: `supabase/` has no `config.toml`. Three practice Edge Functions (`hello-world`, `multiply-numbers`, `dog-picture`) were deployed through the Supabase MCP, so their source is only in the project (see [`supabase/README.md`](supabase/README.md)) | From the repo root: `npx supabase login`, then `npx supabase init` (adds `supabase/config.toml` next to `schema.sql`), then `npx supabase link --project-ref <ref>`. Functions go in `supabase/functions/`. Ticked's two donation functions already live there (`process-donation`, `stripe-webhook`). |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY`, `VITE_STRIPE_PUBLIC_KEY` | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` in `front-end/.env.local` | Keep Ticked's names. Ticked's Stripe key is `VITE_STRIPE_PUBLISHABLE_KEY` (in `front-end/.env.local` and in Vercel). |
| A root `.env` for `DOG_API_KEY` (server secrets) | `front-end/.env.local` for the browser; the root `.gitignore` already covers a root `.env` and `.mcp.json` | Check `git status` before every commit anyway. Deployed functions read secrets from `npx supabase secrets set`. `DOG_API_KEY` is already set as an Edge Function secret, and `dog-picture` uses it. |
| `donations.user_id` → `auth.users` | Ticked's tables point to `public.users` (same ids) | Either works. Follow the tasks table to stay consistent. |
| `main` / `dev` / `feature/*` branches | Only `main` | Create `dev` at the start of the DevOps lesson. |

**Things to tell Claude during the Stripe and deploy lessons:**
- **`stripe-webhook`** is called by Stripe, which has no Supabase login. Deploy it with `--no-verify-jwt`, or Stripe gets 401. Ticked's is deployed with `verify_jwt` false, checks Stripe's signature, and handles both thin and snapshot payloads.
- **`process-donation`** should take the user from the request's JWT, not from a `user_id` in the body. That's the same idea as Ticked's `default auth.uid()`, and it is how Ticked's `process-donation` works (the request body is just `{ "amount": cents }`).
- **Vercel deep links:** `front-end/vercel.json` already rewrites every path to `index.html`, so refreshing `/projects` works. Build with the default `BASE` (`/`). The `BASE=/sub/path/` variable and `main.jsx`'s `?p=` redirect are only for GitHub Pages.
- **After the first Vercel deploy:** Supabase → **Authentication → URL Configuration**. Set the **Site URL** to the Vercel URL, and add it, plus `http://localhost:5173`, to **Redirect URLs**.
- **Schema changes:** run new SQL in the SQL Editor, or as files in `supabase/migrations/` with `npx supabase db push`. Copy the change into `supabase/schema.sql` too, so it stays the source of truth.

### Claude Code setup the class is used to

- **Plain `claude`**, with normal permission prompts. Students choose "Yes, allow all edits during this session" and approve MCP calls one by one.
- **MCP servers are added with typed commands**, never a script: `claude mcp add …` (see [the setup](#set-up-claude-code-like-the-class-demo)). The Supabase one is project-scoped, in the root `.mcp.json`. Playwright, Context7 and Chrome DevTools are user-scoped.
- **Sub-agents** are in `.claude/agents/`:
  - `front-end-agent` maps to the curriculum's "UI agent".
  - `supabase-agent` (the curriculum's text, word for word) maps to the "Supabase agent".
  - The main session is the supervisor/orchestrator.
- **Planning:** prompts end with "Show me the plan first" or "Do you have any questions before…". Students read the plan out loud before approving. `/model` → Opus for big multi-agent prompts.
- **Never** paste the database password or the secret/service-role key into Claude or the front end.

### Known quirks

- **Status codes:** the anon role gets 401 when RLS refuses; a logged-in user gets 403. A PATCH or DELETE that matches nothing still returns 204. Students have seen all three.
- **Email:** Confirm email is **off** in the class projects. Supabase's built-in email sender is rate-limited (a few emails an hour), so turning it back on needs a custom SMTP provider.
- **The `create_task_with_tags` RPC** is the one custom endpoint. It saves a task and its tags in one transaction, and it runs as the caller (`security invoker`) so RLS applies.
- **Tags are shared** by all users on purpose (no `user_id`). Any signed-in user can add one; nobody can edit or delete them.
- **Profiles:** users can rename themselves but not change their email (locked by a column grant). Emails are unique ignoring case.
- **No seed data.** In class, the pre-login test data was backed up to CSV and **not** re-imported (it belonged to a Demo User with no login). The CSVs aren't in this repo. New accounts start empty.
- **`rls_auto_enable()`** is in the live project but not in `schema.sql` (Supabase added it). Never drop it.
- **`front-end/.env` (no `.local`)** may exist on the class machine from Friday with an old `VITE_SUPABASE_ANON_KEY` line. Vite reads both files and `.env.local` wins; the app only uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`, so the old line is ignored. Both files are gitignored.
- **Security Advisor warnings you'll see** (Supabase → Advisors):
  - `rls_auto_enable()` "can be called by anon/authenticated". It's Supabase's own function: it turns RLS on for every new table. **Don't drop it.** To silence the warning, ask Claude to `revoke execute on function rls_auto_enable() from anon, authenticated` (the function keeps working).
  - "Leaked password protection is off": an Auth setting. Optional.
- **Test accounts:** Playwright made throwaway accounts and deleted them. The class registered real ones (e.g. maria@ / sam@ticked.app) by hand. Delete leftovers in Authentication → Users; deleting an account deletes its rows too (cascade).
- **Stripe test data:** the donation checks made real Stripe **test-mode** payments and a few throwaway accounts (emails like `donate…@example.com`). Delete the accounts in Authentication → Users; their `donations` rows go with them (cascade).
- **Thin webhook payloads:** the Stripe webhook destination here sends thin events (`v1.payment_intent.succeeded`, no data). `stripe-webhook` fetches the PaymentIntent from Stripe to get the amount and user, so it needs `STRIPE_SECRET_KEY` as well as `STRIPE_WEBHOOK_SECRET`.

TRIAL