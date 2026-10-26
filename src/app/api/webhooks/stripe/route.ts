import { applyStripeEvent, constructStripeEvent } from "@/lib/payments/stripe";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });
  const raw = await request.text();
  try {
    const event = constructStripeEvent(raw, signature);
    const result = await applyStripeEvent(event);
    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid webhook";
    return new Response(message, { status: 400 });
  }
}
