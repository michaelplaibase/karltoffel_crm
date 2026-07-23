// Dinero (Visma) invoicing — raw fetch, no SDK (same deliberately dependency-free
// pattern as lib/email.ts / lib/gcal.ts). Node-only (uses node:crypto); never
// import from middleware or a client component.
//
// Dry-run by default: NOTHING is sent to api.dinero.dk / connect.visma.com until
// DINERO_CLIENT_ID + DINERO_CLIENT_SECRET + DINERO_TOKEN_ENC_KEY are set AND the
// company is connected to a Dinero organization (a DineroConnection row). Setting
// DINERO_DRY_RUN=1 forces simulation even when configured — keep it "1" on
// preview/dev so a preview can never book a real invoice in the production org.
//
// ─── PROVENANCE / VERIFY BEFORE GO-LIVE ───────────────────────────────────────
// The Dinero REST shapes below (endpoint VERSIONS, PascalCase field names, `fields`
// selectors, VAT semantics) were reconstructed from Dinero's docs + open-source
// clients; the live spec could not be fetched from this environment and Dinero has
// no sandbox. Before flipping DINERO_DRY_RUN off in production, verify against
// https://api.dinero.dk/openapi/index.html on a 30-day trial Pro org:
//   • organizations version (v1 vs v1.1) + the IsPro field name in the `fields` list,
//   • invoice create/book/email/payments versions + payment-list shape,
//   • that ShowLinesInclVat=true + BaseAmountValue=<kr incl VAT> yields the right
//     TotalInclVat. Responses are parsed case-insensitively so casing drift is
//     tolerated; the pre-book total check fails CLOSED if no total comes back.
import { prisma } from "./db";
import {
  randomBytes, createHmac, createHash, createCipheriv, createDecipheriv, timingSafeEqual,
} from "node:crypto";
import type { DineroConnection } from "@prisma/client";

// ─── Endpoints (VERSIONS ARE PROVISIONAL — verify against the live OpenAPI) ────
const API_BASE = "https://api.dinero.dk";
const CONNECT_BASE = "https://connect.visma.com";
const V_ORGS = "v1";
const V_CONTACTS = "v1";
const V_INVOICES = "v1";
const SCOPES = "dineropublicapi:read dineropublicapi:write offline_access";
const FETCH_TIMEOUT_MS = 10_000;

// ─── The five "Betaling og fakturering" choices (MUST match CompleteOrderForm) ─
export const INVOICE_DECISIONS = [
  "Send faktura - ubetalt",
  "Send faktura - betalt kontant",
  "Send ikke faktura fra Fenster",
  "Opret fakturakladde",
  "Registrer på et senere tidspunkt",
] as const;
export type InvoiceDecision = (typeof INVOICE_DECISIONS)[number];
export function isInvoiceDecision(s: string): s is InvoiceDecision {
  return (INVOICE_DECISIONS as readonly string[]).includes(s);
}
const D_SEND_UNPAID: InvoiceDecision = "Send faktura - ubetalt";
const D_SEND_CASH: InvoiceDecision = "Send faktura - betalt kontant";
const D_NONE: InvoiceDecision = "Send ikke faktura fra Fenster";
const D_DRAFT: InvoiceDecision = "Opret fakturakladde";
const D_LATER: InvoiceDecision = "Registrer på et senere tidspunkt";

// ─── Config / dry-run detection ───────────────────────────────────────────────
export function envConfigured(): boolean {
  return Boolean(
    process.env.DINERO_CLIENT_ID?.trim() &&
      process.env.DINERO_CLIENT_SECRET?.trim() &&
      process.env.DINERO_TOKEN_ENC_KEY?.trim(),
  );
}
function dryRunForced(): boolean {
  return process.env.DINERO_DRY_RUN === "1";
}

/** The connection to use, or null when we must dry-run (env unconfigured OR
 *  dry-run forced OR not connected). Returns the row regardless of status so the
 *  caller can distinguish a 'broken' connection (surface it) from 'not connected'
 *  (benign simulate). */
async function loadActiveConnection(): Promise<DineroConnection | null> {
  if (!envConfigured() || dryRunForced()) return null;
  return prisma.dineroConnection.findFirst();
}

export async function currentCompanyId(): Promise<number> {
  const c = await prisma.company.findFirst({ select: { id: true } });
  return c?.id ?? 1;
}

