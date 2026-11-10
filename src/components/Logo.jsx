import { Link } from "react-router-dom";
import { branding } from "../config/branding.js";

export function Logo({ tone = "navy" }) {
  const color = tone === "light" ? "text-warm" : "text-navy";
  return (
    <Link to="/" className={`inline-flex items-center gap-3 no-underline ${color}`}>
      <svg viewBox="0 0 32 32" className="h-9 w-9 shrink-0" aria-hidden="true">
        <rect width="32" height="32" rx="10" className="fill-current opacity-10" />
        <path
          d="M8 9.5c7 0 11 3.2 11 8.4 0 3.3-1.9 5.5-4.8 6.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
        <path
          d="M14 23.2c.3 1.7 1.4 2.7 3 2.8 1.3 0 2.1-.7 2.3-1.7"
          fill="none"
          className="stroke-accent"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
        <path
          d="M7.5 20.2c2.4.5 4.6-.2 6.8-1.8"
          fill="none"
          className="stroke-teal"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      <span className="font-display text-xl leading-none tracking-tight">{branding.name}</span>
    </Link>
  );
}
