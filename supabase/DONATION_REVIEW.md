# Stripe donation feature: supervisor review (2026-10-21)

No secret values appear in this file.

## Passing requirements (written before reading the code)

1. The PaymentIntent is created only on the server, with a fixed currency and an amount the server has checked.
2. The Stripe secret key exists only as a server-side secret. It never appears in front-end code, built output, or committed files.
3. The webhook signing secret (whsec_) is server-only and never committed.
4. The client only gets the `client_secret`. Payment is confirmed in the browser with Stripe.js (`confirmCardPayment`), so card data never touches our servers.
5. The front end holds only the publishable key (pk_), in a gitignored env file.
6. The amount is an integer number of cents from 1 to 1,000,000. Anything else gets a 400.
7. The caller must be authenticated. The user id comes from the verified JWT (stored in PaymentIntent metadata), never from the request body.
8. The webhook verifies the Stripe signature against the raw body (`constructEventAsync`). A bad signature gets a 400.
9. The webhook is the source of truth: donation rows are written only from verified events, never by the client.
10. The webhook is idempotent: it looks for an existing `stripe_payment_intent_id`, and a UNIQUE constraint backs this up. A duplicate gets a 2xx with no second insert.
11. The webhook writes with the service role. anon and authenticated have no insert/update/delete grants or policies.
12. RLS is on, with a SELECT policy of `user_id = auth.uid()` for authenticated users only. anon gets nothing.
13. Errors shown to users are safe and readable. Stripe or internal details are logged on the server only.
14. CORS: OPTIONS preflight works, and CORS headers are sent on every response from the payment function.
15. Front-end data access goes through `db.js` (`supabase.functions.invoke`).
16. The deployed functions match the repo. `verify_jwt` is true on process-donation and false on the webhook.
17. Docs name the secrets (names only), the webhook URL and the events.
18. Test mode is used. The success and decline flows work end to end.

## Checks

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | API contract | PASS | `db.js:244-260`: `functions.invoke('process-donation', { body: { amount } })` returns `data.client_secret`. `process-donation/index.ts:43-56` reads only `amount` (any `user_id` in the body is ignored), and `:88` returns `{ client_secret }`. Playwright captured the request bodies: exactly `{"amount":1000}`. |
| 2 | Confirmation via Stripe.js | PASS | `Donate.jsx:80-82`: `stripe.confirmCardPayment(secret, { payment_method: { card } })`. There is no second HTTP call to our back end. |
| 3 | Webhook URL | PASS (documented) | `get_project_url` returned `https://wtouwomhgbsnwuxdudld.supabase.co`. Endpoint: `https://wtouwomhgbsnwuxdudld.supabase.co/functions/v1/stripe-webhook`. Events: `payment_intent.succeeded`, `payment_intent.payment_failed` (`supabase/README.md:63`). |
| 4 | Idempotency | PASS | `stripe-webhook/index.ts:56-65` looks up the existing row first, and `:73-75` treats unique violation 23505 as already processed. Live: `UNIQUE (stripe_payment_intent_id)` plus the unique index `donations_stripe_payment_intent_id_key`. |
| 5 | RLS | PASS | Live: `relrowsecurity = true`. The only policy is `donations: read own`, SELECT, role `authenticated`, `user_id = (select auth.uid())`. Grants: authenticated has SELECT only; anon has none; service_role has all (`schema.sql` section 8, lines 293-318). A user can't read other users' rows or write any row. |
| 6 | Security gate | PASS | `git ls-files` plus a working-tree grep (node_modules excluded, dist included) found no `sk_test_`/`sk_live_`/`rk_`/`whsec_` key shapes, and a fresh `dist/` is clean too. `STRIPE_SECRET_KEY` appears only as `Deno.env.get(...)` in the functions and as a name in the docs. `front-end/.env` is gitignored (`front-end/.gitignore:26`) and holds only a `pk_test_` Stripe key. `front-end/.env.local` does not exist. |

Other points:
- process-donation: integer amount from 1 to 1,000,000 (`index.ts:18,51-56`). `auth.getUser()` check, and a live unauthenticated call returned 401. `verify_jwt` is true on the deployed function. CORS: preflight returns 204, and headers go out on every response (`:4-16`). Error messages are generic.
- stripe-webhook: raw body read with `req.text()` (`:22`), then `constructEventAsync` with the SubtleCrypto provider. Live: no signature returns 400, a bad signature returns 400 "Invalid signature" (which also proves `STRIPE_WEBHOOK_SECRET` is set), GET returns 405.
- The deployed source of both functions is byte-identical to `supabase/functions/*/index.ts`.
- Lint passes; the build passes.

## Playwright (local dev server, Stripe test mode)

PASS. Steps: registered a new account, then confirmed the mug links to `/donate` (and is hidden there). The heading reads "Support Ticked" and 3 Stripe iframes loaded. $10 with card 4242 showed "Thank you for your $10.00 donation". "Donate again" reset the form ($10 selected again). Card 4000 0000 0000 0002 showed "Your card has been declined. Check the card details or try another card." The only console error was Stripe's expected 402 on the decline.

## Resolved: the webhook recorded no rows

Finding: after the run, `public.donations` had 0 rows. Function logs showed 7 signed POSTs, all 200, each taking the silent `Ignored` branch.

Cause: the Stripe destination uses **thin** payloads (`object: "v2.core.event"`, type `v1.payment_intent.succeeded`, `related_object` instead of `data`), which the handler did not match. The dashboard setting could not be changed.

Fix (`stripe-webhook` v2): the handler now strips an optional `v1.` prefix, accepts snapshot events (`data.object`) as before, and for thin events fetches the PaymentIntent from Stripe with `STRIPE_SECRET_KEY` (amount and `metadata.user_id` come from the fetched intent, and its status must match the event). Each delivery logs `event.type`, `event.id`, normalized type and the action taken. See `README.md`.

Status: deployed and the 400/405 paths re-checked. A validly signed thin event end to end is NOT yet verified; after deploy, Resend recent events from the destination's event deliveries in Stripe (safe, the handler is idempotent), then check `public.donations` and the function logs.

## Lower-severity notes (not blocking)

- Webhook (supabase-agent): if a `failed` row exists for an intent, a later `succeeded` event for the same intent is dropped as "Already processed". The UI creates a new intent on every submit, so this doesn't happen today. Upgrading `failed` to `succeeded` would make it robust.
- process-donation has no rate limit or Stripe `Idempotency-Key`. A double submit is blocked by the UI's `submitting` state.
- CORS is `*`. That's acceptable because the function needs a bearer JWT, but it could be limited to the app's origin.
- Advisors: only pre-existing warnings (`rls_auto_enable`, leaked-password protection). Nothing about donations.

## Fix applied by the supervisor

- `front-end/.env.example`: the change had replaced the placeholder with the project's real Supabase publishable key (not a secret, but it shouldn't be committed). Restored `sb_publishable_your_key_here`.