// ─── Token encryption at rest (AES-256-GCM) ───────────────────────────────────
function encKey(): Buffer {
  const raw = process.env.DINERO_TOKEN_ENC_KEY ?? "";
  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, "hex"); // 32 bytes hex
  return createHash("sha256").update(raw).digest(); // any string → 32 bytes
}
function encryptToken(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encKey(), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${tag.toString("base64")}:${ct.toString("base64")}`;
}
function decryptToken(enc: string): string {
  const [ivB, tagB, ctB] = enc.split(":");
  if (!ivB || !tagB || !ctB) throw new Error("Ugyldigt krypteret token");
  const decipher = createDecipheriv("aes-256-gcm", encKey(), Buffer.from(ivB, "base64"));
  decipher.setAuthTag(Buffer.from(tagB, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(ctB, "base64")), decipher.final()]).toString("utf8");
}

// ─── OAuth state (stateless HMAC + single-use nonce bound to a cookie) ─────────
// The nonce is embedded in the signed state AND set as a cookie on the connect
// GET; the callback requires the two to match (single-use, browser-bound). This
// blocks state replay / authorization-code injection despite the cross-site
// form_post that prevents relying on the session cookie.
function stateSecret(): string {
  const s = process.env.SESSION_SECRET;
  const isBuild = process.env.NEXT_PHASE === "phase-production-build";
  if (process.env.NODE_ENV === "production" && !isBuild) {
    if (!s || s.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters in production.");
    return s;
  }
  return s || "karltoffel-dev-secret-change-me";
}
export function signState(userId: number): { state: string; nonce: string } {
  const nonce = randomBytes(16).toString("hex");
  const exp = Math.floor(Date.now() / 1000) + 600; // 10 min
  const payload = `${userId}.${exp}.${nonce}`;
  const sig = createHmac("sha256", stateSecret()).update(payload).digest("base64url");
  return { state: `${Buffer.from(payload).toString("base64url")}.${sig}`, nonce };
}
export function verifyState(state: string | null | undefined): { userId: number; nonce: string } | null {
  try {
    if (!state) return null;
    const i = state.lastIndexOf(".");
    if (i < 0) return null;
    const payload = Buffer.from(state.slice(0, i), "base64url").toString();
    const sigBuf = Buffer.from(state.slice(i + 1), "base64url");
    const expBuf = Buffer.from(createHmac("sha256", stateSecret()).update(payload).digest("base64url"), "base64url");
    // Compare decoded buffers — timingSafeEqual throws on length mismatch, so guard it.
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null;
    const parts = payload.split(".");
    if (parts.length !== 3) return null;
    const [id, exp, nonce] = parts;
    if (!id || !exp || !nonce || Number(exp) * 1000 < Date.now()) return null;
    const userId = Number(id);
    return Number.isFinite(userId) ? { userId, nonce } : null;
  } catch {
    return null;
  }
}

// ─── OAuth URLs + token requests ──────────────────────────────────────────────
export function redirectUriFor(origin: string): string {
  return process.env.DINERO_REDIRECT_URI?.trim() || `${origin}/api/dinero/callback`;
}
export function buildAuthorizeUrl(redirectUri: string, state: string): string {
  const p = new URLSearchParams({
    client_id: process.env.DINERO_CLIENT_ID ?? "",
    response_type: "code",
    response_mode: "form_post", // → the authorization code is POSTed to redirect_uri
    scope: SCOPES,
    redirect_uri: redirectUri,
    state,
    ui_locales: "da-DK",
  });
  return `${CONNECT_BASE}/connect/authorize?${p.toString()}`;
}

type TokenResponse = { access_token: string; refresh_token?: string; expires_in: number; scope?: string };

async function tokenRequest(params: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(`${CONNECT_BASE}/connect/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.DINERO_CLIENT_ID ?? "",
      client_secret: process.env.DINERO_CLIENT_SECRET ?? "",
      ...params,
    }).toString(),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  const raw = await res.text().catch(() => "");
  let data: Record<string, unknown> = {};
  try { data = raw ? (JSON.parse(raw) as Record<string, unknown>) : {}; } catch { /* keep raw */ }
  if (!res.ok) throw new DineroApiError(res.status, `Visma token ${res.status}: ${raw.slice(0, 300)}`, raw);
  return data as unknown as TokenResponse;
}
export function exchangeCodeForTokens(code: string, redirectUri: string): Promise<TokenResponse> {
  return tokenRequest({ grant_type: "authorization_code", code, redirect_uri: redirectUri });
}
function refreshTokens(refreshToken: string): Promise<TokenResponse> {
  return tokenRequest({ grant_type: "refresh_token", refresh_token: refreshToken });
}

