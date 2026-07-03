import { getCalendarWeek } from "@/lib/queries";
import CalendarClient from "@/components/CalendarClient";

export const metadata = { title: "Kalender · Karltoffel" };

const iso = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;

/** Monday (UTC) of the ISO week containing `d`. */
function mondayOf(d: Date): string {
  const wd = (d.getUTCDay() + 6) % 7;
  return iso(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - wd * 864e5));
}
function shift(mondayISO: string, days: number): string {
  const d = new Date(`${mondayISO}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return iso(d);
}

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const { week } = await searchParams;
  const monday = week && /^\d{4}-\d{2}-\d{2}$/.test(week)
    ? mondayOf(new Date(`${week}T00:00:00Z`))
    : mondayOf(new Date());

  const data = await getCalendarWeek(monday);
  return <CalendarClient week={data} nav={{ prev: shift(monday, -7), next: shift(monday, 7) }} />;
}
