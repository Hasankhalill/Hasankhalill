"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { afterLoginAction, mergeWishlistAction } from "@/app/actions/store";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="space-y-3"
      onSubmit={async (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const result = await authClient.signIn.email({
          email: String(data.get("email") || ""),
          password: String(data.get("password") || ""),
        });
        if (result.error) {
          setError(result.error.message || "Sign in failed.");
          return;
        }
        const saved = JSON.parse(localStorage.getItem("hycare_wishlist") || "[]") as string[];
        await afterLoginAction();
        if (saved.length) await mergeWishlistAction(saved);
        localStorage.removeItem("hycare_wishlist");
        router.push(next || "/account");
        router.refresh();
      }}
    >
      <label className="field"><span>Email</span><input name="email" type="email" required autoComplete="email" /></label>
      <label className="field"><span>Password</span><input name="password" type="password" required autoComplete="current-password" /></label>
      {error ? <p className="error" role="alert">{error}</p> : null}
      <button className="btn w-full" type="submit">Sign in</button>
    </form>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="space-y-3"
      onSubmit={async (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const email = String(data.get("email") || "");
        const result = await authClient.signUp.email({
          email,
          password: String(data.get("password") || ""),
          name: String(data.get("name") || ""),
          callbackURL: "/login?verified=1",
        });
        if (result.error) {
          setError(result.error.message || "Could not create the account.");
          return;
        }
        router.push(`/check-email?email=${encodeURIComponent(email)}`);
      }}
    >
      <label className="field"><span>Name</span><input name="name" required autoComplete="name" /></label>
      <label className="field"><span>Email</span><input name="email" type="email" required autoComplete="email" /></label>
      <label className="field"><span>Password</span><input name="password" type="password" required minLength={10} autoComplete="new-password" /></label>
      {error ? <p className="error" role="alert">{error}</p> : null}
      <button className="btn w-full" type="submit">Create account</button>
    </form>
  );
}

export function ForgotForm() {
  const [message, setMessage] = useState<string | null>(null);
  return (
    <form
      className="space-y-3"
      onSubmit={async (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const email = String(data.get("email") || "");
        await authClient.requestPasswordReset({ email, redirectTo: "/reset-password" });
        setMessage("If an account exists, a reset link was created. If email is not configured, it was not sent. Check the outbox in admin or the check-email note.");
        window.location.href = `/check-email?email=${encodeURIComponent(email)}&kind=reset`;
      }}
    >
      <label className="field"><span>Email</span><input name="email" type="email" required /></label>
      {message ? <p role="status">{message}</p> : null}
      <button className="btn w-full" type="submit">Send reset link</button>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  return (
    <form
      className="space-y-3"
      onSubmit={async (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const result = await authClient.resetPassword({ newPassword: String(data.get("password") || ""), token });
        if (result.error) setError(result.error.message || "Reset failed.");
        else setDone(true);
      }}
    >
      <label className="field"><span>New password</span><input name="password" type="password" required minLength={10} /></label>
      {error ? <p className="error" role="alert">{error}</p> : null}
      {done ? <p role="status">Password updated. You can sign in.</p> : <button className="btn w-full" type="submit">Update password</button>}
    </form>
  );
}

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      className="btn btn-ghost"
      type="button"
      onClick={async () => {
        await authClient.signOut();
        router.push("/");
        router.refresh();
      }}
    >
      Log out
    </button>
  );
}
