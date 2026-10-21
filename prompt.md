You are orchestrating a multi-agent implementation of a Stripe one-time donation feature 
for an existing Vite + React / Supabase task manager application. The application already 
has authentication and RLS policies on existing tables.

Execute the following three phases in order. Do not begin a new phase until the current 
phase's completion criteria are met.

You should prompt me for approval to validate and continue after completing each phase.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 1 — SUPABASE AGENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Leverage the supabase-agent scoped exclusively to the Supabase layer. This agent must not touch any front-end files and concentrate it's work within the `supabase` directory and leverage the supabase MCP. Utilize the @donation.png as a reference for the data table described below.

This agent is responsible for:

1. Creating a new Supabase Edge Function named `process-donation` that:
   - Accepts a POST request with body: { amount: number (in cents), user_id: string }
   - Validates that the user is authenticated and the amount is a positive integer 
     greater than 0 and no greater than 10,000 (i.e. $10,000 max)
   - Uses STRIPE_SECRET_KEY from Supabase secrets (never hardcoded) to create a 
     Stripe Payment Intent. You can reference this key as `STRIPE_SECRET_KEY` and note it's already a secret within the Supabase edge functions.
   - Returns: { client_secret: string }

2. Creating a `donations` table in the Supabase database with this schema:
   - id: uuid, primary key, default gen_random_uuid()
   - user_id: uuid, foreign key referencing auth.users
   - amount: integer (cents)
   - stripe_payment_intent_id: text, unique
   - status: text ('succeeded' or 'failed')
   - created_at: timestamptz, default now()

3. Creating a Row Level Security policy on `donations` such that:
   - Users can only SELECT their own rows (user_id = auth.uid())
   - No user can INSERT directly — inserts come only from the webhook handler
   - Service role can INSERT and UPDATE

4. Creating a new Supabase Edge Function named `stripe-webhook` that:
   - Listens for POST requests from Stripe
   - Validates the Stripe webhook signature using STRIPE_WEBHOOK_SECRET from 
     Supabase secrets. Know this secret already exists within Supabase and can be referenced to as `STRIPE_WEBHOOK_SECRET`
   - Handles `payment_intent.succeeded`: checks if stripe_payment_intent_id already 
     exists in `donations` (idempotency), and if not, inserts a row with 
     status='succeeded'
   - Handles `payment_intent.payment_failed`: same idempotency check, inserts with 
     status='failed'
   - Returns 200 for all handled events, 400 for signature failures

Phase 1 is complete when:
- Both Edge Functions exist and are deployable without errors
- The `donations` table exists with the correct schema
- RLS policies are in place and correct
- No Stripe secret key appears in any committed file

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 2 — UI AGENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Leverage the front-end-agent scoped exclusively to the React + Vite front end within the directory named `front-end`. This agent must not touch any Supabase files, Edge Functions, or database migrations. 

This agent is responsible for:

1. Creating a new React page component at the route `/donate` that:
   - Use @outcome.png as a reference for pinning a coffee mug at the lower right hand corner where if the user clicks it they should be directed to donate page.
   - Is registered in the existing React Router DOM setup
   - Displays a heading and brief description of the donation feature
   - Includes amount options (suggested: $5, $10, $25, $50) plus a custom amount 
     input
   - Embeds a Stripe Elements card input (CardElement) using @stripe/react-stripe-js
   - Has a "Donate" submit button

2. Implementing the payment flow in the donate page:
   - On submit, POST to the `process-donation` Edge Function with: { amount: selectedAmountInCents, user_id: currentUser.id }
   - The current user's id is available from the existing auth context
   - On receiving { client_secret }, use Stripe.js (stripe.confirmCardPayment) to confirm the Payment Intent directly with Stripe

3. Rendering clear result states:
   - On success: display a thank-you message that includes the donation amount
   - On failure: display a user-friendly error message (no raw Stripe error codes 
     or stack traces visible to the user)
   - On network error (Edge Function unreachable): display a generic "something went 
     wrong" message and a retry option

4. Running Playwright verification after completing the UI. Use the existing 
   Playwright MCP setup to:
   - Navigate to /donate and confirm the page renders with the expected heading
   - Confirm the Stripe Elements iframe is present in the DOM
   - Select the $10 amount option
   - Complete the card input using Stripe test card: 4242 4242 4242 4242, 
     any future expiry, any CVC
   - Submit and confirm the success state renders
   - Reset and use decline card: 4000 0000 0000 0002
   - Submit and confirm the error state renders with a human-readable message

Phase 2 is complete when:
- The /donate route renders without errors
- The Stripe Elements card input is present and functional
- The API call targets the correct Edge Function endpoint
- Stripe.js is used for payment confirmation
- All Playwright verification steps pass

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 3 — SUPERVISOR AGENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Spawn a sub-agent named supervisor with Opus as it's model and with read access to all files produced by Phase 1 and Phase 2. This agent must not write new feature code. It may only correct specific failures it identifies and document its findings.

This agent must first define its own passing requirements — before reviewing any 
code — based on what a correct, secure, production-ready Stripe one-time payment 
integration looks like. Document these requirements as a numbered list before 
proceeding.

Then review the output of both agents against those requirements, with explicit 
focus on:

1. API contract alignment: does the UI's Axios call body match exactly what the 
   `process-donation` Edge Function expects? Does it correctly consume 
   { client_secret } from the response?

2. Payment confirmation method: is stripe.confirmCardPayment (Stripe.js) being 
   used for the confirmation step — not a second Axios call?

3. Webhook registration: is the `stripe-webhook` Edge Function URL the one that 
   should be registered in the Stripe dashboard? Document the exact URL.

4. Idempotency: does the webhook handler check for an existing 
   stripe_payment_intent_id before inserting?

5. RLS correctness: can a user read another user's donation rows? Verify the 
   policy logic.

6. Security gate — CRITICAL: scan all front-end files for any occurrence of 
   STRIPE_SECRET_KEY or any string beginning with sk_. If found anywhere in 
   front-end code or committed environment files, this is a hard failure. 
   Report it immediately and halt.

After all checks pass, run the full Playwright suite one final time as an 
end-to-end integration verification.

Phase 3 output must include:
- The supervisor's self-defined passing requirements (numbered list)
- A pass/fail result for each check above
- The webhook URL to register in the Stripe dashboard
- The Playwright suite result (pass or specific failures)
- If any check failed: which agent is responsible and the exact correction needed

Phase 3 is complete when all checks pass and the final Playwright run succeeds.

do you have any questions?