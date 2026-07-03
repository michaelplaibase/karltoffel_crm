import type { SPage, SField } from "@/lib/settings-config";

function Field({ f }: { f: SField }) {
  const help = f.help ? <small className="form-text">{f.help}</small> : null;
  const label = f.l ? (
    <label>
      {f.l}
      {f.gate ? <span className="badge badge-soft-warning" style={{ marginLeft: 8, fontSize: 10, padding: "2px 7px" }}>Kræver {f.gate}</span> : null}
    </label>
  ) : null;

  switch (f.t) {
    case "note":
      return <div className="help-note" style={{ marginBottom: 16 }}>{f.val}</div>;

    case "buttons":
      return (
        <div className="form-group">
          {label}
          <div className="row-actions">
            {(f.btns ?? []).map(([txt, variant], i) => (
              <button key={i} className={`btn btn-${variant} btn-sm`} type="button">{txt}</button>
            ))}
          </div>
          {help}
        </div>
      );

    case "subtable":
      return (
        <div className="form-group">
          {label}
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr>{(f.cols ?? []).map((c, i) => <th key={i}>{c}</th>)}</tr></thead>
              <tbody>
                {(f.rows && f.rows.length) ? f.rows.map((r, ri) => (
                  <tr key={ri}>{r.map((c, ci) => <td key={ci}>{c}</td>)}</tr>
                )) : (
                  <tr><td colSpan={(f.cols ?? []).length || 1}><div className="table-empty">{f.empty ?? "Ingen data"}</div></td></tr>
                )}
              </tbody>
            </table>
          </div>
          {help}
        </div>
      );

    case "toggle":
      return (
        <div className="form-group">
          {label}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className={`toggle${f.on ? "" : " off"}`} />
            <span style={{ color: "var(--muted)", fontSize: 13 }}>{f.on ? "Ja" : "Nej"}</span>
          </div>
          {help}
        </div>
      );

    case "checks":
      return (
        <div className="form-group">
          {label}
          <div className="checks">
            {(f.opts ?? []).map((o, i) => {
              const on = Array.isArray(f.on) ? f.on.includes(i) : false;
              return <label className="chk" key={i}><span className={`box${on ? " on" : ""}`} /> {o}</label>;
            })}
          </div>
          {help}
        </div>
      );

    case "radio":
      return (
        <div className="form-group">
          {label}
          <div className="radio">
            {(f.opts ?? []).map((o, i) => (
              <div className={`rad${f.on === i ? " on" : ""}`} key={i}><span className="dot" /> {o}</div>
            ))}
          </div>
          {help}
        </div>
      );

    case "select":
      return (
        <div className="form-group">
          {label}
          <select className="form-control" defaultValue={f.val ?? ""}>
            {(f.opts ?? []).map((o, i) => <option key={i}>{o}</option>)}
          </select>
          {help}
        </div>
      );

    case "textarea":
      return (
        <div className="form-group">
          {label}
          <textarea className="form-control" defaultValue={f.val ?? ""} rows={4} />
          {help}
        </div>
      );

    case "color":
      return (
        <div className="form-group">
          {label}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="swatch" style={{ width: 34, height: 28, background: f.val }} />
            <input className="form-control" style={{ maxWidth: 160 }} defaultValue={f.val ?? ""} readOnly />
          </div>
          {help}
        </div>
      );

    case "static":
      return (
        <div className="form-group">
          {label}
          <div className="form-static">{f.val}</div>
          {help}
        </div>
      );

    default: // text, number, date
      return (
        <div className="form-group">
          {label}
          <input className="form-control" type={f.t === "number" ? "number" : f.t === "date" ? "date" : "text"} defaultValue={f.val ?? ""} readOnly={f.ro} />
          {help}
        </div>
      );
  }
}

export default function SettingsForm({ page }: { page: SPage }) {
  return (
    <div className="container-1140" style={{ maxWidth: 860 }}>
      <h1 className="page-title">{page.title}</h1>
      {page.purpose ? <p className="page-desc">{page.purpose}</p> : null}
      <div className="card">
        <div className="card-body">
          {page.sections.map((s, si) => (
            <section key={si} style={{ marginTop: si === 0 ? 0 : 26 }}>
              {s.h ? <h4 className="section-title">{s.h}</h4> : null}
              {s.fields.map((f, fi) => <Field key={fi} f={f} />)}
            </section>
          ))}
          {!page.noSave ? (
            <div className="savebar">
              <button className="btn btn-primary" type="button">{page.saveLabel ?? "Gem alle ændringer"}</button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
