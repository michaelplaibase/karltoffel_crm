// Runnable smoke test for the booking engine's PURE slot-finder + duration
// estimator (no database). Run with:  npx tsx scripts/booking-smoke.ts
//
// Exercises findSlotInSchedule (capacity-based earliest-slot search over sample
// orders) and estimateLineDurations (price→duration + human-confirm flag).
import assert from "node:assert";
import { findSlotInSchedule, estimateLineDurations, BOOK_WORK_START_MIN } from "../lib/booking";

let passed = 0;
function ok(name: string, cond: boolean) {
  assert.ok(cond, `FAIL: ${name}`);
  passed++;
  console.log(`  ✓ ${name}`);
}

console.log("findSlotInSchedule:");

// 1. Empty schedule → first workday at 07:00.
{
  const s = findSlotInSchedule({ bookings: [], durationMin: 90, fromDateISO: "2026-07-20" }); // Mon
  ok("empty Monday → 07:00–08:30", !!s && s.dateISO === "2026-07-20" && s.startLabel === "07:00" && s.endLabel === "08:30");
}

// 2. Partly-loaded day → slot starts after existing load.
{
  const s = findSlotInSchedule({
    bookings: [{ dateISO: "2026-07-20", durationMin: 120 }], // 2h used → free from 09:00
    durationMin: 60,
    fromDateISO: "2026-07-20",
  });
  ok("120min used → next slot 09:00–10:00", !!s && s.startLabel === "09:00" && s.endLabel === "10:00");
}

// 3. Full day (>8h window) → rolls to the next workday.
{
  const s = findSlotInSchedule({
    bookings: [{ dateISO: "2026-07-20", durationMin: 60 * 8 }], // fills 07:00–15:00
    durationMin: 60,
    fromDateISO: "2026-07-20",
  });
  ok("full Monday → rolls to Tuesday", !!s && s.dateISO === "2026-07-21" && s.startLabel === "07:00");
}

// 4. Weekend is skipped (Sat 2026-07-25 start → Mon 2026-07-27).
{
  const s = findSlotInSchedule({ bookings: [], durationMin: 30, fromDateISO: "2026-07-25" });
  ok("Saturday start → Monday slot", !!s && s.weekday === 0 && s.dateISO === "2026-07-27");
}

// 5. Duration larger than the whole workday never fits.
{
  const s = findSlotInSchedule({ bookings: [], durationMin: 999, fromDateISO: "2026-07-20", daysToScan: 5 });
  ok("oversized job → no slot", s === null);
}

// 6. isOpen filter (e.g. holiday week) skips a day.
{
  const s = findSlotInSchedule({
    bookings: [],
    durationMin: 30,
    fromDateISO: "2026-07-20",
    isOpen: (d) => d !== "2026-07-20", // Monday closed
  });
  ok("holiday Monday closed → Tuesday", !!s && s.dateISO === "2026-07-21");
}

// 7. Workday-start constant sanity.
ok("workday starts 07:00", BOOK_WORK_START_MIN === 7 * 60);

console.log("\nestimateLineDurations:");

// 8. Explicit durations are trusted; no confirmation needed.
{
  const r = estimateLineDurations([{ description: "Vinduespudsning", price: 500, durationMin: 45 }], 8.6);
  ok("explicit duration kept, not estimated", r.totalDurationMin === 45 && r.estimated === false);
}

// 9. Missing duration → derived from price, flagged for confirmation.
{
  // price 500 incl VAT → 400 excl → /8.6 ≈ 47 min
  const r = estimateLineDurations([{ description: "Fugerens", price: 500 }], 8.6);
  ok("missing duration derived from price", r.lines[0].durationMin === Math.round(400 / 8.6) && r.estimated === true);
}

// 10. No price + no duration → 30-min fallback, flagged.
{
  const r = estimateLineDurations([{ description: "Ukendt opgave" }], 8.6);
  ok("no price/duration → 30min fallback + estimated", r.lines[0].durationMin === 30 && r.estimated === true);
}

console.log(`\nAll ${passed} assertions passed ✅`);
