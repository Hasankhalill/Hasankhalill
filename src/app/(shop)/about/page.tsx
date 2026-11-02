import { getSiteContent } from "@/lib/content";

export const metadata = { title: "About" };

export default async function AboutPage() {
  const content = await getSiteContent();
  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="font-display text-5xl">About HyCare</h1>
      <p className="mt-6 whitespace-pre-wrap leading-8">{content.aboutText}</p>
    </div>
  );
}
