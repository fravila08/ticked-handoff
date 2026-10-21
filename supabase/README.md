# Supabase project

The back end for Ticked: Postgres + Auth + auto-generated REST API + Edge Functions, all on one Supabase project (ref `wtouwomhgbsnwuxdudld`, `https://wtouwomhgbsnwuxdudld.supabase.co`). The ref is also in the gitignored `.mcp.json` and `front-end/.env.local`.

## What's in this folder

| File | What it is |
|---|---|
| `schema.sql` | The source of truth for the database. Matches the live project. Needs an empty project to run. |
| `functions/process-donation/index.ts`, `functions/stripe-webhook/index.ts` | Source of the two donation Edge Functions (the three practice functions below are not in the repo). |
| `DONATION_REVIEW.md` | The supervisor's review of the donation feature: requirements, checks, findings. |
| `user_stories.md` | The 8 stories the database has to remember. |
| `task-manager-erd.png` | The original ERD (DrawSQL), before logins were added. |

## Database

Six tables in `public`, all with row level security on:

- `users`: profile for Supabase Auth (`id` = `auth.users` id). Filled by the `on_auth_user_created` trigger at sign-up. Users can edit only `name`.
- `projects`, `tasks`, `task_tags`: each user sees only their own. `user_id` defaults to `auth.uid()`, so the front end never sends it.
- `tags`: shared. Any signed-in user can read and add; nobody can edit or delete.
- `donations`: one-time Stripe donations (`user_id` -> `auth.users`, `amount` in cents, unique `stripe_payment_intent_id`, `status` `succeeded`/`failed`). Users can only read their own rows; only the service role (the `stripe-webhook` function) writes. See `schema.sql` section 8.

Deleting a project keeps its tasks (`project_id` becomes null). One custom endpoint: `create_task_with_tags(...)` (`POST /rest/v1/rpc/create_task_with_tags`), executable by `authenticated` only.

**Never drop `rls_auto_enable()`.** It's Supabase's event-trigger function that turns RLS on for new tables, and it isn't in `schema.sql`.

## Auth

Supabase Auth with email + password. Email confirmation is **off**, so Register logs straight in. The front end signs in through `front-end/src/data/db.js` with supabase-js and the publishable key.

## Edge Functions

Five functions are deployed. The first three (`hello-world`, `multiply-numbers`, `dog-picture`) have **`verify_jwt: false`** (no authentication or authorization) and **CORS open to every origin** (`Access-Control-Allow-Origin: *`; `OPTIONS` preflight returns 204). The two donation functions are described under Donations below. Base URL: `https://wtouwomhgbsnwuxdudld.supabase.co/functions/v1/`.

| Function | Request | Success | Errors |
|---|---|---|---|
| `hello-world` | `GET` (any) | 200 `{"message":"hello, supabase is up and running."}` | none |
| `multiply-numbers` | `GET ?a=3&b=4` or `POST {"a":3,"b":4}` | 200 `{"a":3,"b":4,"result":12}` | 400 missing, non-numeric or invalid JSON; 405 other methods |
| `dog-picture` | `GET ?name=German Shepherd` | 200 `{"img":"https://cdn4.thedogapi.com/optimized/kc6oAx2b3X.jpg"}` | 400 no `name`; 404 no breed or image found; 405 non-GET; 500 `DOG_API_KEY` missing; 502 Dog API failed |

```bash
curl https://wtouwomhgbsnwuxdudld.supabase.co/functions/v1/hello-world
curl "https://wtouwomhgbsnwuxdudld.supabase.co/functions/v1/multiply-numbers?a=3&b=4"
curl -G --data-urlencode "name=German Shepherd" https://wtouwomhgbsnwuxdudld.supabase.co/functions/v1/dog-picture
```

- `dog-picture` calls `https://api.thedogapi.com/v1/breeds/search?q={name}` (the name is URL-encoded, so spaces work) with the `x-api-key` header. It returns the image URL of the first matching breed that has one.
- **Secret:** `DOG_API_KEY` is set under Edge Function secrets. It is never in the repo or sent to the browser.
- **Cost warning:** `dog-picture` is public, so anyone with the URL spends your Dog API quota. Turn `verify_jwt` on, or add rate limiting, before sharing it widely.
- **Where the code lives:** these functions were deployed with the Supabase MCP (`deploy_edge_function`), so their source is **only in the Supabase project**, not in this repo. The Supabase CLI isn't set up (no `config.toml` or `functions/` folder). To keep the code in git, run `npx supabase init`, `npx supabase link --project-ref wtouwomhgbsnwuxdudld`, then `npx supabase functions download <name>` for each one.
- The front end doesn't call these three. It calls only `process-donation` (below), from `db.js` with `supabase.functions.invoke()`.

## Donations (Stripe)

Two more Edge Functions, source in `supabase/functions/<name>/index.ts` (deployed with `deploy_edge_function`; keep them in step).