// Marker so getAccessToken can tell a definitive grant rejection (→ mark broken)
// from a transient failure (network / 5xx → leave the connection intact).
class RefreshFailed extends Error {
  definitive: boolean;
  constructor(message: string, definitive: boolean) {
    super(message);
    this.definitive = definitive;
  }
}

// ─── Access token with single-flight refresh under a row lock ─────────────────
// Refresh tokens ROTATE and are one-time: two invocations refreshing at once would
// double-exchange and Visma invalidates the ENTIRE authorization. A SELECT … FOR
// UPDATE on the connection row serialises refreshes — the loser waits, re-reads the
// freshly rotated access token, and returns it WITHOUT calling Visma again.
async function getAccessToken(conn: DineroConnection): Promise<string> {
  const valid = (a: string | null, exp: Date | null) => Boolean(a && exp && exp.getTime() - Date.now() > 60_000);
  if (valid(conn.accessToken, conn.accessTokenExpiresAt)) return conn.accessToken as string;

  try {
    return await prisma.$transaction(
      async (tx) => {
        const rows = await tx.$queryRaw<
          Array<{ accessToken: string | null; accessTokenExpiresAt: Date | null; refreshTokenEnc: string }>
        >`SELECT "accessToken", "accessTokenExpiresAt", "refreshTokenEnc" FROM "DineroConnection" WHERE "id" = ${conn.id} FOR UPDATE`;
        const fresh = rows[0];
        if (!fresh) throw new RefreshFailed("Dinero-forbindelsen findes ikke længere", true);
        const exp = fresh.accessTokenExpiresAt ? new Date(fresh.accessTokenExpiresAt) : null;
        if (valid(fresh.accessToken, exp)) return fresh.accessToken as string; // another request refreshed while we waited

        let tok: TokenResponse;
        try {
          tok = await refreshTokens(decryptToken(fresh.refreshTokenEnc));
        } catch (e) {
          // Definitive only on a 400/401 grant rejection; transient (network/5xx) must NOT break the connection.
          const definitive =
            e instanceof DineroApiError && (e.status === 400 || e.status === 401) && /invalid_grant/i.test(e.raw);
          throw new RefreshFailed(e instanceof Error ? e.message : "refresh fejlede", definitive);
        }
        const newExp = new Date(Date.now() + (Math.max(60, tok.expires_in || 3600) - 60) * 1000);
        await tx.dineroConnection.update({
          where: { id: conn.id },
          data: {
            refreshTokenEnc: encryptToken(tok.refresh_token ?? decryptToken(fresh.refreshTokenEnc)),
            accessToken: tok.access_token,
            accessTokenExpiresAt: newExp,
            scopes: tok.scope ?? conn.scopes,
            status: "connected",
          },
        });
        return tok.access_token;
      },
      { timeout: 20_000 },
    );
  } catch (e) {
    if (e instanceof RefreshFailed) {
      // Mark broken OUTSIDE the (now rolled-back) transaction, and only when the
      // grant is definitively dead — otherwise a transient blip would strand the
      // integration in a fake-success 'simulated' state.
      if (e.definitive) {
        await prisma.dineroConnection.update({ where: { id: conn.id }, data: { status: "broken" } }).catch(() => {});
        throw new Error(`Dinero-forbindelsen er udløbet og skal gen-forbindes (${e.message})`);
      }
      throw new Error(`Kunne ikke forny Dinero-adgang (midlertidig fejl): ${e.message}`);
    }
    throw e;
  }
}

// ─── Low-level resource fetch + response helpers ──────────────────────────────
class DineroApiError extends Error {
  status: number;
  raw: string;
  constructor(status: number, message: string, raw: string) {
    super(message);
    this.status = status;
    this.raw = raw;
  }
}

