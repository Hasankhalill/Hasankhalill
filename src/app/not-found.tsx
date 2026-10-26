import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-5 py-20">
      <h1 className="font-display text-5xl">Page not found</h1>
      <Link className="btn mt-6" href="/">Back home</Link>
    </div>
  );
}
