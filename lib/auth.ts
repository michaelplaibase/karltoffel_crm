// Password hashing (scrypt via node:crypto). Node runtime only — imported by the
// login server action and the seed, never by Edge middleware.
import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";

export function hashPassword(pw: string): string {
  const salt = randomBytes(16).toString("hex");
  const dk = scryptSync(pw, salt, 64).toString("hex");
  return `${salt}:${dk}`;
}

export function verifyPassword(pw: string, stored: string): boolean {
  const [salt, dk] = stored.split(":");
  if (!salt || !dk) return false;
  const calc = scryptSync(pw, salt, 64);
  const orig = Buffer.from(dk, "hex");
  return orig.length === calc.length && timingSafeEqual(orig, calc);
}
