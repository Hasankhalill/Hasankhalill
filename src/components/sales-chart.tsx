import { formatMoney } from "@/lib/money";
import type { SalesPoint } from "@/lib/dashboard";

export function SalesChart({ points, currency }: { points: SalesPoint[]; currency: string }) {
  const max = Math.max(0, ...points.map((point) => point.revenueCents));
  const top = max === 0 ? 100 : max;
  const ticks = [top, Math.round(top / 2), 0];
  return (
    <figure className="mt-6">
      <figcaption className="sr-only">Revenue for each period. The tallest bar is {formatMoney(max, currency)}.</figcaption>
      <div className="flex gap-3">
        <div className="flex h-44 w-[4.75rem] shrink-0 flex-col justify-between text-right text-[11px] leading-none text-muted" aria-hidden="true">
          {ticks.map((tick) => (
            <span key={tick}>{formatMoney(tick, currency)}</span>
          ))}
        </div>
        <div className="min-w-0 flex-1 overflow-x-auto">
          <div className="min-w-[36rem]">
            <div className="relative h-36 border-b border-l border-line">
              <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-line" />
              <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-line" />
              <ul className="absolute inset-0 flex items-end justify-between gap-1 px-1">
                {points.map((point) => {
                  const percent = point.revenueCents === 0 ? 0 : Math.max(8, Math.round((point.revenueCents / top) * 72));
                  return (
                    <li key={point.label} className="relative h-full min-w-0 flex-1">
                      <div
                        className="absolute bottom-0 left-1/2 w-5 max-w-full -translate-x-1/2 rounded-t bg-primary"
                        style={{ height: `${percent}%` }}
                        role="img"
                        aria-label={`${point.axisLabel}, ${formatMoney(point.revenueCents, currency)}, ${point.orders} orders`}
                      />
                      {point.revenueCents > 0 ? (
                        <p className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] leading-none text-ink" style={{ bottom: `calc(${percent}% + 6px)` }}>
                          {formatMoney(point.revenueCents, currency)}
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
            <ul className="mt-2 flex justify-between gap-1 px-1" aria-hidden="true">
              {points.map((point) => (
                <li key={point.label} className="min-w-0 flex-1 truncate text-center text-[11px] text-muted">
                  {point.axisLabel}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </figure>
  );
}
