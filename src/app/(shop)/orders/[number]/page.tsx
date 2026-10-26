import { notFound } from "next/navigation";
import { getOrderForViewer } from "@/lib/checkout";
import { formatMoney } from "@/lib/money";
import { getCurrentUser } from "@/lib/session";
import { emailProviderName } from "@/lib/email";

export const metadata = { title: "Order" };

export default async function OrderConfirmationPage({ params, searchParams }: { params: Promise<{ number: string }>; searchParams: Promise<{ token?: string; return?: string }> }) {
  const { number } = await params;
  const query = await searchParams;
  const user = await getCurrentUser();
  const order = await getOrderForViewer(number, { userId: user?.id, token: query.token });
  if (!order) notFound();
  const payment = order.payments[0];
  const providerNote = emailProviderName() ? null : "A confirmation email was not sent. Email is not configured, so the message is only in the shop outbox.";
  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <p className="text-sm uppercase tracking-wide text-primary">Order {order.number}</p>
      <h1 className="mt-2 font-display text-5xl">{order.status === "CONFIRMED" ? "Confirmed" : order.status === "PENDING" ? "Waiting for payment" : order.status}</h1>
      {query.return ? <p className="mt-4 rounded-2xl bg-warm p-4 text-sm">Returning from a card page does not mark this order paid. Status below is read from the database.</p> : null}
      <p className="mt-4 text-muted">{payment?.provider === "COD" ? "Pay cash when the order is delivered." : "Card payment is recorded only after a verified webhook."}</p>
      {order.needsRefund ? <p className="mt-3 text-sale">Payment was captured but the stock was no longer available. This order needs a refund. Nothing was marked delivered.</p> : null}
      {providerNote ? <p className="mt-3 text-sm text-muted">{providerNote}</p> : null}
      <dl className="mt-8 space-y-2 text-sm">
        <div className="flex justify-between"><dt>Items</dt><dd>{formatMoney(order.subtotalCents, order.currency)}</dd></div>
        <div className="flex justify-between"><dt>Discounts</dt><dd>{formatMoney(order.discountCents, order.currency)}</dd></div>
        <div className="flex justify-between"><dt>Shipping</dt><dd>{formatMoney(order.shippingCents, order.currency)} · {order.shippingName}</dd></div>
        <div className="flex justify-between"><dt>Tax</dt><dd>{formatMoney(order.taxCents, order.currency)}</dd></div>
        <div className="flex justify-between font-semibold"><dt>Total</dt><dd>{formatMoney(order.totalCents, order.currency)}</dd></div>
        <div className="flex justify-between"><dt>Payment</dt><dd>{payment?.provider} · {payment?.status}</dd></div>
        {order.trackingNumber ? <div className="flex justify-between"><dt>Tracking</dt><dd>{order.trackingCarrier} {order.trackingNumber}</dd></div> : null}
      </dl>
      <ul className="mt-6 divide-y divide-line text-sm">
        {order.items.map((item) => <li key={item.id} className="py-2">{item.quantity} × {item.name} ({item.variantTitle}) · {formatMoney(item.lineTotalCents, order.currency)}</li>)}
      </ul>
      {order.address ? <p className="mt-6 text-sm text-muted">{order.address.fullName}, {order.address.building}, {order.address.street}, {order.address.area}, {order.address.city}, {order.address.country}. {order.address.deliveryInstructions}</p> : null}
    </div>
  );
}
