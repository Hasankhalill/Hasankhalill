import { ForgotForm } from "@/components/auth-forms";

export const metadata = { title: "Reset password" };

export default function ForgotPage() {
  return (
    <div className="mx-auto max-w-md px-5 py-16">
      <h1 className="font-display text-5xl">Reset password</h1>
      <div className="mt-6"><ForgotForm /></div>
    </div>
  );
}
