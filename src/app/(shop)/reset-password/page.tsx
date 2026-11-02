import { ResetForm } from "@/components/auth-forms";

export const metadata = { title: "Choose a password" };

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const query = await searchParams;
  if (!query.token) return <div className="mx-auto max-w-md px-5 py-16"><h1 className="font-display text-4xl">Missing reset token</h1></div>;
  return (
    <div className="mx-auto max-w-md px-5 py-16">
      <h1 className="font-display text-5xl">Choose a new password</h1>
      <div className="mt-6"><ResetForm token={query.token} /></div>
    </div>
  );
}
