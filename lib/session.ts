// Signed session token, using Web Crypto HMAC so it works in BOTH the Node
// runtime (server actions) and the Edge runtime (middleware). The token is
// `<userId>.<hmac(userId)>`; there is no server-side session store.
export const SESSION_COOKIE = "kt_session";

const SECRET = process.env.SESSION_SECRET || "karltoffel-dev-secret-change-me";
const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(data: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return b64url(new Uint8Array(sig));
}

export async function signSession(userId: number): Promise<string> {
  const data = String(userId);
  return `${data}.${await hmac(data)}`;
}

/** Returns the userId if the token's signature is valid, else null. */
export async function verifySession(token: string | undefined): Promise<number | null> {
  if (!token) return null;
  const i = token.lastIndexOf(".");
  if (i < 0) return null;
  const data = token.slice(0, i);
  const sig = token.slice(i + 1);
  const expected = await hmac(data);
  if (sig.length !== expected.length) return null;
  let diff = 0;
  for (let j = 0; j < sig.length; j++) diff |= sig.charCodeAt(j) ^ expected.charCodeAt(j);
  if (diff !== 0) return null;
  const id = Number(data);
  return Number.isFinite(id) ? id : null;
}
