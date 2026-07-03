import { getCalendarWeek } from "@/lib/queries";
import { WEEK_MONDAY } from "@/lib/calendar";
import CalendarClient from "@/components/CalendarClient";

export const metadata = { title: "Kalender · Karltoffel" };

export default async function CalendarPage() {
  const week = await getCalendarWeek(WEEK_MONDAY);
  return <CalendarClient week={week} />;
}
