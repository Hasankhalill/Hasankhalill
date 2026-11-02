import { ContactForm } from "@/components/contact-form";
import { getSiteContent } from "@/lib/content";

export const metadata = { title: "Contact" };

export default async function ContactPage() {
  const content = await getSiteContent();
  return (
    <div className="mx-auto max-w-xl px-5 py-12">
      <h1 className="font-display text-5xl">Contact</h1>
      <p className="mt-3 text-muted">{content.contactAddress}</p>
      {content.contactPhone ? <p>{content.contactPhone}</p> : null}
      {content.contactEmail ? <p>{content.contactEmail}</p> : null}
      <ContactForm />
    </div>
  );
}