async function dineroJson(
  method: string,
  url: string,
  access: string,
  body?: unknown,
): Promise<Record<string, unknown> | unknown[]> {
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${access}`,
      accept: "application/json",
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new DineroApiError(res.status, `Dinero ${res.status}: ${detail}`.slice(0, 400), detail);
  }
  if (res.status === 204) return {};
  return (await res.json().catch(() => ({}))) as Record<string, unknown> | unknown[];
}

/** Case-insensitive property lookup — Dinero has shipped both PascalCase and
 *  camelCase responses; we read tolerantly. */
function ci(obj: unknown, key: string): unknown {
  if (!obj || typeof obj !== "object") return undefined;
  const o = obj as Record<string, unknown>;
  if (key in o) return o[key];
  const lk = key.toLowerCase();
  for (const k of Object.keys(o)) if (k.toLowerCase() === lk) return o[k];
  return undefined;
}
function numOr(v: unknown): number | null {
  if (v == null) return null; // JSON null must NOT coerce to 0 (Number(null) === 0)
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}
function strOr(v: unknown): string | null {
  return typeof v === "string" && v ? v : null;
}
function coll(data: Record<string, unknown> | unknown[]): unknown[] {
  return (Array.isArray(data) ? data : (ci(data, "Collection") as unknown[])) ?? [];
}

// ─── Small mapping helpers ────────────────────────────────────────────────────
function cphDate(now = new Date()): string {
  // en-CA formats as YYYY-MM-DD; Copenhagen wall-clock date (invoice date = today).
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Copenhagen",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
/** Contact.city stores "8660 Skanderborg" in one column — split the 4-digit zip. */
function splitZipCity(s: string | null): { zip: string; city: string } {
  const m = (s ?? "").trim().match(/^(\d{4})\s+(.*)$/);
  return m ? { zip: m[1], city: m[2] } : { zip: "", city: (s ?? "").trim() };
}
/** Escape a value for a Dinero queryFilter string literal (OData-style: double the
 *  single quotes) so an apostrophe in an email/CVR cannot break or shift the match. */
function qf(v: string): string {
  return v.replace(/'/g, "''");
}
const contactExtRef = (id: number) => `karltoffel-contact-${id}`;
const orderExtRef = (id: number) => `karltoffel-order-${id}`;

// ─── Contacts ─────────────────────────────────────────────────────────────────
async function findContactGuid(access: string, org: string, queryFilter: string): Promise<string | null> {
  const url = `${API_BASE}/${V_CONTACTS}/${org}/contacts?queryFilter=${encodeURIComponent(queryFilter)}&fields=ContactGuid`;
  const first = coll(await dineroJson("GET", url, access))[0];
  return first ? strOr(ci(first, "ContactGuid")) ?? strOr(ci(first, "Guid")) : null;
}

type ContactLike = {
  id: number; isCompany: boolean; companyName: string | null; name: string;
  cvr: string | null; ean: string | null; email: string | null; phone: string | null;
  street: string; city: string; att: string | null;
};

/** Reuse the stored guid, else dedup (externalReference → CVR → email), else create. */
async function ensureDineroContact(access: string, org: string, contact: ContactLike): Promise<string> {
  let guid = await findContactGuid(access, org, `ExternalReference eq '${qf(contactExtRef(contact.id))}'`);
  if (!guid && contact.isCompany && contact.cvr) guid = await findContactGuid(access, org, `VatNumber eq '${qf(contact.cvr)}'`);
  if (!guid && contact.email) guid = await findContactGuid(access, org, `Email eq '${qf(contact.email)}'`);
  if (guid) return guid;

  const { zip, city } = splitZipCity(contact.city);
  const body = {
    Name: contact.isCompany ? contact.companyName || contact.name : contact.name,
    CountryKey: "DK",
    IsPerson: !contact.isCompany,
    IsMember: false,
    UseCvr: false,
    Street: contact.street || undefined,
    ZipCode: zip || undefined,
    City: city || undefined,
    Email: contact.email || undefined,
    Phone: contact.phone || undefined,
    AttPerson: contact.isCompany ? contact.att || undefined : undefined,
    VatNumber: contact.isCompany ? contact.cvr || undefined : undefined,
    EanNumber: contact.ean || undefined,
    ExternalReference: contactExtRef(contact.id),
  };
  const data = await dineroJson("POST", `${API_BASE}/${V_CONTACTS}/${org}/contacts`, access, body);
  const newGuid = strOr(ci(data, "ContactGuid")) ?? strOr(ci(data, "Guid"));
  if (!newGuid) throw new Error("Dinero returnerede ingen ContactGuid");
  return newGuid;
}

// ─── Invoices ─────────────────────────────────────────────────────────────────
type InvoiceRef = { guid: string; timeStamp: string; number: number | null; totalInclVat: number | null };
function toInvoiceRef(o: unknown, guid: string, fallbackTs = ""): InvoiceRef {
  return {
    guid,
    timeStamp: strOr(ci(o, "TimeStamp")) ?? fallbackTs,
    number: numOr(ci(o, "Number")),
    totalInclVat: numOr(ci(o, "TotalInclVat")),
  };
}

async function findInvoiceByExternalRef(access: string, org: string, ref: string): Promise<InvoiceRef | null> {
  const filter = encodeURIComponent(`ExternalReference eq '${qf(ref)}'`);
  const url = `${API_BASE}/${V_INVOICES}/${org}/invoices?queryFilter=${filter}&fields=Guid,TimeStamp,Number,TotalInclVat`;
  const first = coll(await dineroJson("GET", url, access))[0];
  if (!first) return null;
  const guid = strOr(ci(first, "Guid"));
  return guid ? toInvoiceRef(first, guid) : null;
}

async function getInvoice(access: string, org: string, guid: string): Promise<InvoiceRef> {
  return toInvoiceRef(await dineroJson("GET", `${API_BASE}/${V_INVOICES}/${org}/invoices/${guid}`, access), guid);
}

async function createDraftInvoice(
  access: string,
  org: string,
  input: { contactGuid: string; orderId: number; salesAccountNumber: number; tasks: Array<{ description: string; price: number }> },
): Promise<InvoiceRef> {
  const body = {
    ContactGuid: input.contactGuid,
    Date: cphDate(),
    Currency: "DKK",
    Language: "da-DK",
    ShowLinesInclVat: true, // BaseAmountValue is kr INCL. VAT (TaskLine.price convention)
    Description: `Ordre #${input.orderId}`,
    ExternalReference: orderExtRef(input.orderId),
    ProductLines: input.tasks.map((t) => ({
      Description: t.description,
      Quantity: 1,
      AccountNumber: input.salesAccountNumber,
      Unit: "parts",
      Discount: 0,
      LineType: "Product",
      BaseAmountValue: t.price,
    })),
  };
  const data = await dineroJson("POST", `${API_BASE}/${V_INVOICES}/${org}/invoices`, access, body);
  const guid = strOr(ci(data, "Guid"));
  if (!guid) throw new Error("Dinero returnerede ingen faktura-Guid");
  return toInvoiceRef(data, guid);
}

