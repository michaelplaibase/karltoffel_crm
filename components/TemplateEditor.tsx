import type { Template } from "@/lib/templates-config";

export default function TemplateEditor({ t }: { t: Template }) {
  if (!t.editable) {
    return (
      <div className="container-1140" style={{ maxWidth: 820 }}>
        <h1 className="page-title">E-mail og SMS</h1>
        <div className="card">
          <div className="card-body">
            <h4 className="section-title">{t.heading}</h4>
            <p className="muted" style={{ marginBottom: 16 }}>{t.intro}</p>
            {t.stubText ? <div className="help-note">{t.stubText}</div> : null}
            {t.delegatesTo ? <div className="help-note">Selve skabelonen/teksten redigeres i {t.delegatesTo}.</div> : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-1140">
      <h1 className="page-title">E-mail og SMS</h1>
      <div className="grid-2">
        <div className="card">
          <div className="card-body">
            <h4 className="section-title">{t.heading}</h4>
            <p className="muted" style={{ marginBottom: 16 }}>{t.intro}</p>

            {t.subjects.map((s, i) => (
              <div className="form-group" key={i}>
                <label>{s.label}</label>
                <input className="form-control" defaultValue={s.val} />
                <small className="form-text">Emnet på e-mailen. Maks {t.maxSubject ?? 50} karakterer.</small>
              </div>
            ))}

            <div className="form-group">
              <label>Besked</label>
              <textarea className="form-control" rows={13} defaultValue={t.body} />
              <small className="form-text">Beskeden, som sendes til kunden.</small>
            </div>

            <div className="form-group">
              <label>Afsender på SMS</label>
              <input className="form-control" defaultValue={t.smsSender ?? "Service SMS"} readOnly />
              <small className="form-text">Kontakt Fenster Support for at få feltet ændret (kræver Premium).</small>
            </div>

            <div className="form-group">
              <label>Send en test</label>
              <div className="searchbar" style={{ marginBottom: 8, maxWidth: "none" }}>
                <input className="form-control" placeholder="Test e-mail" />
                <button className="btn btn-outline-primary">Send test e-mail</button>
              </div>
              <div className="searchbar" style={{ maxWidth: "none" }}>
                <input className="form-control" placeholder="Test SMS" />
                <button className="btn btn-light" disabled title="Brugen af SMS er ikke godkendt endnu.">Send test SMS</button>
              </div>
            </div>

            <div className="savebar">
              <button className="btn btn-primary">Gem alle ændringer</button>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h4 className="section-title">Liste over variable felter</h4></div>
          <div className="card-body">
            <div style={{ display: "grid", gap: 8 }}>
              {t.variables.map((v, i) => (
                <div key={i} style={{ border: "1px solid var(--card-border)", borderRadius: 6, padding: "8px 10px" }}>
                  <code style={{ fontFamily: "ui-monospace, monospace", fontSize: 12.5, color: "var(--primary)" }}>{v.token}</code>
                  <span style={{ display: "block", color: "var(--muted)", fontSize: 12, marginTop: 3 }}>{v.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
