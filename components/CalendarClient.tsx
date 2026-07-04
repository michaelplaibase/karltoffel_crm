"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  LEGEND, GRID_START, GRID_END, WORK_START, WORK_END,
  type CalEvent, type CalendarWeek,
} from "@/lib/calendar";
import { categoryColor } from "@/lib/categories";
import { setOrderLock, moveOrderWeeks, replanWeek, deleteOrder } from "@/app/actions/orders";

const HOUR = 75; // px per hour row
const bodyHeight = (GRID_END - GRID_START) * HOUR;
const hours = Array.from({ length: GRID_END - GRID_START }, (_, i) => GRID_START + i);
const fmt = (h: number) => `${Math.floor(h)}:${String(Math.round((h % 1) * 60)).padStart(2, "0")}`;

/** ISO date `n` days after a Monday-date string (UTC-stable). */
function isoAddDays(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export default function CalendarClient({ week, nav }: { week: CalendarWeek; nav: { prev: string; next: string } }) {
  const { events, days, employees, planned, weekLabel, weekNo, monday } = week;
  const [menu, setMenu] = useState<{ x: number; y: number; ev: CalEvent } | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // View state (all client-side, no reload):
  const [selectedEmp, setSelectedEmp] = useState<Set<number>>(() => new Set(employees.map((e) => e.id)));
  const [showWork, setShowWork] = useState(true);
  const [showDrive, setShowDrive] = useState(true);
  const [daysVisible, setDaysVisible] = useState<1 | 5 | 7>(7);
  const [search, setSearch] = useState<string | null>(null); // null = closed
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<CalEvent | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    // Close only on clicks OUTSIDE the menu — clicks inside (submenu toggles) keep
    // it open. (React's stopPropagation can't block this sibling document listener.)
    const close = (e: MouseEvent) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      setMenu(null); setExpanded(null);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [menu]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(t);
  }, [notice]);

  function openMenu(e: React.MouseEvent, ev: CalEvent) {
    e.stopPropagation();
    setExpanded(null);
    setMenu({ x: Math.min(e.clientX, window.innerWidth - 250), y: e.clientY, ev });
  }

  function run(fn: () => Promise<void>) {
    setMenu(null);
    startTransition(async () => { await fn(); });
  }

  const q = (search ?? "").trim().toLowerCase();
  const matches = (ev: CalEvent) =>
    !q || ev.customer.toLowerCase().includes(q) || ev.postal.toLowerCase().includes(q) || String(ev.id).includes(q);

  const visibleDays = daysVisible === 7 ? [0, 1, 2, 3, 4, 5, 6] : daysVisible === 5 ? [0, 1, 2, 3, 4] : [0];

  function toggleEmp(id: number) {
    setSelectedEmp((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
    <div className="container-1140 cal-wrap">
      <div className="cal">
        {/* ---------- sidebar ---------- */}
        <aside className="cal-side">
          <div className="grp">Planlægning</div>
          <button className="genbtn" disabled={pending} onClick={() => run(() => replanWeek(monday))}>
            {pending ? "Planlægger…" : "Genplanlæg uge"}
          </button>
          <div className="subhint">Planlagt i dag kl. 03:01</div>

          <div className="grp">Medarbejdere</div>
          {employees.map((e) => {
            const on = selectedEmp.has(e.id);
            return (
              <label className="chk" key={e.id} style={{ cursor: "pointer" }} onClick={() => toggleEmp(e.id)}>
                <span className={`box${on ? " on" : ""}`} style={on ? { background: e.color, borderColor: e.color } : undefined} /> {e.name}
              </label>
            );
          })}

          <div className="grp">Planlagt omsætning</div>
          <div className="money-row"><span>{planned.weekLabel}</span><b className="num">kr. {planned.week.toLocaleString("da-DK")}</b></div>
          <div className="money-row"><span>{planned.monthLabel}</span><b className="num">kr. {planned.month.toLocaleString("da-DK")}</b></div>

          <div className="grp">Planlagt kørsel</div>
          <div className="money-row"><span>Man</span><b>{days[0].driving ?? "-"}</b></div>

          <div className="grp">Vis i kalender</div>
          <label className="chk" style={{ cursor: "pointer" }} onClick={() => setShowWork((v) => !v)}>
            <span className={`box${showWork ? " on" : ""}`} /> Vis arbejdstider
          </label>
          <label className="chk" style={{ cursor: "pointer" }} onClick={() => setShowDrive((v) => !v)}>
            <span className={`box${showDrive ? " on" : ""}`} /> Vis kørsel
          </label>

          <div className="legend2">
            <div className="grp">Forklaringer</div>
            {LEGEND.status.map((l) => (
              <div className="legend-row" key={l.label}>
                <span className="legend-sw" style={{ borderColor: l.color, background: l.fill }} /> {l.label}
              </div>
            ))}
            <div className="grp">Ordretype</div>
            <div className="legend-row muted">{LEGEND.type.join(" · ")}</div>
          </div>
        </aside>

        {/* ---------- main ---------- */}
        <div className="cal-main">
          <div className="cal-toolbar">
            <Link href={`/calendar?week=${nav.prev}`} className="calbtn">‹</Link>
            <Link href="/calendar" className="calbtn">Idag</Link>
            <Link href={`/calendar?week=${nav.next}`} className="calbtn">›</Link>
            <span className="title">{weekLabel}</span>
            <span className="badge badge-soft-muted">UGE {weekNo}</span>
            {search !== null && (
              <input autoFocus className="form-control form-control-sm" style={{ maxWidth: 220 }}
                placeholder="Søg kunde, postnr, ordrenr…" value={search} onChange={(e) => setSearch(e.target.value)} />
            )}
            <span className="spacer" />
            <div className="calseg">
              <button className={`calbtn${daysVisible === 1 ? " on" : ""}`} onClick={() => setDaysVisible(1)}>Dag</button>
              <button className={`calbtn${daysVisible === 5 ? " on" : ""}`} onClick={() => setDaysVisible(5)}>5 dg</button>
              <button className={`calbtn${daysVisible === 7 ? " on" : ""}`} onClick={() => setDaysVisible(7)}>7 dg</button>
            </div>
            <button className={`calbtn${search !== null ? " on" : ""}`} title="Søg i kalenderen"
              onClick={() => setSearch((s) => (s === null ? "" : null))}><i className="bi bi-search" /></button>
          </div>

          <div className="cal-grid" style={{ gridTemplateColumns: `37px repeat(${visibleDays.length}, 1fr)` }}>
            <div className="cal-corner" />
            {visibleDays.map((di) => {
              const d = days[di];
              return (
                <div className="cal-dayhead" key={d.label}>
                  <b><Link href={`/daycalendar?date=${isoAddDays(monday, di)}`} style={{ color: "inherit" }}>{d.label} {d.date}</Link></b>
                  <span className="kr">Kr. {d.revenue.toLocaleString("da-DK")}</span>
                  {showDrive && d.driving ? <span className="kr"><i className="bi bi-truck" /> {d.driving}</span> : null}
                </div>
              );
            })}

            <div className="cal-axis" style={{ height: bodyHeight }}>
              {hours.map((h) => (
                <div className="cal-hour" key={h} style={{ height: HOUR }}>{h}:00</div>
              ))}
            </div>

            {visibleDays.map((dayIdx) => (
              <div className="cal-daycol" key={dayIdx} style={{ height: bodyHeight }}>
                {showWork && <>
                  <div className="cal-nonbiz" style={{ top: 0, height: (WORK_START - GRID_START) * HOUR }} />
                  <div className="cal-nonbiz" style={{ top: (WORK_END - GRID_START) * HOUR, height: (GRID_END - WORK_END) * HOUR }} />
                </>}
                {events.filter((e) => e.day === dayIdx && selectedEmp.has(e.employeeId)).map((ev) => (
                  <div
                    key={ev.id}
                    className={`cal-ev st-${ev.status}`}
                    style={{ top: (ev.start - GRID_START) * HOUR, height: (ev.end - ev.start) * HOUR, opacity: matches(ev) ? 1 : 0.15 }}
                    onClick={(e) => openMenu(e, ev)}
                  >
                    <span className="t">{fmt(ev.start)} – {fmt(ev.end)}</span>
                    <b>{ev.postal}</b>
                    <span>
                      <span className="catchip" style={{ background: categoryColor(ev.category), width: 15, height: 15, fontSize: 9 }}>A</span>{" "}
                      {ev.customer}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {menu && (
        <div className="ctxmenu" ref={menuRef} style={{ left: menu.x, top: menu.y }}>
          <Link href={`/orders/${menu.ev.id}`} className="ctxmenu-item">Rediger ordre …</Link>
          <div className="ctxmenu-item" onClick={() => run(() => setOrderLock(menu.ev.id, false))}>Lås helt op</div>
          <div className="ctxmenu-item" onClick={() => run(() => setOrderLock(menu.ev.id, true))}>Lås op, fastgør til ugedag</div>
          <div className="ctxmenu-sep" />
          <div className="ctxmenu-item" onClick={() => setExpanded(expanded === "flyt" ? null : "flyt")}>
            Flyt til anden uge … <i className="bi bi-caret-right-fill" />
          </div>
          {expanded === "flyt" && ([
            ["1 uge frem", 1, false], ["1 uge frem, lås helt op", 1, true],
            ["2 uger frem", 2, false], ["1 uge tilbage", -1, false], ["2 uger tilbage", -2, false],
          ] as [string, number, boolean][]).map(([label, w, unlock]) => (
            <div className="ctxmenu-item" key={label} style={{ paddingLeft: 34 }}
              onClick={() => run(() => moveOrderWeeks(menu.ev.id, w, unlock))}>{label}</div>
          ))}
          <div className="ctxmenu-item" onClick={() => setExpanded(expanded === "mere" ? null : "mere")}>
            Mere … <i className="bi bi-caret-right-fill" />
          </div>
          {expanded === "mere" && (
            <>
              <Link href={`/customers/${menu.ev.contactId}`} className="ctxmenu-item" style={{ paddingLeft: 34 }}>Gå til kundedetaljer …</Link>
              {menu.ev.subscriptionNo != null && (
                <Link href={`/subscriptions/${menu.ev.subscriptionNo}`} className="ctxmenu-item" style={{ paddingLeft: 34 }}>Rediger abonnement …</Link>
              )}
              <div className="ctxmenu-item" style={{ paddingLeft: 34 }}
                onClick={() => { setNotice(`Notifikation sendt til kunden for ordre #${menu.ev.id} (simuleret).`); setMenu(null); }}>Send notifikation nu</div>
              <Link href={`/orders/${menu.ev.id}/complete`} className="ctxmenu-item" style={{ paddingLeft: 34 }}>Afslut ordre …</Link>
              <div className="ctxmenu-item" style={{ paddingLeft: 34, color: "var(--danger, #C4183C)" }}
                onClick={() => { setConfirmDel(menu.ev); setMenu(null); }}>Slet ordre …</div>
            </>
          )}
        </div>
      )}

      {confirmDel && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000 }}
          onClick={() => !pending && setConfirmDel(null)}>
          <div style={{ background: "#fff", borderRadius: 6, padding: "20px 22px", width: 440, maxWidth: "92vw", boxShadow: "0 10px 40px rgba(0,0,0,.25)" }} onClick={(e) => e.stopPropagation()}>
            <h4 style={{ margin: "0 0 12px" }}>Slet ordre</h4>
            <p style={{ margin: 0 }}>Er du sikker på, at du vil slette ordre #{confirmDel.id}?</p>
            <p style={{ color: "#c0392b", fontSize: 13, margin: "8px 0 0" }}>Denne handling kan ikke fortrydes.</p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
              <button type="button" className="btn btn-light" disabled={pending} onClick={() => setConfirmDel(null)}>Luk</button>
              <button type="button" className="btn btn-danger" disabled={pending}
                onClick={() => { const id = confirmDel.id; startTransition(async () => { await deleteOrder(id, null); }); setConfirmDel(null); }}>
                {pending ? "Vent…" : "Slet ordre"}
              </button>
            </div>
          </div>
        </div>
      )}

      {notice && (
        <div onClick={() => setNotice(null)}
          style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "#212529", color: "#fff", padding: "10px 18px", borderRadius: 6, fontSize: 14, zIndex: 4000, boxShadow: "0 6px 24px rgba(0,0,0,.3)", cursor: "pointer" }}>
          {notice}
        </div>
      )}
    </div>
  );
}
