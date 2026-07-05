import { prisma } from "@/lib/db";
import { unauthorized } from "@/lib/api-auth";
import { underLimit, recordHit } from "@/lib/rate-limit";
import type { NextRequest } from "next/server";

// Inbound lead webhook for the public website form. No session cookie —
// middleware exempts /api — so it authenticates with a shared-secret header
// (LEAD_WEBHOOK_SECRET), compared in constant time (hash both sides, XOR the
// fixed-length digests, same idiom as lib/session.ts). Fails CLOSED: with no
// secret configured the endpoint is 503, never silently open.
//
// The caller must be the website's SERVER (a form relay), never the browser —
// a browser POST would expose the secret in devtools. No CORS headers are
// emitted, which also keeps browsers out.

const enc = new TextEncoder();

async function secretOk(given: string | null): Promise<boolean | "unconfigured"> {
  const secret = process.env.LEAD_WEBHOOK_SECRET;
  if (!secret || secret.length < 32) return "unconfigured";
  if (!given) return false;
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(given)),
    crypto.subtle.digest("SHA-256", enc.encode(secret)),
  ]);
  const ua = new Uint8Array(a), ub = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < ua.length; i++) diff |= ua[i] ^ ub[i];
  return diff === 0;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const normEmail = (e: string) => e.toLowerCase();
const normPhone = (p: string) => p.replace(/[^\d]/g, "").replace(/^(45|0045)(?=\d{8}$)/, "");

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";

  // Auth — failed secret checks are rate-limited (like login in app/actions/auth.ts).
  if (!underLimit(`leads:auth:${ip}`, 20)) return json({ error: "Too many requests" }, 429);
  const ok = await secretOk(req.headers.get("x-karltoffel-secret"));
  if (ok === "unconfigured") return json({ error: "Lead intake not configured" }, 503);
  if (!ok) { recordHit(`leads:auth:${ip}`, 60_000); return unauthorized(); }

  // Flood cap on accepted submissions.
  if (!underLimit(`leads:create:${ip}`, 10)) return json({ error: "Too many requests" }, 429);

  if (Number(req.headers.get("content-length") ?? 0) > 10_240) return json({ error: "Payload too large" }, 400);
  let body: Record<string, unknown>;
  try { body = (await req.json()) as Record<string, unknown>; } catch { return json({ error: "Invalid JSON" }, 400); }

  const name = str(body.name, 200);
  const emailRaw = str(body.email, 320);
  const phoneRaw = str(body.phone, 32);
  const email = emailRaw ? normEmail(emailRaw) : null;
  const phone = phoneRaw ? normPhone(phoneRaw) : null;
  if (!name) return json({ error: "name is required" }, 400);
  if (!email && !phone) return json({ error: "email or phone is required" }, 400);
  if (email && !/.+@.+\..+/.test(email)) return json({ error: "invalid email" }, 400);

  const utmIn = body.utm && typeof body.utm === "object" ? (body.utm as Record<string, unknown>) : null;
  const utm = utmIn
    ? JSON.stringify(Object.fromEntries(
        ["source", "medium", "campaign", "term", "content"].flatMap((k) => {
          const v = str(utmIn[k], 100);
          return v ? [[k, v]] : [];
        }),
      ))
    : null;

  const company = await prisma.company.findFirst(); // single-tenant, same as app/actions/contacts.ts
  if (!company) return json({ error: "No company configured" }, 503);

  recordHit(`leads:create:${ip}`, 60_000);

  const message = str(body.message, 2000) || null;
  const address = str(body.address, 300) || null;

  // Dedup: merge into an OPEN lead (<=30 days) with the same normalised email/phone.
  const since = new Date(Date.now() - 30 * 86_400_000);
  const dupOr: object[] = [];
  if (email) dupOr.push({ email });
  if (phone) dupOr.push({ phone });
  const existing = await prisma.lead.findFirst({
    where: { companyId: company.id, status: { in: ["new", "contacted"] }, createdAt: { gte: since }, OR: dupOr },
    orderBy: { createdAt: "desc" },
  });
  if (existing) {
    await prisma.lead.update({
      where: { id: existing.id },
      data: {
        message: message ? [existing.message, message].filter(Boolean).join("\n---\n") : existing.message,
        email: existing.email ?? email,
        phone: existing.phone ?? phone,
        address: existing.address ?? address,
      },
    });
    return json({ id: existing.id, deduplicated: true }, 200);
  }

  // Pre-link an existing customer so the UI can badge "eksisterende kunde".
  const known = await prisma.contact.findFirst({
    where: { companyId: company.id, OR: [...(email ? [{ email }] : []), ...(phone ? [{ phone }] : [])] },
    select: { id: true },
  });

  const lead = await prisma.lead.create({
    data: {
      companyId: company.id, name, email, phone, address, message,
      source: str(body.source, 50) || "website", utm, ip,
      contactId: known?.id ?? null,
    },
  });
  return json({ id: lead.id, deduplicated: false }, 201);
}
