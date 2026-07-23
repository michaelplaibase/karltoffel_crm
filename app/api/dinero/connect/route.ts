// GET /api/dinero/connect — start the Visma Connect OAuth flow (admin only).
// Signs a short-lived state (HMAC, encodes the admin's id) and redirects to
// Visma's authorize endpoint. Self-guards: middleware excludes /api.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/api-auth";
import { envConfigured, signState, buildAuthorizeUrl, redirectUriFor } from "@/lib/dinero";

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const user = await getSessionUser();
  if (!user) return NextResponse.redirect(new URL("/login", origin));
  if (!user.isAdmin) return NextResponse.redirect(new URL("/accounting?fejl=admin", origin));
  if (!envConfigured()) return NextResponse.redirect(new URL("/accounting?fejl=config", origin));

  // Sign the state AND stash its nonce in a single-use, browser-bound cookie. The
  // callback requires the two to match, blocking state replay / code injection.
  // SameSite=None+Secure so the cookie survives the cross-site form_post callback.
  const { state, nonce } = signState(user.id);
  const res = NextResponse.redirect(buildAuthorizeUrl(redirectUriFor(origin), state));
  res.cookies.set("dinero_oauth", nonce, { httpOnly: true, secure: true, sameSite: "none", path: "/api/dinero", maxAge: 600 });
  return res;
}
