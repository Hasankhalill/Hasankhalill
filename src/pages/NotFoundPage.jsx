import { Link } from "react-router-dom";
import { branding } from "../config/branding.js";

export function NotFoundPage() {
  return (
    <div className="shell py-20">
      <h1 className="font-display text-5xl text-navy">That page is not on the chart</h1>
      <p className="mt-4 max-w-xl text-lg text-muted">The address does not match a page in {branding.name}.</p>
      <Link className="btn btn-navy mt-8" to="/">
        Back home
      </Link>
    </div>
  );
}
