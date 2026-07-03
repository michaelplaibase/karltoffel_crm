import Link from "next/link";
import { getDayProgram } from "@/lib/queries";
import { WEEK_MONDAY } from "@/lib/calendar";
import { money } from "@/components/ui";

export const metadata = { title: "Dagsprogram · Karltoffel" };

export default async function DayCalendarPage() {
  const day = await getDayProgram(WEEK_MONDAY);

  return (
    <div className="container-1140">
      <div className="daycal-toolbar">
        <button className="calbtn">‹</button>
        <h1 className="title">{day.heading}</h1>
        <span className="badge badge-soft-muted">{day.relative}</span>
        <button className="calbtn">›</button>
        <span style={{ flex: 1 }} />
        <Link href="/calendar" className="btn btn-light btn-sm">Gå til ugen i kalender</Link>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="daycal-summary">
            <span>Planlagt omsætning (dag/uge/måned): <b>Kr. {day.revenueDay.toLocaleString("da-DK")} / {day.revenueWeek.toLocaleString("da-DK")} / {day.revenueMonth.toLocaleString("da-DK")}</b></span>
            <span>Planlagt kørsel: <b>{day.driving}</b></span>
          </div>

          {day.stops.map((s, i) => (
            <div className="daycal-stop" key={i}>
              <div>
                <div className="when">{s.from} - {s.to}</div>
                <a className="maplink" href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(s.address)}`} target="_blank" rel="noopener noreferrer">
                  <i className="bi bi-geo-alt-fill" /> {s.address}
                </a>
                <div style={{ fontWeight: 600, marginTop: 2 }}>{s.customer} · <span className="num">{money(s.price)}</span></div>
                <div className="daycal-icons">
                  <span><i className="bi bi-list-task" /> opgaver</span>
                  <span><i className="bi bi-image" /> fotos</span>
                  <span><i className="bi bi-info-circle" /> bemærkninger</span>
                  <span><i className="bi bi-card-checklist" /> ordrehistorik</span>
                  <span><i className="bi bi-bell" /> notifikation</span>
                </div>
              </div>
              <div className="row-actions">
                <button className="btn btn-outline-primary btn-sm">Afslut ordre</button>
                <button className="btn btn-outline-primary btn-sm">Rediger ordre</button>
                <button className="btn btn-outline-primary btn-sm">Rediger abo.</button>
                <button className="btn btn-outline-primary btn-sm">Mere ▾</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
