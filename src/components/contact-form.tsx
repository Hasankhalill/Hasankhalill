"use client";

import { useState } from "react";
import { contactAction } from "@/app/actions/store";

export function ContactForm() {
  const [message, setMessage] = useState<string | null>(null);
  return (
    <form className="mt-6 space-y-3" action={async (formData) => {
      const result = await contactAction(formData);
      setMessage(result && "message" in result ? result.message : result?.error || null);
    }}>
      <label className="field"><span>Name</span><input name="name" required /></label>
      <label className="field"><span>Email</span><input name="email" type="email" required /></label>
      <label className="field"><span>Message</span><textarea name="message" required rows={5} /></label>
      {message ? <p role="status">{message}</p> : null}
      <button className="btn" type="submit">Send</button>
    </form>
  );
}
