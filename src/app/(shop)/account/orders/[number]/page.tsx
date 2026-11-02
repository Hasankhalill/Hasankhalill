import { notFound } from "next/navigation";
import { reviewAction } from "@/app/actions/store";
import { getOrderForViewer } from "@/lib/checkout";
import { formatMoney } from "@/lib/money";
import { requireUser } from "@/lib/session";
import { BoundForm } from "@/components/bound-form";

export const metadata = { title: "Order" };

export default async function AccountOrderPage({ params }: { params: Promise<{ number: string }> }) {
  const user = await requireUser();
  const { number } = await params;
  const order = await getOrderForViewer(number, { userId: user.id });
  if (!order) notFound();
  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="font-display text-5xl">{order.number}</h1>
      <p className="mt-2 text-muted">{order.status} · {order.payments[0]?.provider} · {order.payments[0]?.status}</p>
      {order.trackingNumber ? <p className="mt-2">Tracking {order.trackingCarrier || ""} {order.trackingNumber}</p> : <p className="mt-2 text-sm text-muted">No tracking number yet.</p>}
      <ul className="mt-6 divide-y divide-line text-sm">
        {order.items.map((item) => (
          <li key={item.id} className="py-3">
            {item.quantity} × {item.name} · {formatMoney(item.lineTotalCents, order.currency)}
            {order.status === "DELIVERED" ? (
              <BoundForm action={reviewAction} className="mt-3 grid gap-2">
                <input type="hidden" name="productId" value={item.productId} />
                <input type="hidden" name="orderId" value={order.id} />
                <label className="field"><span>Rating</span><input name="rating" type="number" min={1} max={5} required /></label>
                <label className="field"><span>Title</span><input name="title" required /></label>
                <label className="field"><span>Review</span><textarea name="body" required rows={3} /></label>
                <button className="btn w-fit" type="submit">Save review</button>
              </BoundForm>
            ) : null}
          </li>
        ))}
      </ul>
      <p className="mt-4 font-semibold">{formatMoney(order.totalCents, order.currency)}</p>
    </div>
  );
}
