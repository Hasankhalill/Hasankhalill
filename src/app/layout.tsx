import type { Metadata } from "next";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import "./globals.css";

const display = Fraunces({ subsets: ["latin"], variable: "--font-fraunces" });
const sans = Source_Sans_3({ subsets: ["latin"], variable: "--font-source" });

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: { default: "HyCare", template: "%s · HyCare" },
  description: "Home and personal care, packed for delivery across Lebanon. Cash on delivery, clear prices, and orders you can track.",
  openGraph: { title: "HyCare", description: "Home and personal care from Lebanon.", type: "website" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased">
        <a className="skip-link" href="#main">Skip to content</a>
        {children}
      </body>
    </html>
  );
}
