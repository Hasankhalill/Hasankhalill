"use client";

export function PrintButton() {
  return <button className="btn mb-4" type="button" onClick={() => window.print()}>Print</button>;
}
