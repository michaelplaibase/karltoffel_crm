"use client";

import { useActionState, useState } from "react";
import type { Template } from "@/lib/templates-config";
import type { SaveState } from "@/app/actions/settings";

type TemplateValues = { subjects?: string[]; body?: string; smsSender?: string };

export default function TemplateEditor({
  t, action, values,
}: {
  t: Template;
  action: (state: SaveState, formData: FormData) => Promise<SaveState>;
  values: TemplateValues;
}) {
  const [showVars, setShowVars] = useState(false);
  const [state, formAction, pending] = useActionState(action, {});

  if (!t.editable) {
    return (
      <div className="container-1140" style={{ maxWidth: 900 }}>
        <div className="card">
          <div className="card-body">
            <h1 className="page-title">E-mail og SMS</h1>
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
    <div className="container-1140" style={{ maxWidth: 900 }}>
      <div className="card">
        <div className="card-body">
          <h1 className="page-title">E-mail og SMS</h1>
          <h4 className="section-title">{t.heading}</h4>
          <p className="muted" style={{ marginBottom: 22 }}>{t.intro}</p>

          <form action={formAction}>
            {t.subjects.map((s, i) => (
              <div className="f2" key={i}>
                <label className="col-label">{s.label}</label>
                <div>
                  <input name="subject" className="form-control" defaultValue={values.subjects?.[i] ?? s.val} />
                  <small className="form-text">Emnet på e-mailen. Maks {t.maxSubject ?? 50} karakterer.</small>
                </div>
              </div>
            ))}

            <div className="f2">
              <label className="col-label">
                Besked{" "}
                <a onClick={() => setShowVars(true)} style={{ cursor: "pointer" }}>(Se liste over variable felter, du kan anvende)</a>
              </label>
              <div>
                <textarea name="body" className="form-control" rows={13} defaultValue={values.body ?? t.body} />
                <small className="form-text">Beskeden, som sendes til kunden.</small>
              </div>
            </div>

            <div className="f2">
              <label className="col-label">Afsender på SMS</label>
              <div>
                <input name="smsSender" className="form-control" defaultValue={values.smsSender ?? t.smsSender ?? "Service SMS"} />
                <small className="form-text">Kan være tekst eller dit mobilnummer. Maks 11 karakterer.</small>
              </div>
            </div>

            <div className="f2">
              <label className="col-label">Send en test</label>
              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
                  <input className="form-control" placeholder="Test e-mail" />
                  <button type="button" className="btn btn-light">Send test e-mail</button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
                  <input className="form-control" placeholder="Test SMS" />
                  <button type="button" className="btn btn-light">Send test SMS</button>
                </div>
              </div>
            </div>

            <hr className="section-hr" />
            <div className="row-actions" style={{ alignItems: "center", gap: 12 }}>
              <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? "Gemmer…" : "Gem alle ændringer"}</button>
              {state.saved ? <span style={{ color: "var(--success)", fontSize: 13 }}>✓ Gemt</span> : null}
            </div>
          </form>
        </div>
      </div>

      {showVars ? (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "grid", placeItems: "center", zIndex: 2000, padding: 20 }} onClick={() => setShowVars(false)}>
          <div className="card" style={{ maxWidth: 560, width: "100%", maxHeight: "80vh", overflow: "auto" }} onClick={(e) => e.stopPropagation()}>
            <div className="card-header"><h4 className="section-title" style={{ margin: 0 }}>Liste over variable felter</h4></div>
            <div className="card-body">
              <div style={{ display: "grid", gap: 8 }}>
                {t.variables.map((v, i) => (
                  <div key={i} style={{ border: "1px solid var(--card-border)", borderRadius: 6, padding: "8px 10px" }}>
                    <code style={{ fontFamily: "ui-monospace, monospace", fontSize: 12.5, color: "var(--primary)" }}>{v.token}</code>
                    <span style={{ display: "block", color: "var(--muted)", fontSize: 12, marginTop: 3 }}>{v.desc}</span>
                  </div>
                ))}
              </div>
              <div className="savebar"><button type="button" className="btn btn-light" onClick={() => setShowVars(false)}>Tilbage</button></div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
