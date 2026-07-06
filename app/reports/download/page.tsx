export const metadata = { title: "Rapporter · Karltoffel" };

/** Indeværende måneds første/sidste dag (UTC) som YYYY-MM-DD — rapportens default-periode. */
function monthRange(): { start: string; end: string } {
  const now = new Date();
  const y = now.getUTCFullYear(), m = now.getUTCMonth();
  const pad = (n: number) => String(n).padStart(2, "0");
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return { start: `${y}-${pad(m + 1)}-01`, end: `${y}-${pad(m + 1)}-${pad(last)}` };
}

export default function ReportDownloadPage() {
  const { start, end } = monthRange();
  return (
    <div className="container-1140" style={{ maxWidth: 760 }}>
      <h1 className="page-title">Rapporter</h1>

      <div className="card">
        <div className="card-body">
          <h4 className="section-title">Hent ordrerapport</h4>
          <p className="muted" style={{ marginBottom: 18 }}>Download ordrerapport i Excel-format for den valgte periode.</p>
          <form action="/api/reports/orders" method="get">
            <div className="f2">
              <label className="col-label">Startdato</label>
              <input className="form-control" type="date" name="start" defaultValue={start} />
            </div>
            <div className="f2">
              <label className="col-label">Slutdato</label>
              <input className="form-control" type="date" name="end" defaultValue={end} />
            </div>
            <hr className="section-hr" />
            <button className="btn btn-primary" type="submit">Hent rapport</button>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <h4 className="section-title">Hent abonnementer</h4>
          <p className="muted" style={{ marginBottom: 18 }}>Download en rapport over alle dine aktive abonnementer i CSV-format.</p>
          <form action="/api/reports/subscriptions" method="get">
            <button className="btn btn-primary" type="submit">Hent rapport</button>
          </form>
        </div>
      </div>
    </div>
  );
}
