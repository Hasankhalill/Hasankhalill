import { prisma } from "@/lib/db";
import { emailProviderName } from "@/lib/email";

export const metadata = { title: "Check your email" };

export default async function CheckEmailPage({ searchParams }: { searchParams: Promise<{ email?: string; kind?: string }> }) {
  const query = await searchParams;
  const email = query.email || "";
  const provider = emailProviderName();
  const message = email
    ? await prisma.emailMessage.findFirst({ where: { toEmail: email }, orderBy: { createdAt: "desc" } })
    : null;
  const showLink = message && message.status === "NOT_SENT";
  return (
    <div className="mx-auto max-w-xl px-5 py-16">
      <h1 className="font-display text-5xl">Check your email</h1>
      {provider ? (
        <p className="mt-4">If the address is valid, a message was handed to {provider}.</p>
      ) : (
        <p className="mt-4" role="status">This message was not sent. Email is not configured, so it is stored in the development outbox.</p>
      )}
      {showLink ? (
        <div className="card mt-6 p-4 text-sm">
          <p className="font-semibold">Development link, not delivered</p>
          <pre className="mt-2 whitespace-pre-wrap">{message.textBody}</pre>
        </div>
      ) : null}
    </div>
  );
}
