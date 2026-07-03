export const metadata = { title: "Rapporter · Karltoffel" };

export default function ReportDownloadPage() {
  return (
    <div className="container-1140" style={{ maxWidth: 760 }}>
      <h1 className="page-title">Rapporter</h1>

      <div className="card">
        <div className="card-body">
          <h4 className="section-title">Hent ordrerapport</h4>
          <p className="muted" style={{ marginBottom: 18 }}>Download ordrerapport i Excel-format for den valgte periode.</p>
          <div className="f2">
            <label className="col-label">Startdato</label>
            <input className="form-control" type="date" defaultValue="2026-06-01" />
          </div>
          <div className="f2">
            <label className="col-label">Slutdato</label>
            <input className="form-control" type="date" defaultValue="2026-06-30" />
          </div>
          <hr className="section-hr" />
          <button className="btn btn-primary">Hent rapport</button>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <h4 className="section-title">Hent abonnementer</h4>
          <p className="muted" style={{ marginBottom: 18 }}>Download en rapport over alle dine aktive abonnementer i CSV-format.</p>
          <button className="btn btn-primary">Hent rapport</button>
        </div>
      </div>
    </div>
  );
}
