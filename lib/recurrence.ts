// Subscription → order recurrence. Materialises the upcoming orders for active
// subscriptions from the base interval + per-task interval multiplier + start
// week, so the calendar reflects recurring work automatically. Idempotent:
// re-running skips weeks that already have an order for the subscription, and
// skips holiday weeks. Server-only (Node) — used by the subscription actions,
// the manual "Generér" button and the nightly /api/plan cron.
import { prisma } from "./db";

const WEEK_MS = 7 * 864e5;
const DEFAULT_HORIZON_WEEKS = 26;

/** Monday (UTC midnight) of ISO week `week` in `year`. */
function mondayOfIsoWeek(year: number, week: number): Date {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Weekday = (jan4.getUTCDay() + 6) % 7; // 0 = Monday
  const week1Monday = jan4.getTime() - jan4Weekday * 864e5;
  return new Date(week1Monday + (week - 1) * WEEK_MS);
}

/** Monday (UTC midnight) of the ISO week containing `d`. */
function mondayOf(d: Date): Date {
  const wd = (d.getUTCDay() + 6) % 7;
  const midnight = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return new Date(midnight - wd * 864e5);
}

/** "Hver uge" → 1, "Hver 2. uge" → 2, … */
function parseBaseInterval(label: string): number {
  const m = label.match(/Hver\s+(\d+)\.\s*uge/i);
  if (m) return Number(m[1]);
  return /Hver\s+uge/i.test(label) ? 1 : 1;
}

/** "Hver gang" → 1, "Hver 2. gang" → 2, "På anmodning" → null (not auto-scheduled). */
function parseMultiplier(label: string | null): number | null {
  if (!label) return 1;
  if (/anmodning/i.test(label)) return null;
  const m = label.match(/Hver\s+(\d+)\.\s*gang/i);
  if (m) return Number(m[1]);
  return /Hver\s+gang/i.test(label) ? 1 : 1;
}

/** "Uge 29" → 29 (year-less; resolved against a reference year). */
function parseWeekLabel(label: string | null): number | null {
  if (!label) return null;
  const m = label.match(/Uge\s+(\d+)/i);
  return m ? Number(m[1]) : null;
}

/** Monday of the subscription's/task's start week, in the reference year's week grid. */
function anchorMonday(weekLabel: string | null, ref: Date): Date | null {
  const wk = parseWeekLabel(weekLabel);
  if (wk == null) return null;
  return mondayOfIsoWeek(ref.getUTCFullYear(), wk);
}

type SubWithTasks = Awaited<ReturnType<typeof loadActiveSubs>>[number];
function loadActiveSubs() {
  return prisma.subscription.findMany({ where: { active: true }, include: { tasks: true } });
}

async function defaultEmployeeId(fixedEmployee: string): Promise<number | null> {
  const users = await prisma.user.findMany({ orderBy: { id: "asc" } });
  if (fixedEmployee && fixedEmployee !== "Ingen") {
    const match = users.find((u) => `${u.firstName} ${u.lastName}` === fixedEmployee);
    if (match) return match.id;
  }
  return users[0]?.id ?? null;
}

/** Generate the upcoming orders for one subscription. Returns the count created. */
export async function generateForSubscription(sub: SubWithTasks, ref: Date = new Date(), horizonWeeks = DEFAULT_HORIZON_WEEKS): Promise<number> {
  const base = parseBaseInterval(sub.baseInterval);
  const subAnchor = anchorMonday(sub.startWeek, ref);
  if (!subAnchor) return 0;

  const thisMonday = mondayOf(ref).getTime();
  const horizonEnd = thisMonday + horizonWeeks * WEEK_MS;

  // Existing orders for this subscription, keyed by their week's Monday (dedup).
  const existing = await prisma.order.findMany({ where: { subscriptionId: sub.id }, select: { plannedAt: true } });
  const existingWeeks = new Set(existing.map((o) => mondayOf(o.plannedAt).getTime()));

  const holidays = await prisma.holidayWeek.findMany();
  const isHoliday = (ms: number) => holidays.some((h) => ms >= h.startWeek.getTime() && ms <= h.endWeek.getTime());

  const employeeId = await defaultEmployeeId(sub.fixedEmployee);

  // First visit at or after the current week, keeping the base rhythm.
  const step = base * WEEK_MS;
  let v = subAnchor.getTime();
  if (v < thisMonday) v += Math.ceil((thisMonday - v) / step) * step;

  let created = 0;
  for (; v <= horizonEnd; v += step) {
    if (isHoliday(v) || existingWeeks.has(v)) continue;

    // Tasks due at this visit: on the (multiplier × base)-week rhythm from their start.
    const due = sub.tasks.filter((t) => {
      const m = parseMultiplier(t.intervalMultiplier);
      if (m == null) return false; // "På anmodning" — not auto-scheduled
      const ta = (anchorMonday(t.startWeek ?? sub.startWeek, ref) ?? subAnchor).getTime();
      if (v < ta) return false;
      const weeksSince = Math.round((v - ta) / WEEK_MS);
      return weeksSince % (m * base) === 0;
    });
    if (!due.length) continue;

    await prisma.order.create({
      data: {
        contactId: sub.contactId,
        deliveryAddress: sub.deliveryAddress,
        plannedAt: new Date(v + 10 * 3600 * 1000), // Monday 10:00 UTC
        sourceType: "subscription",
        subscriptionId: sub.id,
        employeeId,
        tasks: {
          create: due.map((t, i) => ({
            category: t.category, letter: t.letter, color: t.color,
            description: t.description, price: t.price, durationMin: t.durationMin,
            intervalMultiplier: t.intervalMultiplier, startWeek: t.startWeek,
            isStandardTask: t.isStandardTask, fromSubscription: true, sort: i,
          })),
        },
      },
    });
    existingWeeks.add(v);
    created++;
  }
  return created;
}

/** Generate upcoming orders for every active subscription. Returns total created. */
export async function generateAllSubscriptionOrders(ref: Date = new Date(), horizonWeeks = DEFAULT_HORIZON_WEEKS): Promise<number> {
  const subs = await loadActiveSubs();
  let total = 0;
  for (const sub of subs) total += await generateForSubscription(sub, ref, horizonWeeks);
  return total;
}

/** Generate for a single subscription id (used after create/edit). */
export async function generateForSubscriptionId(id: number, ref: Date = new Date(), horizonWeeks = DEFAULT_HORIZON_WEEKS): Promise<number> {
  const sub = await prisma.subscription.findUnique({ where: { id }, include: { tasks: true } });
  if (!sub || !sub.active) return 0;
  return generateForSubscription(sub, ref, horizonWeeks);
}
