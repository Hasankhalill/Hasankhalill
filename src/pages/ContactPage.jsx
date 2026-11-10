import { useState } from "react";
import { branding, whatsappHref } from "../config/branding.js";

const topics = ["Product question", "Demo order", "Something else"];
const empty = { name: "", email: "", topic: topics[0], message: "" };

export function ContactPage() {
  const [values, setValues] = useState(empty);
  const [errors, setErrors] = useState({});
  const [result, setResult] = useState("");

  const setField = (key) => (event) => {
    setValues((current) => ({ ...current, [key]: event.target.value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setResult("");
  };

  return (
    <div className="shell py-12">
      <p className="eyebrow">{branding.name}</p>
      <h1 className="mt-3 font-display text-5xl text-navy">{branding.copy.contactTitle}</h1>
      <p className="mt-4 max-w-2xl text-lg text-muted">{branding.copy.contactLead}</p>

      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <form
          className="card grid gap-4 p-6"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            const next = {};
            if (!values.name.trim()) next.name = "Enter your name.";
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) next.email = "Enter an email address.";
            if (values.message.trim().length < 10) next.message = "Write at least a short message.";
            setErrors(next);
            if (Object.keys(next).length > 0) {
              setResult("");
              return;
            }
            setResult(branding.copy.demoFormNote);
            setValues(empty);
          }}
        >
          <p className="rounded-2xl bg-cream px-4 py-3 text-sm text-navy">{branding.copy.demoFormNotice}</p>
          <div>
            <label className="text-sm font-semibold text-navy" htmlFor="contact-name">
              Name
            </label>
            <input id="contact-name" className="field mt-1" autoComplete="name" value={values.name} onChange={setField("name")} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "contact-name-error" : undefined} />
            {errors.name && (
              <p id="contact-name-error" className="mt-1 text-sm text-danger" role="alert">
                {errors.name}
              </p>
            )}
          </div>
          <div>
            <label className="text-sm font-semibold text-navy" htmlFor="contact-email">
              Email
            </label>
            <input id="contact-email" className="field mt-1" type="email" autoComplete="email" value={values.email} onChange={setField("email")} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "contact-email-error" : undefined} />
            {errors.email && (
              <p id="contact-email-error" className="mt-1 text-sm text-danger" role="alert">
                {errors.email}
              </p>
            )}
          </div>
          <div>
            <label className="text-sm font-semibold text-navy" htmlFor="contact-topic">
              Topic
            </label>
            <select id="contact-topic" className="field mt-1" value={values.topic} onChange={setField("topic")}>
              {topics.map((topic) => (
                <option key={topic}>{topic}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-navy" htmlFor="contact-message">
              Message
            </label>
            <textarea id="contact-message" className="field mt-1 min-h-36" value={values.message} onChange={setField("message")} aria-invalid={Boolean(errors.message)} aria-describedby={errors.message ? "contact-message-error" : undefined} />
            {errors.message && (
              <p id="contact-message-error" className="mt-1 text-sm text-danger" role="alert">
                {errors.message}
              </p>
            )}
          </div>
          <button className="btn btn-navy w-fit" type="submit">
            Submit demo message
          </button>
          {result && (
            <p className="text-sm font-medium text-navy" role="status">
              {result}
            </p>
          )}
        </form>

        <aside className="card h-fit p-6">
          <h2 className="font-display text-3xl text-navy">Shop details</h2>
          <p className="mt-2 text-sm text-muted">Edit these in the branding file. They are sample details, not a live shop.</p>
          <address className="mt-5 text-sm not-italic leading-relaxed">
            <span className="block font-semibold text-navy">{branding.copy.addressLabel}</span>
            {branding.contact.addressLines.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
            <a className="mt-4 block text-teal-deep underline-offset-4 hover:underline" href={`mailto:${branding.contact.email}`}>
              {branding.contact.email}
            </a>
            <a className="block text-teal-deep underline-offset-4 hover:underline" href={`tel:${branding.contact.phoneTel}`}>
              {branding.contact.phoneDisplay}
            </a>
          </address>
          <p className="mt-4 text-sm">
            <span className="block font-semibold text-navy">{branding.copy.hoursLabel}</span>
            {branding.contact.hours.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </p>
          <a className="btn btn-accent mt-6 w-full" href={whatsappHref()} target="_blank" rel="noreferrer">
            {branding.copy.whatsappLabel}
          </a>
          <p className="mt-3 text-xs text-muted">Opens WhatsApp with {branding.contact.whatsapp}.</p>
        </aside>
      </div>
    </div>
  );
}
