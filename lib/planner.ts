// ============================================================================
// Weekly route planner — the "auto-scheduler" that Fenster runs every night.
// Given the jobs due in a week and each employee's working hours + home base,
// it packs jobs into days and orders each day's stops by nearest-neighbour to
// minimise driving, producing time-slotted, employee-assigned visits.
//
// This is a deterministic first-cut greedy optimiser (no external routing API).
// Constraints honoured: working hours (+ optional flex), per-job fixed weekday
// and fixed employee, service duration, and driving time between stops.
// ============================================================================

import { driveMinutes, driveFromHomeMinutes, HOME, type LatLng } from "./geo";

export type Job = {
  id: number;
  contactId: number;
  customer: string;
  address: string;
  postal: string;
  category: string;
  durationMin: number;
  source: string;
  fixedWeekdays?: number[]; // 0=Mon … 6=Sun; undefined = any working day
  fixedEmployeeId?: number;
};

export type Employee = {
  id: number;
  name: string;
  home: LatLng;
  workStartMin: number; // minutes from midnight, e.g. 480 = 08:00
  workEndMin: number;   // e.g. 960 = 16:00
  flexMin: number;      // extra minutes allowed at end of day
  workdays: number[];   // e.g. [0,1,2,3,4] Mon–Fri
};

export type Stop = {
  job: Job;
  startMin: number;
  endMin: number;
  driveMin: number; // driving to reach this stop
};

export type DayPlan = {
  employeeId: number;
  weekday: number; // 0=Mon
  stops: Stop[];
  driveMin: number;
  serviceMin: number;
};

export type WeekPlan = {
  weekMonday: string; // ISO date
  days: DayPlan[];
  unplanned: Job[];
};

const DEFAULT_EMPLOYEE: Employee = {
  id: 1535, name: "Kristian Klercke", home: HOME,
  workStartMin: 8 * 60, workEndMin: 16 * 60, flexMin: 60, workdays: [0, 1, 2, 3, 4],
};

/** ISO week number of a Monday-date string (yyyy-mm-dd). */
export function isoWeek(mondayISO: string): number {
  const d = new Date(mondayISO + "T00:00:00Z");
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day + 3);
  const firstThu = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const firstDay = (firstThu.getUTCDay() + 6) % 7;
  firstThu.setUTCDate(firstThu.getUTCDate() - firstDay + 3);
  return 1 + Math.round((d.getTime() - firstThu.getTime()) / (7 * 864e5));
}

/**
 * Core scheduler. Greedy: for each workday, start at home and repeatedly append
 * the nearest still-unscheduled job that fits before end-of-day (incl. flex),
 * respecting the job's fixed weekday/employee. Moves to the next day when full.
 */
export function planWeek(jobs: Job[], weekMonday: string, employees: Employee[] = [DEFAULT_EMPLOYEE]): WeekPlan {
  const remaining = [...jobs];
  const days: DayPlan[] = [];

  for (const emp of employees) {
    for (const weekday of emp.workdays) {
      const day: DayPlan = { employeeId: emp.id, weekday, stops: [], driveMin: 0, serviceMin: 0 };
      let curAddr: string | null = null; // null = at home
      let cursor = emp.workStartMin;
      const hardEnd = emp.workEndMin + emp.flexMin;

      // Keep adding the nearest feasible job to this day.
      // eslint-disable-next-line no-constant-condition
      while (true) {
        let best: { idx: number; drive: number } | null = null;
        for (let i = 0; i < remaining.length; i++) {
          const j: Job = remaining[i];
          if (j.fixedEmployeeId && j.fixedEmployeeId !== emp.id) continue;
          if (j.fixedWeekdays && !j.fixedWeekdays.includes(weekday)) continue;
          const drive: number = curAddr === null ? driveFromHomeMinutes(j.address, emp.home) : driveMinutes(curAddr, j.address);
          const arrival = cursor + drive;
          if (arrival + j.durationMin > hardEnd) continue; // won't fit today
          if (!best || drive < best.drive) best = { idx: i, drive };
        }
        if (!best) break;
        const j: Job = remaining.splice(best.idx, 1)[0];
        const start = cursor + best.drive;
        const end = start + j.durationMin;
        day.stops.push({ job: j, startMin: start, endMin: end, driveMin: best.drive });
        day.driveMin += best.drive;
        day.serviceMin += j.durationMin;
        cursor = end;
        curAddr = j.address;
      }
      if (day.stops.length) days.push(day);
    }
  }

  return { weekMonday, days, unplanned: remaining };
}

// ---- convenience: sample jobs for the current demo week ----
export const DEMO_JOBS: Job[] = [
  { id: 1969863, contactId: 201482, customer: "McDonald's Stilling", address: "Ørnedvej 4, 8660 Skanderborg", postal: "8660 Skanderborg", category: "Vinduespudsning", durationMin: 60, source: "Abo. #235844" },
  { id: 1969944, contactId: 201455, customer: "Nordic Sport Invest 2", address: "Hospitalsgade 6, 8700 Horsens", postal: "8700 Horsens", category: "Viceværtservice", durationMin: 45, source: "Abo. #235837" },
  { id: 1969951, contactId: 201391, customer: "Bilhuset A/S", address: "Vejlevej 120, 8700 Horsens", postal: "8700 Horsens", category: "Rentvandsvask", durationMin: 30, source: "Manuel ordre" },
  { id: 1969960, contactId: 201310, customer: "Aarhus Storkøkken", address: "Mejlgade 12, 8000 Aarhus C", postal: "8000 Aarhus C", category: "Vinduespudsning", durationMin: 90, source: "Abo. #235801" },
  { id: 1969973, contactId: 201288, customer: "Odder Boghandel", address: "Rosensgade 20, 8300 Odder", postal: "8300 Odder", category: "Overfladerens", durationMin: 40, source: "Online ordre" },
];

export const fmtTime = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
