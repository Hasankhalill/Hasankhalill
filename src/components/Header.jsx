import { useEffect, useId, useRef } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { branding } from "../config/branding.js";
import { categories } from "../data/categories.js";
import { useCart } from "../context/CartContext.jsx";
import { Logo } from "./Logo.jsx";
import { SearchForm } from "./SearchForm.jsx";

const links = [
  { to: "/shop", label: "Shop" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

function navClass({ isActive }) {
  return `rounded-full px-3 py-2 text-sm font-medium no-underline ${isActive ? "bg-cream text-navy" : "text-navy"}`;
}

export function Header() {
  const { count, notice } = useCart();
  const location = useLocation();
  const dialogRef = useRef(null);
  const categoriesRef = useRef(null);
  const menuTitleId = useId();

  useEffect(() => {
    dialogRef.current?.close();
    if (categoriesRef.current) categoriesRef.current.open = false;
  }, [location.pathname, location.search]);

  return (
    <header className="header-bar sticky top-0 z-40 border-b border-line">
      <div className="bg-navy-deep px-4 py-2 text-center text-sm text-warm">{branding.copy.announcement}</div>
      {notice && (
        <p className="bg-teal px-4 py-2 text-center text-sm text-warm" role="status">
          {notice}{" "}
          <Link className="font-semibold text-warm underline" to="/cart">
            View cart
          </Link>
        </p>
      )}
      <div className="shell flex items-center gap-4 py-3">
        <Logo />
        <SearchForm id="search-header" className="mx-auto hidden min-w-0 max-w-md flex-1 md:flex" />
        <nav className="ml-auto hidden items-center gap-1 lg:flex" aria-label="Primary">
          <NavLink to="/shop" className={navClass}>
            Shop
          </NavLink>
          <details ref={categoriesRef} className="relative">
            <summary className="cursor-pointer rounded-full px-3 py-2 text-sm font-medium text-navy">Categories</summary>
            <ul className="absolute right-0 z-20 mt-2 w-64 rounded-2xl border border-line bg-paper p-2 shadow-lg">
              {categories.map((category) => (
                <li key={category.id}>
                  <Link
                    className="block rounded-xl px-3 py-2 text-sm text-navy no-underline hover:bg-cream"
                    to={`/shop?category=${category.id}`}
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </details>
          <NavLink to="/about" className={navClass}>
            About
          </NavLink>
          <NavLink to="/contact" className={navClass}>
            Contact
          </NavLink>
        </nav>
        <Link
          to="/cart"
          className="ml-auto inline-flex items-center gap-2 rounded-full border border-line bg-paper px-3 py-2 text-sm font-semibold text-navy no-underline lg:ml-0"
          aria-label={`Cart, ${count} ${count === 1 ? "item" : "items"}`}
        >
          Cart
          <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-navy px-1.5 text-xs text-warm">
            {count}
          </span>
        </Link>
        <button
          type="button"
          className="btn btn-ghost h-11 px-4 lg:hidden"
          aria-haspopup="dialog"
          onClick={() => dialogRef.current?.showModal()}
        >
          Menu
        </button>
      </div>
      <div className="shell pb-3 md:hidden">
        <SearchForm id="search-header-mobile" />
      </div>
      <dialog ref={dialogRef} className="menu-sheet" aria-labelledby={menuTitleId}>
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <p id={menuTitleId} className="font-display text-2xl text-navy">
            Menu
          </p>
          <button type="button" className="btn btn-ghost h-11 px-4" onClick={() => dialogRef.current?.close()}>
            Close
          </button>
        </div>
        <nav className="grid gap-1 px-5 py-4" aria-label="Mobile">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} className="rounded-2xl px-3 py-3 text-lg text-navy no-underline">
              {link.label}
            </NavLink>
          ))}
          <p className="eyebrow px-3 pt-4">Categories</p>
          {categories.map((category) => (
            <Link
              key={category.id}
              to={`/shop?category=${category.id}`}
              className="rounded-2xl px-3 py-3 text-navy no-underline"
            >
              {category.name}
            </Link>
          ))}
        </nav>
      </dialog>
    </header>
  );
}
