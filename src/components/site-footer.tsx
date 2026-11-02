import Link from "next/link";
import type { SiteContent } from "@prisma/client";

export function SiteFooter({ content }: { content: SiteContent }) {
  return (
    <footer className="mt-16 border-t border-line bg-warm">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 md:grid-cols-4">
        <div>
          <p className="font-display text-2xl text-primary">HyCare</p>
          <p className="mt-3 text-sm text-muted">{content.brandDescription}</p>
        </div>
        <div className="text-sm">
          <p className="font-semibold">Visit</p>
          <ul className="mt-3 space-y-2">
            <li><Link href="/shop">Shop</Link></li>
            <li><Link href="/offers">Offers</Link></li>
            <li><Link href="/about">About</Link></li>
            <li><Link href="/contact">Contact</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="font-semibold">Policies</p>
          <ul className="mt-3 space-y-2">
            <li><Link href="/shipping">Shipping</Link></li>
            <li><Link href="/returns">Returns</Link></li>
            <li><Link href="/privacy">Privacy</Link></li>
            <li><Link href="/terms">Terms</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="font-semibold">Contact</p>
          <p className="mt-3 text-muted">{content.contactAddress || "Add an address in admin."}</p>
          {content.contactPhone ? <p className="mt-1">{content.contactPhone}</p> : null}
          {content.contactEmail ? <p className="mt-1"><a href={`mailto:${content.contactEmail}`}>{content.contactEmail}</a></p> : null}
          <ul className="mt-3 space-y-1">
            {content.instagramUrl ? <li><a href={content.instagramUrl}>Instagram</a></li> : null}
            {content.facebookUrl ? <li><a href={content.facebookUrl}>Facebook</a></li> : null}
            {content.tiktokUrl ? <li><a href={content.tiktokUrl}>TikTok</a></li> : null}
          </ul>
        </div>
      </div>
    </footer>
  );
}
