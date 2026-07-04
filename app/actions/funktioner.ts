"use server";

// Server actions for the Funktioner pages: holiday planning (real CRUD — the
// HolidayWeek model exists and closes the planner for those weeks), group
// messages (recipient resolution is real; delivery is stubbed), subscription
// optimization and price adjustment.
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export type ActionState = { error?: string; ok?: boolean; message?: string };

// ---- Holidays --------------------------------------------------------------

export async function createHoliday(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const start = String(formData.get("startWeek") ?? "");
  const end = String(formData.get("endWeek") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) return { error: "Vælg start- og slutuge." };
  const s = new Date(`${start}T00:00:00Z`);
  const e = new Date(`${end}T00:00:00Z`);
  if (e < s) return { error: "Slutugen skal være efter eller lig med startugen." };
  await prisma.holidayWeek.create({ data: { startWeek: s, endWeek: e } });
  revalidatePath("/holidays");
  revalidatePath("/calendar");
  revalidatePath("/daycalendar");
  return { ok: true, message: "Ferie oprettet. Kalenderen er lukket i de valgte uger." };
}

export async function deleteHoliday(id: number): Promise<void> {
  await prisma.holidayWeek.delete({ where: { id } });
  revalidatePath("/holidays");
  revalidatePath("/calendar");
  revalidatePath("/daycalendar");
}
