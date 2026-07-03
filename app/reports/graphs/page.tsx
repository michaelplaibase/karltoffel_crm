import { KPI_CUSTOMERS, KPI_REVENUE, KPI_SUBS, CHARTS, SERIES_COLORS, MAP_LEGEND, type Kpi, type ChartDef } from "@/lib/reports";

export const metadata = { title: "Grafer og nøgletal · Karltoffel" };

function KpiCards({ items }: { items: Kpi[] }) {
  return (
    <div className="kpigrid">
      {items.map((c, i) => (
        <div className="kpi" key={i}>
          <div className="k">{c.k}</div>
          <div className="t">{c.t}</div>
          {c.s ? <div className="s">{c.s}</div> : null}
        </div>
      ))}
    </div>
  );
}

function PeriodToggle() {
  return (
    <span className="seg">
      <span className="on">Sidste 12 mdr</span>
      <span>År til dato</span>
    </span>
  );
}

function Chart({ c }: { c: ChartDef }) {
  const bars = Array.from({ length: 13 }, (_, i) => 28 + ((c.seed * 7 + i * i * 13) % 66));
  return (
    <div className="chartcard">
      <h3>{c.title}</h3>
      <div className="chart-toggles">
        <span className="seg"><span className="on">Måned</span><span>Uge</span></span>
        <span className="seg"><span className="on">Søjle</span><span>Linje</span></span>
      </div>
      <div className="bars">{bars.map((h, i) => <div className="bar" key={i} style={{ height: `${h}%` }} />)}</div>
      <div className="axis-label">{c.yLabel} · pr. Måned</div>
      <div className="series-legend">
        {c.series.map((s, i) => <span key={i}><span className="dot2" style={{ background: SERIES_COLORS[i % SERIES_COLORS.length] }} />{s}</span>)}
      </div>
    </div>
  );
}

export default function GraphReportsPage() {
  return (
    <div className="container-1140">
      <h1 className="page-title">Grafer og nøgletal</h1>

      <div className="report-head"><h4 className="section-title">Antal kunder</h4><PeriodToggle /></div>
      <KpiCards items={KPI_CUSTOMERS} />

      <div className="report-head"><h4 className="section-title">Omsætning</h4><PeriodToggle /></div>
      <KpiCards items={KPI_REVENUE} />

      <div className="report-head"><h4 className="section-title">Abonnementskunder</h4></div>
      <KpiCards items={KPI_SUBS} />

      {CHARTS.map((c, i) => <Chart c={c} key={i} />)}

      <div className="chartcard">
        <h3>{MAP_LEGEND.title}</h3>
        <div className="map-legend">
          <span>Boligtype: {MAP_LEGEND.property.join(" · ")}</span>
          <span>Omsætning: {MAP_LEGEND.revenue.join(" · ")}</span>
        </div>
        <div className="map-box">🗺️ Interaktivt kundekort</div>
      </div>
    </div>
  );
}
