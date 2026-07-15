import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

// Log ud sker nu via en POST server-action (app/actions/auth.ts logout). Denne
// GET-route beholdes til direkte/bogmærkede /logout-hits, men MÅ ikke slette
// sessionen på et prefetch: Next.js prefetcher links i viewport i produktion,
// og et prefetch af /logout var den oprindelige "man bliver logget ud"-bug.
// Kun en ægte navigation (ikke-prefetch) rydder cookien.
export async function GET(req: Request) {
  const h = req.headers;
  const isPrefetch =
    h.get("next-router-prefetch") === "1" ||
    (h.get("sec-purpose") ?? h.get("purpose") ?? "").toLowerCase().includes("prefetch");
  if (!isPrefetch) (await cookies()).delete(SESSION_COOKIE);
  return NextResponse.redirect(new URL("/login", req.url));
}
