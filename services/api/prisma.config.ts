import { config } from "dotenv";
import { resolve } from "node:path";
import { defineConfig } from "prisma/config";

// The repo keeps a single .env at the root (shared across all services)
// rather than one per service.
config({ path: resolve(__dirname, "../../.env") });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
