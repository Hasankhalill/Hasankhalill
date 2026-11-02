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
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:px-5">
        <Link href="/" className="order-1 shrink-0" aria-label="HyCare home">
          {props.logoUrl ? <img src={props.logoUrl} alt="HyCare" className="h-9 w-auto sm:h-10" /> : <span className="font-display text-2xl text-primary sm:text-3xl">HyCare</span>}
        </Link>
        <nav className="order-3 hidden items-center gap-5 text-sm md:order-2 md:flex" aria-label="Primary">
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
        <div className="order-2 ml-auto flex items-center gap-3 text-sm md:order-4 md:ml-0">
          <Link href="/wishlist" className="hidden sm:inline">Saved</Link>
          <Link href={props.signedIn ? "/account" : "/login"}>{props.signedIn ? "Account" : "Sign in"}</Link>
          <Link href="/cart" className="whitespace-nowrap font-semibold text-primary">Cart ({props.cartCount})</Link>
        </div>
        <div className="order-4 w-full md:order-3 md:w-auto md:min-w-0 md:flex-1">
          <SearchBox />
        </div>
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