async function bookInvoiceOnce(access: string, org: string, guid: string, timeStamp: string): Promise<InvoiceRef> {
  const data = await dineroJson("POST", `${API_BASE}/${V_INVOICES}/${org}/invoices/${guid}/book`, access, { Timestamp: timeStamp });
  return toInvoiceRef(data, guid, timeStamp);
}
/** Book, retrying once on a stale-timestamp error (Dinero error code 58). Matches a
 *  structured error code, not any stray "58"/"timestamp" in the body. */
async function bookInvoice(access: string, org: string, guid: string, timeStamp: string): Promise<InvoiceRef> {
  try {
    return await bookInvoiceOnce(access, org, guid, timeStamp);
  } catch (e) {
    if (e instanceof DineroApiError && /"?(errorcode|code)"?\s*:\s*58\b/i.test(e.raw)) {
      const fresh = await getInvoice(access, org, guid);
      return await bookInvoiceOnce(access, org, guid, fresh.timeStamp);
    }
    throw e;
  }
}

async function emailInvoice(access: string, org: string, guid: string, timeStamp: string): Promise<void> {
  // Dinero sends the mail (with a public invoice link) — the CRM must NOT also
  // email the invoice via Resend. Receiver defaults to the Dinero contact's email.
  await dineroJson("POST", `${API_BASE}/${V_INVOICES}/${org}/invoices/${guid}/email`, access, {
    Timestamp: timeStamp,
    AddVoucherAsPdfAttachment: true,
  });
}

/** Best-effort: does the invoice already have a payment registered? Used to avoid
 *  double-registering a cash payment when a prior run crashed after the POST. If the
 *  lookup itself fails we return false (proceed) — the narrow crash+lookup-fail race
 *  is accepted; the per-order lock covers the common double-click case. */
async function invoiceHasPayment(access: string, org: string, guid: string): Promise<boolean> {
  try {
    return coll(await dineroJson("GET", `${API_BASE}/${V_INVOICES}/${org}/invoices/${guid}/payments`, access)).length > 0;
  } catch {
    return false;
  }
}

