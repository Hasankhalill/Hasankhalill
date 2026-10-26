"use client";

import { useState, type ReactNode } from "react";

type ActionResult = void | { error?: string; message?: string; ok?: boolean };

export function BoundForm({
  action,
  children,
  className,
  encType,
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  children: ReactNode;
  className?: string;
  encType?: "application/x-www-form-urlencoded" | "multipart/form-data" | "text/plain";
}) {
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className={className}
      encType={encType}
      action={async (formData) => {
        const result = await action(formData);
        setError(result && "error" in result && result.error ? result.error : null);
      }}
    >
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      {children}
    </form>
  );
}
