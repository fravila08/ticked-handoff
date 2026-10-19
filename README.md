# Ticked: full-stack task manager with logins

Ticked is the running example app for Code Platoon Phase III. It's a React + Vite task manager (tasks, projects, tags, due dates) on Supabase, with **Supabase Auth** logins. Each person sees only their own projects and tasks, and the database enforces that with Row Level Security.

This is where the class left off **at the end of 09-Building-Applications / 4-authentication**. It's ready for **10-Beyond-Building**.

- [Run it](#run-it)
- [How it fits together](#how-it-fits-together)
- [Set up Claude Code like the class demo](#set-up-claude-code-like-the-class-demo)
- [Handoff notes for the next instructor](#handoff-notes-for-the-next-instructor)

---

## Run it

You need Node 20+, a free Supabase project, and about 10 minutes.

1. **Database:** Supabase → **SQL Editor** → paste [`supabase/schema.sql`](supabase/schema.sql) → **Run**. It needs an empty project. It makes the 5 tables, the trigger, the RLS policies and one function.
2. **Email confirmation (for class):** **Authentication → Sign In / Providers → Email** → turn **Confirm email** off → Save.
   - With it on, new accounts can't log in until they click an emailed link. Playwright can't open an inbox, and Supabase's built-in email sender only allows a few emails an hour.
   - Real apps keep it on.
3. **Keys:**
   ```bash
   cd front-end
   cp .env.example .env
   ```
   - Fill in `VITE_SUPABASE_URL`: Integrations → Data API → Project URL, **without** `/rest/v1/` and with no trailing slash.
   - Fill in `VITE_SUPABASE_PUBLISHABLE_KEY`: Project Settings → API Keys → publishable key.
   - `.env` is in `front-end/.gitignore`.
4. **Start it:**
   ```bash
   npm install
   npm run dev        # http://localhost:5173
   ```
   Register an account, add a task, and refresh: you're still logged in. Open a private window and register a second account: it sees none of the first account's tasks.

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
│   │   ├── data/db.js            ← the ONLY file that talks to Supabase
│   │   ├── context/AuthContext   ← who is logged in: useAuth()
│   │   ├── context/TaskContext   ← their data: useTasks()
│   │   ├── components/RequireAuth.jsx, AuthLayout.jsx, TopBar.jsx …
│   │   └── pages/Login, Register, Tasks, NewTask, Projects, ProjectDetail
│   ├── .env.example
│   └── vercel.json  (SPA rewrite for Vercel)
├── supabase/
│   ├── schema.sql                ← the source of truth for the database
│   ├── user_stories.md
│   └── task-manager-erd.png      (the original design, before logins)
├── CLAUDE.md                     ← read this second
└── .gitignore                    (.env, .mcp.json, node_modules, dist)
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

**The database:**

```
auth.users ──trigger──► public.users (id, name, email)
                              │ user_id  (default auth.uid(), on delete cascade)
                    ┌─────────┴─────────┐
              public.projects ◄── public.tasks ──► task_tags ◄── tags (shared)
```

| Request | What comes back |
|---|---|
| Not logged in (publishable key only) | `[]` on reads, **401** on writes |
| Logged in, your rows | 200 / 201 / 204 |
| Logged in, adding a row as someone else | **403** "violates row-level security policy" |
| Logged in, PATCH or DELETE someone else's row | **204**, but nothing changes (RLS hides the row) |

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
- `front-end/.env` holds the URL and publishable key, and `.env` is listed in `front-end/.gitignore`.
- Supabase Auth with register, log in, log out and staying logged in after a refresh. Plus `public.users` filled by a trigger, and RLS with `auth.uid()`.
- **Each student's app was built live by Claude**, so it does the same things as this repo but the code differs: file names, a "confirm password" field, the exact policy names. Database rules are the same everywhere: `user_id` defaults to `auth.uid()`, and policies are `to authenticated` with `auth.uid() = user_id`. The front end never sends a `user_id`.
- **Students' env variable names vary.** Claude picked them: `VITE_SUPABASE_ANON_KEY`, `VITE_SUPABASE_PUBLISHABLE_KEY` or `VITE_SUPABASE_KEY`. They all mean the publishable key.
- This cohort started in Phase III, so **don't assume they've seen Django**.

### Ticked vs. what the Beyond Building lessons expect

| The lessons say | In Ticked | Tell students / Claude |
|---|---|---|
| `client/` folder, Vercel **Root Directory** `client/` | `front-end/` | Root Directory = `front-end`. `cd front-end` wherever the lesson says `cd client`. |
| "Your existing Axios instance" (Stripe prompt) | **No Axios.** All calls go through `front-end/src/data/db.js` with supabase-js | Either: "Call Edge Functions with `supabase.functions.invoke()` inside db.js" (it sends the user's JWT for you), or `npm install axios` first and have Claude add one instance in db.js. |
| "Your existing auth context" | `useAuth()` from `src/context/useAuth.js`: `user.id`, `user.email`, `profile.name`, `session.access_token` | — |
| React Router setup | React Router 7. Routes are in `src/App.jsx` | Put `/donate` **inside** `<RequireAuth>` so only logged-in users see it. |
| Supabase CLI "installed, authenticated, and linked" | Not set up yet: `supabase/` only has `schema.sql` | From the repo root: `npx supabase login`, then `npx supabase init` (adds `supabase/config.toml` next to `schema.sql`), then `npx supabase link --project-ref <ref>`. Functions go in `supabase/functions/`. |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY`, `VITE_STRIPE_PUBLIC_KEY` | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | Keep Ticked's names; add `VITE_STRIPE_PUBLIC_KEY` to `front-end/.env` and to Vercel. |
| A root `.env` for `DOG_API_KEY` (server secrets) | `front-end/.env` for the browser; the root `.gitignore` already covers a root `.env` and `.mcp.json` | Check `git status` before every commit anyway. Deployed functions read secrets from `npx supabase secrets set`. |
| `donations.user_id` → `auth.users` | Ticked's tables point to `public.users` (same ids) | Either works. Follow the tasks table to stay consistent. |
| `main` / `dev` / `feature/*` branches | Only `main` | Create `dev` at the start of the DevOps lesson. |

**Things to tell Claude during the Stripe and deploy lessons:**
- **`stripe-webhook`** is called by Stripe, which has no Supabase login. Deploy it with `--no-verify-jwt`, or Stripe gets 401.
- **`process-donation`** should take the user from the request's JWT, not from a `user_id` in the body. That's the same idea as Ticked's `default auth.uid()`.
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
- **Tags are shared** by all users on purpose (no `user_id`).
- **Security Advisor warnings you'll see** (Supabase → Advisors):
  - `rls_auto_enable()` "can be called by anon/authenticated". It's Supabase's own function: it turns RLS on for every new table. **Don't drop it.** To silence the warning, ask Claude to `revoke execute on function rls_auto_enable() from anon, authenticated` (the function keeps working).
  - "Leaked password protection is off": an Auth setting. Optional.
- **Test accounts:** Playwright made throwaway accounts and deleted them. The class registered real ones (e.g. maria@ / sam@ticked.app) by hand. Delete leftovers in Authentication → Users; deleting an account deletes its rows too (cascade).
