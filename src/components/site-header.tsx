import Link from "next/link";
import { SearchBox } from "./search-box";

export function SiteHeader(props: {
  logoUrl?: string | null;
  categories: { slug: string; name: string }[];
  cartCount: number;
  signedIn: boolean;
}) {
  const links = [
    ["/shop", "Shop"],
    ["/categories", "Categories"],
    ["/offers", "Offers"],
    ["/about", "About"],
    ["/contact", "Contact"],
  ] as const;
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-5 py-3">
        <Link href="/" className="shrink-0" aria-label="HyCare home">
          {props.logoUrl ? <img src={props.logoUrl} alt="HyCare" className="h-10 w-auto" /> : <span className="font-display text-3xl text-primary">HyCare</span>}
        </Link>
        <nav className="hidden items-center gap-5 text-sm md:flex" aria-label="Primary">
          {links.map(([href, label]) =>
            label === "Categories" ? (
              <details key={href} className="relative">
                <summary className="cursor-pointer list-none">{label}</summary>
                <div className="absolute left-0 top-8 min-w-48 rounded-2xl border border-line bg-white p-3 shadow-sm">
                  <Link className="block px-2 py-1" href="/categories">All categories</Link>
                  {props.categories.map((category) => (
                    <Link key={category.slug} className="block px-2 py-1" href={`/categories/${category.slug}`}>{category.name}</Link>
                  ))}
                </div>
              </details>
            ) : (
              <Link key={href} href={href}>{label}</Link>
            ),
          )}
        </nav>
        <SearchBox />
        <Link href="/wishlist" className="hidden text-sm sm:inline">Saved</Link>
        <Link href={props.signedIn ? "/account" : "/login"} className="text-sm">{props.signedIn ? "Account" : "Sign in"}</Link>
        <Link href="/cart" className="text-sm font-semibold text-primary">Cart ({props.cartCount})</Link>
      </div>
      <details className="border-t border-line px-5 py-2 md:hidden">
        <summary className="cursor-pointer text-sm">Menu</summary>
        <nav className="flex flex-col gap-2 py-3 text-sm" aria-label="Mobile">
          {links.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}
          <Link href="/wishlist">Saved</Link>
        </nav>
      </details>
    </header>
  );
}
