// Pure server-side rendering for quote ("tilbud") e-mails: a {{token}} replacer
// and the token map built from a Contact (+ optional Order) and the Company.
// No DB, no I/O — safe to unit test and to call from a server action.

/** Replace every {{token}} in `text` with vars[token]. Unknown tokens are left
 *  verbatim so staff can spot an unfilled placeholder in the preview. */
export function renderTemplate(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (m, k) => (k in vars ? vars[k] : m));
}

function kr(n: number): string {
  return n.toLocaleString("da-DK") + " kr";
}
function firstWord(s: string): string {
  return (s.trim().split(/\s+/)[0] || "").trim();
}

export type QuoteContact = {
  name: string; att: string | null; isCompany: boolean;
  email: string | null; street: string; city: string;
};
export type QuoteTask = { description: string; price: number };
export type QuoteOrderLike = { deliveryAddress: string; tasks: QuoteTask[] } | null;
export type QuoteCompany = { name: string; phone: string | null; email: string | null };

/** Build the {{token}} → value map for a quote. `now` is injectable so the
 *  30-day validity date is deterministic in tests. */
export function buildQuoteVars(
  contact: QuoteContact,
  order: QuoteOrderLike,
  company: QuoteCompany,
  opts: { now?: Date; validDays?: number } = {},
): Record<string, string> {
  const now = opts.now ?? new Date();
  const validDays = opts.validDays ?? 30;
  const until = new Date(now.getTime() + validDays * 86_400_000);

  const nameForFirst = contact.isCompany ? contact.att || contact.name : contact.name;
  const tasks = order?.tasks ?? [];
  const total = tasks.reduce((a, t) => a + t.price, 0);
  const addr = order?.deliveryAddress || [contact.street, contact.city].filter(Boolean).join(", ");

  return {
    kunde_fornavn: firstWord(nameForFirst),
    kunde_fuldt_navn: nameForFirst,
    leverings_adresse: addr,
    opgave_liste: tasks.map((t, i) => `${i + 1}. ${t.description} – ${kr(t.price)}`).join("\n"),
    tilbud_total: kr(total),
    pris_moms_info: "Alle priser er inkl. moms.",
    tilbud_gyldig_til: new Intl.DateTimeFormat("da-DK", { day: "numeric", month: "long", year: "numeric" }).format(until),
    dit_firmanavn: company.name,
    dit_telefonnummer: company.phone ?? "",
    din_email: company.email ?? "",
  };
}
