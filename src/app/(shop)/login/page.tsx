import Link from "next/link";
import { LoginForm } from "@/components/auth-forms";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; verified?: string }> }) {
  const query = await searchParams;
  const next = query.next?.startsWith("/") ? query.next : "/account";
  return (
    <div className="mx-auto max-w-md px-5 py-16">
      <h1 className="font-display text-5xl">Sign in</h1>
      {query.verified ? <p className="mt-3 text-sm text-primary" role="status">Email verified. You can sign in.</p> : null}
      <div className="mt-6"><LoginForm next={next} /></div>
      <p className="mt-4 text-sm"><Link href="/register">Create an account</Link> · <Link href="/forgot-password">Forgot password</Link></p>
    </div>
  );
}
