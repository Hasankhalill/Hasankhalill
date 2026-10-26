import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    fileParallelism: false,
    hookTimeout: 30000,
    testTimeout: 30000,
    env: {
      DATABASE_URL: "postgresql://hycare:hycare@127.0.0.1:5432/hycare_test",
      BETTER_AUTH_SECRET: "test-secret-test-secret-test-secret-32",
      BETTER_AUTH_URL: "http://localhost:3000",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      STORE_TIMEZONE: "Asia/Beirut",
      RATE_LIMIT_DISABLED: "1",
      EMAIL_FROM: "HyCare <test@hycare.test>",
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