async function registerPayment(
  access: string,
  org: string,
  guid: string,
  input: { amount: number; depositAccountNumber: number; timeStamp: string },
): Promise<string | null> {
  const data = await dineroJson("POST", `${API_BASE}/${V_INVOICES}/${org}/invoices/${guid}/payments`, access, {
    Timestamp: input.timeStamp,
    Amount: input.amount,
    DepositAccountNumber: input.depositAccountNumber,
    PaymentDate: cphDate(),
    Description: "Kontant betaling",
    RemainderIsFee: false,
  });
  return strOr(ci(data, "PaymentGuid")) ?? strOr(ci(data, "Guid"));
}

// ─── Organizations + connection persistence (used by the OAuth callback) ──────
export async function discoverOrganizations(
  access: string,
): Promise<Array<{ organizationId: string; name: string | null; isPro: boolean }>> {
  // Request IsPro explicitly — list endpoints omit non-default fields otherwise,
  // which would make every org look non-Pro and pick the wrong one.
  const data = await dineroJson("GET", `${API_BASE}/${V_ORGS}/organizations?fields=Name,Id,IsPro`, access);
  return coll(data)
    .map((o) => ({
      organizationId: String(ci(o, "Id") ?? ci(o, "organizationId") ?? ""),
      name: strOr(ci(o, "Name")),
      isPro: Boolean(ci(o, "IsPro")),
    }))
    .filter((o) => o.organizationId);
}

/** Complete the OAuth handshake: exchange the code, pick the organization
 *  (single-tenant: prefer a Pro org), and persist an (encrypted) connection. */
export async function connectFromCallback(
  companyId: number,
  code: string,
  redirectUri: string,
): Promise<{ organizationId: string; orgName: string | null; isPro: boolean }> {
  const tok = await exchangeCodeForTokens(code, redirectUri);
  if (!tok.refresh_token) throw new Error("Ingen refresh_token modtaget (mangler offline_access-scope?)");
  const orgs = await discoverOrganizations(tok.access_token);
  if (!orgs.length) throw new Error("Ingen Dinero-organisationer tilgængelige for brugeren");
  const chosen = orgs.find((o) => o.isPro) ?? orgs[0]; // v1: single-tenant, prefer Pro (API requires Pro)

  const expiresAt = new Date(Date.now() + (Math.max(60, tok.expires_in || 3600) - 60) * 1000);
  const enc = encryptToken(tok.refresh_token);
  await prisma.dineroConnection.upsert({
    where: { companyId },
    create: {
      companyId, organizationId: chosen.organizationId, orgName: chosen.name, isPro: chosen.isPro,
      refreshTokenEnc: enc, accessToken: tok.access_token, accessTokenExpiresAt: expiresAt,
      scopes: tok.scope, status: "connected",
    },
    update: {
      organizationId: chosen.organizationId, orgName: chosen.name, isPro: chosen.isPro,
      refreshTokenEnc: enc, accessToken: tok.access_token, accessTokenExpiresAt: expiresAt,
      scopes: tok.scope, status: "connected",
    },
  });
  return { organizationId: chosen.organizationId, orgName: chosen.name, isPro: chosen.isPro };
}

// ─── Status for the /accounting page ──────────────────────────────────────────
export type DineroStatus = {
  envReady: boolean;
  dryRunForced: boolean;
  connection: DineroConnection | null;
};
export async function getDineroStatus(): Promise<DineroStatus> {
  return {
    envReady: envConfigured(),
    dryRunForced: dryRunForced(),
    connection: await prisma.dineroConnection.findFirst(),
  };
}

// ─── The orchestration: invoice one order per its stored decision ─────────────
export type IssueResult = { ok: boolean; simulated?: boolean; status: string; error?: string };
const BOOKED_STATES = new Set(["Booked", "Sent", "Paid"]);

/**
 * Issue/advance the Dinero invoice for an order according to order.invoiceDecision.
 * NEVER throws — failures are caught, persisted (dineroError; status → 'Failed' only
 * when not already booked) and returned, so order completion is decoupled from
 * bookkeeping. Idempotent + resumable: draft creation is serialised per order under
 * a Postgres advisory lock and the guid is persisted inside that lock, so concurrent
 * runs and crash-recovery cannot create a second invoice; each later step is
 * persisted before the next.
 */
