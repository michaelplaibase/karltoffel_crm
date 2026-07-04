import { getReportData, MAP_LEGEND, type Kpi } from "@/lib/reports-data";
import BarChart from "@/components/BarChart";
import KpiSection from "@/components/KpiSection";

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

export default async function GraphReportsPage() {
  const { kpiCustomers, kpiCustomersYtd, kpiRevenue, kpiRevenueYtd, kpiSubs, charts } = await getReportData();

  return (
    <div className="container-1140">
      <h1 className="page-title">Grafer og nøgletal</h1>

      <KpiSection title="Antal kunder" twelve={kpiCustomers} ytd={kpiCustomersYtd} />
      <KpiSection title="Omsætning" twelve={kpiRevenue} ytd={kpiRevenueYtd} />

      <div className="report-head"><h4 className="section-title">Abonnementskunder</h4></div>
      <KpiCards items={kpiSubs} />

      {charts.map((c, i) => <BarChart chart={c} key={i} />)}

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
