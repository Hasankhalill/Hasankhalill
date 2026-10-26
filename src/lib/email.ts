import nodemailer from "nodemailer";
import { prisma } from "./db";

export type OutgoingEmail = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export function emailProviderName() {
  if (process.env.RESEND_API_KEY) return "resend";
  if (process.env.SMTP_HOST) return "smtp";
  return null;
}

export async function sendEmail(message: OutgoingEmail) {
  const provider = emailProviderName();
  if (provider === "resend") {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM,
          to: [message.to],
          subject: message.subject,
          html: message.html,
          text: message.text,
        }),
      });
      if (!response.ok) {
        const error = await response.text();
        await persist(message, "FAILED", "resend", error.slice(0, 500));
        return { delivered: false, provider: "resend" as const };
      }
      await persist(message, "SENT", "resend", null);
      return { delivered: true, provider: "resend" as const };
    } catch (error) {
      await persist(message, "FAILED", "resend", error instanceof Error ? error.message : "send failed");
      return { delivered: false, provider: "resend" as const };
    }
  }
  if (provider === "smtp") {
    try {
      const transport = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === "true",
        auth: process.env.SMTP_USER
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
          : undefined,
      });
      await transport.sendMail({
        from: process.env.EMAIL_FROM,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });
      await persist(message, "SENT", "smtp", null);
      return { delivered: true, provider: "smtp" as const };
    } catch (error) {
      await persist(message, "FAILED", "smtp", error instanceof Error ? error.message : "send failed");
      return { delivered: false, provider: "smtp" as const };
    }
  }
  await persist(message, "NOT_SENT", "outbox", null);
  return { delivered: false, provider: "outbox" as const };
}

async function persist(
  message: OutgoingEmail,
  status: "SENT" | "NOT_SENT" | "FAILED",
  provider: string,
  error: string | null,
) {
  await prisma.emailMessage.create({
    data: {
      toEmail: message.to,
      subject: message.subject,
      textBody: message.text,
      htmlBody: message.html,
      status,
      provider,
      error,
    },
  });
}
