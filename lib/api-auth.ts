// Session guard for Node route handlers (app/api/*) and server actions.
// NOT for middleware — this imports next/headers, which is unavailable on
// the Edge runtime.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession, SESSION_COOKIE } from "@/lib/session";

/** Returns the logged-in userId, or null if the request has no valid session. */
export async function requireSession(): Promise<number | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySession(token);
}

/**
 * Guard for server actions (app/actions/*). Middleware gates PAGES, but a server
 * action is invoked by its action id via POST to ANY path — including /login,
 * which the middleware matcher excludes — so middleware alone does NOT protect
 * actions. Every mutating/data-returning action must call this itself. Anonymous
 * callers are redirected to /login (redirect throws, so nothing after it runs);
 * a valid session is a no-op. Never call from the public `login` action.
 */
export async function guardAction(): Promise<void> {
  if ((await requireSession()) == null) redirect("/login");
}

export function unauthorized(): Response {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { "content-type": "application/json" },
  });
}
