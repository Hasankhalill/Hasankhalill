"use client";

import { useState } from "react";
import { newsletterAction } from "@/app/actions/store";

export function NewsletterForm() {
  const [message, setMessage] = useState<string | null>(null);
  return (
    <form
      className="flex flex-col gap-3 sm:flex-row"
      action={async (formData) => {
        const result = await newsletterAction(formData);
        if (result && "message" in result && result.message) setMessage(result.message);
        else if (result && "error" in result && result.error) setMessage(result.error);
        else setMessage(null);
      }}
    >
      <label className="field min-w-0 flex-1">
        <span className="sr-only">Email</span>
        <input name="email" type="email" required autoComplete="email" placeholder="Email address" aria-describedby="newsletter-status" />
      </label>
      <button className="btn" type="submit">Join</button>
      <p id="newsletter-status" className="basis-full text-sm" role="status">{message}</p>
    </form>
  );
}
