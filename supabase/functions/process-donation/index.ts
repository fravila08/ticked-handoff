import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const MAX_AMOUNT_CENTS = 1_000_000; // $10,000

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  // Who is calling? The id comes only from the verified JWT.
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Not authenticated" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    return json({ error: "Not authenticated" }, 401);
  }
  const userId = userData.user.id;

  let body: { amount?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request" }, 400);
  }
  // Any user_id in the body is ignored on purpose.
  const amount = body?.amount;
  if (
    typeof amount !== "number" || !Number.isInteger(amount) ||
    amount <= 0 || amount > MAX_AMOUNT_CENTS
  ) {
    return json({ error: "Invalid amount" }, 400);
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) {
    console.error("STRIPE_SECRET_KEY is not set");
    return json({ error: "Payment could not be started" }, 500);
  }

  try {
    const params = new URLSearchParams();
    params.set("amount", String(amount));
    params.set("currency", "usd");
    params.append("payment_method_types[]", "card");
    params.set("metadata[user_id]", userId);

    const res = await fetch("https://api.stripe.com/v1/payment_intents", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });
    if (!res.ok) {
      console.error("Stripe PaymentIntent creation failed, status", res.status);
      return json({ error: "Payment could not be started" }, 502);
    }
    const intent = await res.json();
    if (!intent?.client_secret) {
      console.error("Stripe response had no client_secret");
      return json({ error: "Payment could not be started" }, 502);
    }
    return json({ client_secret: intent.client_secret });
  } catch (_err) {
    console.error("Stripe request error");
    return json({ error: "Payment could not be started" }, 502);
  }
});