export async function issueInvoiceForOrder(orderId: number): Promise<IssueResult> {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { contact: true, tasks: true } });
  if (!order) return { ok: false, status: "Failed", error: "Ordre ikke fundet" };

  const decision = order.invoiceDecision;
  if (!decision || !isInvoiceDecision(decision) || decision === D_NONE || decision === D_LATER) {
    return { ok: true, status: decision === D_LATER ? "later" : "none" };
  }

  const sumInclVat = order.tasks.reduce((a, t) => a + t.price, 0);

  const conn = await loadActiveConnection();
  if (!conn) {
    // Dry-run: log the would-be chain, mark simulated — but NEVER downgrade an order
    // that already carries a real Dinero invoice (guid present).
    console.log(`[dinero:dry-run] faktura ordre #${orderId} valg="${decision}" linjer=${order.tasks.length} sum=${sumInclVat}kr`);
    await prisma.order.updateMany({
      where: { id: orderId, dineroInvoiceGuid: null },
      data: { dineroInvoiceStatus: "simulated", dineroError: null, invoicedAt: new Date() },
    });
    return { ok: true, simulated: true, status: "simulated" };
  }
  if (conn.status === "broken") {
    const msg = "Dinero-forbindelsen er udløbet — genforbind under Regnskab.";
    await prisma.order.update({ where: { id: orderId }, data: { dineroInvoiceStatus: "Failed", dineroError: msg } });
    return { ok: false, status: "Failed", error: msg };
  }

  // Resume markers taken from the pre-run snapshot (dineroInvoiceNumber is assigned
  // only at booking and is never cleared, so it survives a 'Failed' status write).
  const alreadyBooked = BOOKED_STATES.has(order.dineroInvoiceStatus ?? "") || order.dineroInvoiceNumber != null;

  try {
    const access = await getAccessToken(conn);
    const org = conn.organizationId;

    // 1. Ensure a Dinero contact. Do not steal a guid already owned by another
    //    CRM contact (duplicate customers sharing an email/CVR) — that would violate
    //    Contact.dineroContactGuid @unique; use it transiently instead.
    let contactGuid = order.contact.dineroContactGuid;
    if (!contactGuid) {
      contactGuid = await ensureDineroContact(access, org, order.contact);
      const clash = await prisma.contact.findFirst({
        where: { dineroContactGuid: contactGuid, NOT: { id: order.contactId } },
        select: { id: true },
      });
      if (!clash) await prisma.contact.update({ where: { id: order.contactId }, data: { dineroContactGuid: contactGuid } });
    }

    // 2. Reuse / adopt / create the draft invoice, SERIALISED per order under an
    //    advisory lock and persisted inside it, so concurrent runs and crash-recovery
    //    cannot create a second invoice (@unique dineroInvoiceGuid alone can't).
    const ensured = await prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(${BigInt(orderId)})`;
        const row = await tx.order.findUnique({
          where: { id: orderId },
          select: { dineroInvoiceGuid: true, dineroInvoiceTimeStamp: true, dineroInvoiceStatus: true },
        });
        let guid = row?.dineroInvoiceGuid ?? null;
        let timeStamp = row?.dineroInvoiceTimeStamp ?? "";
        if (!guid) {
          const found = await findInvoiceByExternalRef(access, org, orderExtRef(orderId));
          if (found) { guid = found.guid; timeStamp = found.timeStamp; }
        }
        if (!guid) {
          const draft = await createDraftInvoice(access, org, {
            contactGuid, orderId, salesAccountNumber: conn.salesAccountNumber,
            tasks: order.tasks.map((t) => ({ description: t.description, price: t.price })),
          });
          guid = draft.guid;
          timeStamp = draft.timeStamp;
        }
        // Persist the guid inside the lock (fixes the adopt/crash path where it was
        // previously only a local variable). Keep a booked status if we already have one.
        const keepBooked = row && BOOKED_STATES.has(row.dineroInvoiceStatus ?? "");
        await tx.order.update({
          where: { id: orderId },
          data: {
            dineroInvoiceGuid: guid,
            dineroInvoiceTimeStamp: timeStamp,
            dineroInvoiceStatus: keepBooked ? row.dineroInvoiceStatus : "Draft",
            dineroError: null,
          },
        });
        return { guid, timeStamp };
      },
      { timeout: 30_000 },
    );
    const guid = ensured.guid;
    let timeStamp = ensured.timeStamp;

    // 3. Draft-only: stop here (user finishes it in Dinero's Salg UI).
    if (decision === D_DRAFT) {
      await prisma.order.update({ where: { id: orderId }, data: { dineroInvoiceStatus: "Draft", invoicedAt: new Date(), dineroError: null } });
      return { ok: true, status: "Draft" };
    }

    // 4. Book (irreversible) — guarded by a fail-CLOSED VAT/total sanity check.
    let bookedTotal: number | null = null;
    if (!alreadyBooked) {
      const detail = await getInvoice(access, org, guid);
      if (detail.timeStamp) timeStamp = detail.timeStamp;
      if (detail.number != null) {
        // Already booked in Dinero (a prior book whose response was lost) — adopt it,
        // never re-book. A booked invoice carries an assigned Number; a draft does not.
        bookedTotal = detail.totalInclVat;
        await prisma.order.update({
          where: { id: orderId },
          data: { dineroInvoiceNumber: detail.number, dineroInvoiceTimeStamp: timeStamp, dineroInvoiceStatus: "Booked", dineroError: null },
        });
      } else {
        if (detail.totalInclVat == null) {
          throw new Error("Momskontrol umulig: Dinero returnerede ingen total — kladden er IKKE bogført.");
        }
        if (Math.abs(detail.totalInclVat - sumInclVat) > 1) {
          throw new Error(`Momskontrol fejlede: Dinero-total ${detail.totalInclVat} kr ≠ ordrens ${sumInclVat} kr. Kladden er IKKE bogført.`);
        }
        const booked = await bookInvoice(access, org, guid, timeStamp);
        timeStamp = booked.timeStamp || timeStamp;
        bookedTotal = booked.totalInclVat ?? detail.totalInclVat;
        await prisma.order.update({
          where: { id: orderId },
          data: {
            dineroInvoiceNumber: booked.number ?? order.dineroInvoiceNumber,
            dineroInvoiceTimeStamp: timeStamp,
            dineroInvoiceStatus: "Booked",
            dineroError: null,
          },
        });
      }
    } else {
      const detail = await getInvoice(access, org, guid);
      if (detail.timeStamp) timeStamp = detail.timeStamp;
      bookedTotal = detail.totalInclVat;
    }

    // 5. Send (email) — "Send faktura - ubetalt". Never downgrade a Paid invoice.
    if (decision === D_SEND_UNPAID) {
      if (order.dineroInvoiceStatus !== "Sent" && order.dineroInvoiceStatus !== "Paid") {
        await emailInvoice(access, org, guid, timeStamp);
      }
      await prisma.order.update({
        where: { id: orderId },
        data: { dineroInvoiceStatus: order.dineroInvoiceStatus === "Paid" ? "Paid" : "Sent", invoicedAt: new Date(), dineroError: null },
      });
      return { ok: true, status: order.dineroInvoiceStatus === "Paid" ? "Paid" : "Sent" };
    }

    // 6. Register cash payment — "Send faktura - betalt kontant" (idempotent).
    if (decision === D_SEND_CASH) {
      let paymentGuid = order.dineroPaymentGuid;
      if (order.dineroInvoiceStatus !== "Paid" && !(await invoiceHasPayment(access, org, guid))) {
        paymentGuid = await registerPayment(access, org, guid, {
          amount: bookedTotal ?? sumInclVat, // Dinero's own booked total, not the CRM Int sum
          depositAccountNumber: conn.cashAccountNumber,
          timeStamp,
        });
      }
      await prisma.order.update({
        where: { id: orderId },
        data: { dineroPaymentGuid: paymentGuid, dineroInvoiceStatus: "Paid", invoicedAt: new Date(), dineroError: null },
      });
      return { ok: true, status: "Paid" };
    }

    return { ok: true, status: order.dineroInvoiceStatus ?? "Booked" };
  } catch (e) {
    const msg = (e instanceof Error ? e.message : "Fakturering fejlede").slice(0, 500);
    // Record the error, but NEVER downgrade a booked invoice to 'Failed' (a retry
    // would otherwise re-book it). dineroInvoiceNumber survives as the booked proof.
    const cur = await prisma.order.findUnique({
      where: { id: orderId },
      select: { dineroInvoiceStatus: true, dineroInvoiceNumber: true },
    });
    const isBooked = BOOKED_STATES.has(cur?.dineroInvoiceStatus ?? "") || cur?.dineroInvoiceNumber != null;
    await prisma.order.update({
      where: { id: orderId },
      data: { dineroError: msg, ...(isBooked ? {} : { dineroInvoiceStatus: "Failed" }) },
    });
    return { ok: false, status: isBooked ? cur?.dineroInvoiceStatus ?? "Booked" : "Failed", error: msg };
  }
}
