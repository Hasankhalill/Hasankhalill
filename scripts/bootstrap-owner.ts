import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { auth } from "../src/lib/auth";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.OWNER_EMAIL?.toLowerCase();
  const password = process.env.OWNER_PASSWORD;
  if (!email || !password) {
    throw new Error("Set OWNER_EMAIL and OWNER_PASSWORD in the environment. The password is not stored in the repo.");
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.role !== "OWNER") {
      await prisma.user.update({ where: { id: existing.id }, data: { role: "OWNER", emailVerified: true, disabled: false } });
      console.log("Existing user promoted to owner. Password was not changed.");
    } else {
      console.log("Owner already exists. Password was not changed.");
    }
    return;
  }
  const created = await auth.api.signUpEmail({
    body: { email, password, name: "HyCare owner" },
  });
  await prisma.user.update({
    where: { id: created.user.id },
    data: { role: "OWNER", emailVerified: true },
  });
  console.log(`Owner ${email} created and marked verified. Change the password after the first sign-in.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
