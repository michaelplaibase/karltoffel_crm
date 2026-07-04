// Run `prisma migrate deploy` ONLY for a production build. Vercel preview/branch
// builds (VERCEL_ENV=preview) skip it, so an unmerged migration on a feature
// branch never gets applied to the PRODUCTION database. For a fuller setup, use
// Neon's Vercel integration (a separate Neon branch per preview deployment).
import { execSync } from "node:child_process";

const env = process.env.VERCEL_ENV;
if (env && env !== "production") {
  console.log(`[migrate-prod] VERCEL_ENV=${env} — skipping prisma migrate deploy.`);
} else {
  console.log(`[migrate-prod] Running prisma migrate deploy (VERCEL_ENV=${env ?? "unset"}).`);
  execSync("prisma migrate deploy", { stdio: "inherit" });
}
