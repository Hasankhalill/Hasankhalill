import Link from "next/link";
import { formatMoney } from "@/lib/money";

export function ProductCard(props: {
  href: string;
  name: string;
  imageUrl?: string | null;
  imageAlt: string;
  currency: string;
  unitCents: number;
  compareCents?: number | null;
  percentOff?: number | null;
  badge?: string | null;
}) {
  return (
    <article className="card overflow-hidden transition duration-200 hover:-translate-y-0.5">
      <Link href={props.href} className="block">
        <div className="relative aspect-[4/5] bg-warm">
          {props.imageUrl ? (
            <img src={props.imageUrl} alt={props.imageAlt} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted">No photo yet</div>
          )}
          {props.percentOff ? (
            <span className="absolute left-3 top-3 rounded-full bg-sale px-2.5 py-1 text-xs font-semibold text-white">
              {props.percentOff}% off
            </span>
          ) : null}
        </div>
        <div className="space-y-1 px-4 py-4">
          {props.badge ? <p className="text-xs uppercase tracking-wide text-primary">{props.badge}</p> : null}
          <h3 className="font-display text-xl leading-tight">{props.name}</h3>
          <p className="text-sm">
            <span className={props.compareCents ? "font-semibold text-sale" : "font-semibold"}>{formatMoney(props.unitCents, props.currency)}</span>
            {props.compareCents ? <span className="ml-2 text-muted line-through">{formatMoney(props.compareCents, props.currency)}</span> : null}
          </p>
        </div>
      </Link>
    </article>
  );
}
