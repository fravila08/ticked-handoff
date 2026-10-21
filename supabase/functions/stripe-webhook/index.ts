import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@17";
import { createClient } from "npm:@supabase/supabase-js@2";

// Stripe sends no JWT, so this function is deployed with verify_jwt false.
// Authenticity comes from the Stripe-Signature header instead.
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  httpClient: Stripe.createFetchHttpClient(),
});
const cryptoProvider = Stripe.createSubtleCryptoProvider();

const text = (body: string, status: number) =>
  new Response(body, { status, headers: { "Content-Type": "text/plain" } });

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return text("Method not allowed", 405);

  const signature = req.headers.get("Stripe-Signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!signature || !webhookSecret) return text("Bad request", 400);

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      webhookSecret,
      undefined,
      cryptoProvider,
    );
  } catch (_err) {
    console.error("Webhook signature verification failed");
    return text("Invalid signature", 400);
  }

  // Thin payloads (object "v2.core.event") have no `data` and a "v1." type
  // prefix; snapshot payloads have `data.object`. Handle both.
  // deno-lint-ignore no-explicit-any
  const ev = event as any;
  const normalizedType = String(ev.type ?? "").replace(/^v1\./, "");
  const style = ev.data?.object ? "snapshot" : "thin";
  const log = (action: string) =>
    console.log(
      JSON.stringify({
        event_type: ev.type,
        event_id: ev.id,
        style,
        normalized_type: normalizedType,
        action,
      }),
    );

  let status: "succeeded" | "failed";
  if (normalizedType === "payment_intent.succeeded") status = "succeeded";
  else if (normalizedType === "payment_intent.payment_failed") status = "failed";
  else {
    log("ignored-type");
    return text("Ignored", 200);
  }

  let intent: Stripe.PaymentIntent;
  if (ev.data?.object) {
    intent = ev.data.object as Stripe.PaymentIntent;
  } else if (ev.related_object?.type === "payment_intent" && ev.related_object?.id) {
    // Never trust a thin event for amount or user: fetch the PaymentIntent.
    const piId = String(ev.related_object.id);
    let res: Response;
    try {
      res = await fetch(
        `https://api.stripe.com/v1/payment_intents/${encodeURIComponent(piId)}`,
        { headers: { Authorization: `Bearer ${Deno.env.get("STRIPE_SECRET_KEY") ?? ""}` } },
      );
    } catch (_err) {
      console.error("Stripe fetch network error for", piId);
      log("fetch-error-retry");
      return text("Server error", 500);
    }
    if (res.status >= 500 || res.status === 429) {
      console.error("Stripe fetch failed with", res.status, "for", piId);
      log("fetch-error-retry");
      return text("Server error", 500);
    }
    if (!res.ok) {
      console.error("Stripe fetch failed permanently with", res.status, "for", piId);
      log("ignored-fetch-failed");
      return text("Ignored", 200);
    }
    intent = await res.json() as Stripe.PaymentIntent;
    if (status === "succeeded" && intent.status !== "succeeded") {
      console.error("PaymentIntent", intent.id, "status is", intent.status, "not succeeded; skipped");
      log("ignored-status-mismatch");
      return text("Ignored", 200);
    }
    if (status === "failed" && intent.status === "succeeded") {
      console.error("PaymentIntent", intent.id, "already succeeded; failed event skipped");
      log("ignored-status-mismatch");
      return text("Ignored", 200);
    }
  } else {
    log("ignored-no-object");
    return text("Ignored", 200);
  }

  const userId = intent.metadata?.user_id;
  if (!userId) {
    console.error("PaymentIntent", intent.id, "has no metadata.user_id; skipped");
    log("ignored-no-user");
    return text("Skipped", 200);
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Idempotency: Stripe retries and may send an event more than once.
  const { data: existing, error: lookupError } = await admin
    .from("donations")
    .select("id")
    .eq("stripe_payment_intent_id", intent.id)
    .maybeSingle();
  if (lookupError) {
    console.error("Donation lookup failed:", lookupError.code);
    return text("Server error", 500);
  }
  if (existing) {
    log("skipped-duplicate");
    return text("Already processed", 200);
  }

  const { error: insertError } = await admin.from("donations").insert({
    user_id: userId,
    amount: intent.amount,
    stripe_payment_intent_id: intent.id,
    status,
  });
  if (insertError) {
    // 23505 = unique violation: a concurrent delivery won the race.
    if (insertError.code === "23505") {
      log("skipped-duplicate");
      return text("Already processed", 200);
    }
    console.error("Donation insert failed:", insertError.code);
    return text("Server error", 500);
  }

  log("inserted");
  return text("OK", 200);
});
