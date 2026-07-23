// POST /api/dinero/callback — Visma Connect redirects here with response_mode=
// form_post, so the authorization code arrives as an HTTP POST (cross-site). A
// cross-site POST does NOT carry SameSite=Lax cookies, so we do NOT rely on the
// session cookie here: the request is authorized by the HMAC-signed `state`
// (which encodes the admin's user id and expires in 10 min), re-validated against
// the DB. Responds 303 so the browser switches POST → GET to /accounting.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { verifyState, connectFromCallback, currentCompanyId, redirectUriFor } from "@/lib/dinero";

function back(origin: string, params: string) {
  const res = NextResponse.redirect(new URL(`/accounting?${params}`, origin), 303);
  res.cookies.set("dinero_oauth", "", { path: "/api/dinero", maxAge: 0 }); // single-use: clear the nonce
  return res;
}

export async function POST(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const form = await req.formData().catch(() => null);
  const code = form?.get("code")?.toString();
  const state = form?.get("state")?.toString();
  const oauthError = form?.get("error")?.toString();
  if (oauthError) return back(origin, `fejl=${encodeURIComponent(oauthError.slice(0, 140))}`);

  const parsed = verifyState(state);
  const cookieNonce = req.cookies.get("dinero_oauth")?.value;
  if (!parsed || !code) return back(origin, "fejl=state");
  // The state's nonce must match the browser's single-use cookie (blocks replay /
  // authorization-code injection from a browser that never started this flow).
  if (!cookieNonce || cookieNonce !== parsed.nonce) return back(origin, "fejl=state");

  // Re-validate that the state's user is still an active admin (no session cookie on
  // the cross-site POST, so the signed state + admin lookup is the authorization).
  const user = await prisma.user.findUnique({ where: { id: parsed.userId }, select: { isAdmin: true, active: true } });
  if (!user?.active || !user.isAdmin) return back(origin, "fejl=admin");

  try {
    await connectFromCallback(await currentCompanyId(), code, redirectUriFor(origin));
    return back(origin, "ok=1");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "forbindelse fejlede";
    return back(origin, `fejl=${encodeURIComponent(msg.slice(0, 140))}`);
  }
}