| Function | `verify_jwt` | What it does |
|---|---|---|
| `process-donation` | **true** | `POST { "amount": 1000 }` (cents, integer, 1 to 1000000) with the user's `Authorization` header. Checks the login with `auth.getUser()` (401 if none), creates a Stripe PaymentIntent (usd, card only, `metadata.user_id` = the JWT user id, never taken from the body) and returns `{ "client_secret": "..." }`. 400 bad amount, 405 non-POST, 502 Stripe failure (generic message). CORS allows browsers. |
| `stripe-webhook` | **false** (Stripe sends no JWT) | `POST` only. Verifies `Stripe-Signature` on the raw body with `constructEventAsync` (400 on failure). Handles `payment_intent.succeeded` and `payment_intent.payment_failed` in both payload styles: snapshot (`data.object`) and thin (`v1.`-prefixed type, `related_object`, no data). A thin event makes the function fetch the PaymentIntent (`GET /v1/payment_intents/{id}`, `STRIPE_SECRET_KEY`), and the amount, `metadata.user_id` and status come from that fetched intent (a Stripe 5xx/429/network error returns 500 so Stripe retries; a 404 or similar returns 200 with a log line). Skips if the payment intent id is already in `donations`, else inserts with the service role. Every delivery logs event type, id and the action taken (never secrets). Other events and intents without `user_id` return 200 without inserting. |

- **Secrets** (Edge Function secrets, never in the repo): `STRIPE_SECRET_KEY` (used by `process-donation` and by `stripe-webhook` to fetch PaymentIntents for thin events), `STRIPE_WEBHOOK_SECRET`. `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are provided by the platform.
- **Stripe dashboard webhook endpoint:** `https://wtouwomhgbsnwuxdudld.supabase.co/functions/v1/stripe-webhook`, events `payment_intent.succeeded` and `payment_intent.payment_failed`; thin or snapshot payloads both work.
- The webhook is the only writer of `donations`; the browser never inserts rows.

**How a donation flows**

```
1  Browser ─ supabase.functions.invoke('process-donation', { amount }) + user JWT ─► process-donation
2  process-donation ─ auth.getUser(JWT), validate amount ─ POST /v1/payment_intents ─► Stripe
3  Stripe ─► process-donation ─► Browser:  { client_secret }
4  Browser (Stripe.js) ─ confirmCardPayment(client_secret) ─► Stripe          (card goes to Stripe only)
5  Stripe ─ signed POST (payment_intent.succeeded / .payment_failed) ─► stripe-webhook
6  stripe-webhook ─ verify signature ─ (thin event: GET /v1/payment_intents/{id}) ─ insert once ─► donations
```

**Rules the functions enforce**

- `process-donation`: POST only; 401 without a valid login; `amount` must be an integer of cents from 1 to 1,000,000 ($10,000), else 400; the user id comes only from the JWT (any `user_id` in the body is ignored); Stripe errors become a generic 502.
- `stripe-webhook`: POST only; the signature is checked against the raw request body, 400 if missing or wrong; idempotent (an existing `stripe_payment_intent_id` is skipped, and the unique constraint covers a race); an intent without `metadata.user_id` is logged and not inserted; an unexpected database error returns 500 so Stripe retries.
- **Thin payloads:** the Stripe destination here sends thin events (type `v1.payment_intent.succeeded`, `related_object.id`, no data). The webhook strips the `v1.` prefix and fetches the PaymentIntent from Stripe, and checks its status matches the event before inserting. Snapshot payloads (`data.object`) work too.
- **Logs:** each webhook delivery logs one JSON line (`event_type`, `event_id`, `style` thin or snapshot, `normalized_type`, `action`). The `action` says what happened: `inserted`, `skipped-duplicate`, `ignored-type`, `ignored-no-user`, `ignored-status-mismatch`, `ignored-fetch-failed`, `ignored-no-object` or `fetch-error-retry`. Secrets, the signature header and card data are never logged.

**Setting it up on a new project**

1. Apply `schema.sql` (section 8 creates `donations`).
2. Deploy both functions from `supabase/functions/` (MCP `deploy_edge_function`, or `npx supabase functions deploy`). `process-donation` keeps JWT verification on; `stripe-webhook` needs it **off** (`--no-verify-jwt`).
3. Set the secrets `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` (`npx supabase secrets set`, or the dashboard). Never write their values into a file.
4. In Stripe (test mode), add the webhook destination above and copy its signing secret into `STRIPE_WEBHOOK_SECRET`.

**Testing it** (Stripe test mode only): card `4242 4242 4242 4242` succeeds and `4000 0000 0000 0002` is declined; any future expiry and any CVC. Then `select * from public.donations;` should show a `succeeded` row (a declined card, a `failed` one). If a row is missing, check the Edge Function logs for `stripe-webhook`, and in Stripe the destination's event deliveries (Resend is safe: the handler is idempotent).

**Known limits:** a `failed` row for a PaymentIntent blocks a later `succeeded` event for the same one (the UI starts a new PaymentIntent on every submit, so it doesn't happen today); `process-donation` has no rate limit and no Stripe idempotency key; CORS allows any origin (acceptable because a JWT is required).

## Working with it

- **Schema changes:** run new SQL in the SQL Editor (or the MCP's `apply_migration`), then copy the change into `schema.sql`.
- **Claude Code:** the Supabase MCP server is project-scoped in the root `.mcp.json`. Authenticate with `/mcp` → supabase → Authenticate. The `supabase-agent` in `.claude/agents/` is the back-end specialist.
- **Advisors:** `rls_auto_enable()` shows a "callable by anon/authenticated" warning. That's expected; see the root README.
