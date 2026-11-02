import Link from "next/link";
import { RegisterForm } from "@/components/auth-forms";

export const metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-md px-5 py-16">
      <h1 className="font-display text-5xl">Create an account</h1>
      <p className="mt-3 text-sm text-muted">Passwords are hashed. You will need to verify your email before checkout on this account.</p>
      <div className="mt-6"><RegisterForm /></div>
      <p className="mt-4 text-sm"><Link href="/login">Already registered</Link></p>
    </div>
  );
}
