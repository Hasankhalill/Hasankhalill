import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "./db";
import { sendEmail } from "./email";

const appUrl = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const auth = betterAuth({
  appName: "HyCare",
  baseURL: appUrl,
  secret: process.env.BETTER_AUTH_SECRET || "dev-only-secret-change-me-please-32",
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 10,
    sendResetPassword: async ({ user, url }) => {
      const result = await sendEmail({
        to: user.email,
        subject: "Reset your HyCare password",
        text: `Set a new HyCare password: ${url}\nIf you did not ask for this, you can ignore this message.`,
        html: `<p>Set a new HyCare password.</p><p><a href="${url}">${url}</a></p>`,
      });
      if (!result.delivered) {
        console.info("Password reset email was not delivered. It is stored in the development outbox.");
      }
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      const result = await sendEmail({
        to: user.email,
        subject: "Verify your HyCare email",
        text: `Confirm your HyCare email: ${url}`,
        html: `<p>Confirm your HyCare email.</p><p><a href="${url}">${url}</a></p>`,
      });
      if (!result.delivered) {
        console.info("Verification email was not delivered. It is stored in the development outbox.");
      }
    },
  },
  user: {
    additionalFields: {
      role: { type: "string", required: false, defaultValue: "CUSTOMER", input: false },
      phone: { type: "string", required: false, input: true },
      disabled: { type: "boolean", required: false, defaultValue: false, input: false },
      closureRequestedAt: { type: "date", required: false, input: false },
    },
  },
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          const user = await prisma.user.findUnique({ where: { id: session.userId } });
          if (!user || user.disabled) return false;
          return { data: session };
        },
      },
    },
  },
  rateLimit: {
    enabled: process.env.RATE_LIMIT_DISABLED !== "1",
    window: 60,
    max: 30,
    customRules: {
      "/sign-in/email": { window: 300, max: 8 },
      "/sign-up/email": { window: 300, max: 5 },
      "/request-password-reset": { window: 300, max: 5 },
    },
  },
  trustedOrigins: [appUrl, "http://localhost:3000"],
  plugins: [nextCookies()],
});
