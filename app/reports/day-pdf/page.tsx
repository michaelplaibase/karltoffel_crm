export const metadata = { title: "Dagsprogram i PDF · Karltoffel" };

export default function DayPdfPage() {
  return (
    <div className="container-1140" style={{ maxWidth: 760 }}>
      <h1 className="page-title">Dagsprogram</h1>
      <div className="card">
        <div className="card-body">
          <h4 className="section-title">Hent dagsprogram i PDF</h4>
          <p className="muted" style={{ marginBottom: 18 }}>Download dagsprogram i PDF-format for den valgte medarbejder og dato.</p>
          <div className="f2">
            <label className="col-label">Medarbejder</label>
            <select className="form-control form-control-sm" defaultValue="Kristian Klercke">
              <option>Kristian Klercke</option>
            </select>
          </div>
          <div className="f2">
            <label className="col-label">Dato</label>
            <input className="form-control" type="date" />
          </div>
          <hr className="section-hr" />
          <button className="btn btn-primary">Hent dagsprogram</button>
        </div>
      </div>
    </div>
  );
}
