import { Link } from "react-router-dom";
import { branding, whatsappHref } from "../config/branding.js";
import { categories } from "../data/categories.js";
import { Logo } from "./Logo.jsx";

export function Footer() {
  return (
    <footer className="mt-20 bg-navy-deep text-warm">
      <div className="shell grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo tone="light" />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-cream">{branding.copy.footerBlurb}</p>
        </div>
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-accent">Shop</h2>
          <ul className="mt-4 grid gap-2">
            {categories.map((category) => (
              <li key={category.id}>
                <Link className="text-sm text-warm underline-offset-4 hover:underline" to={`/shop?category=${category.id}`}>
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-accent">Visit</h2>
          <ul className="mt-4 grid gap-2 text-sm">
            <li>
              <Link className="text-warm underline-offset-4 hover:underline" to="/about">
                About
              </Link>
            </li>
            <li>
              <Link className="text-warm underline-offset-4 hover:underline" to="/contact">
                Contact
              </Link>
            </li>
            <li>
              <Link className="text-warm underline-offset-4 hover:underline" to="/cart">
                Cart
              </Link>
            </li>
            <li>
              <a className="text-warm underline-offset-4 hover:underline" href={whatsappHref()} rel="noreferrer">
                {branding.copy.whatsappLabel}
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-accent">{branding.copy.addressLabel}</h2>
          <address className="mt-4 text-sm not-italic leading-relaxed">
            {branding.contact.addressLines.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
            <a className="mt-3 block text-warm underline-offset-4 hover:underline" href={`mailto:${branding.contact.email}`}>
              {branding.contact.email}
            </a>
            <a className="block text-warm underline-offset-4 hover:underline" href={`tel:${branding.contact.phoneTel}`}>
              {branding.contact.phoneDisplay}
            </a>
          </address>
          <p className="mt-4 text-sm">
            <span className="block font-semibold">{branding.copy.hoursLabel}</span>
            {branding.contact.hours.map((line) => (
              <span key={line} className="block text-cream">
                {line}
              </span>
            ))}
          </p>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="shell py-5 text-sm text-cream">{branding.copy.sampleDisclaimer}</p>
      </div>
    </footer>
  );
}
