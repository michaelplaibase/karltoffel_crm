"use client";

// Reusable task-line editor (the "Opgaver" formset). Rows submit via repeated
// field names (taskDescription/taskCategory/taskPrice/taskDuration) that the
// server action reads with formData.getAll, aligned by index. Used by order
// create now; subscription / fixed-price editors reuse it later.
import { useState } from "react";
import { CATEGORIES, categoryColor } from "@/lib/categories";

export type TaskRow = { description: string; price: string; duration: string; category: string };

const CAT_NAMES = Object.keys(CATEGORIES);
const blank = (): TaskRow => ({ description: "", price: "", duration: "", category: "Vinduespudsning" });
const timepris = (r: TaskRow) => {
  const p = Number(r.price) || 0, d = Number(r.duration) || 0;
  return d > 0 ? Math.round((p / d) * 60) : 0;
};

export default function TaskLineEditor({ initial }: { initial?: TaskRow[] }) {
  const [rows, setRows] = useState<TaskRow[]>(initial?.length ? initial : [blank()]);
  const update = (i: number, patch: Partial<TaskRow>) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const add = () => setRows((rs) => [...rs, blank()]);
  const remove = (i: number) => setRows((rs) => (rs.length > 1 ? rs.filter((_, j) => j !== i) : rs));

  const sum = rows.reduce((a, r) => a + (Number(r.price) || 0), 0);
  const dur = rows.reduce((a, r) => a + (Number(r.duration) || 0), 0);

  return (
    <div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Opgavebeskrivelse</th>
              <th style={{ width: 190 }}>Kategori</th>
              <th style={{ width: 150 }}>Pris (inkl. moms)</th>
              <th style={{ width: 130 }}>Varighed (min.)</th>
              <th style={{ width: 40 }} />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td>
                  <input
                    name="taskDescription" value={r.description}
                    onChange={(e) => update(i, { description: e.target.value })}
                    className="form-control form-control-sm" placeholder="Fremsøg eller opret ny opgave"
                  />
                  {timepris(r) > 0 && <small className="form-text field-help">Timepris {timepris(r)} kr/t</small>}
                </td>
                <td>
                  <span className="catchip" style={{ background: categoryColor(r.category), marginRight: 6 }}>
                    {(r.category[0] ?? "A").toUpperCase()}
                  </span>
                  <select
                    name="taskCategory" value={r.category}
                    onChange={(e) => update(i, { category: e.target.value })}
                    className="form-control form-control-sm" style={{ display: "inline-block", width: "auto" }}
                  >
                    {CAT_NAMES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </td>
                <td>
                  <input name="taskPrice" type="number" min="0" value={r.price}
                    onChange={(e) => update(i, { price: e.target.value })} className="form-control form-control-sm num" />
                </td>
                <td>
                  <input name="taskDuration" type="number" min="0" value={r.duration}
                    onChange={(e) => update(i, { duration: e.target.value })} className="form-control form-control-sm num" />
                </td>
                <td>
                  <button type="button" onClick={() => remove(i)} className="btn btn-light btn-sm" title="Fjern opgave">
                    <i className="bi bi-trash" />
                  </button>
                </td>
              </tr>
            ))}
            <tr>
              <td style={{ textAlign: "right", fontWeight: 600 }}>Sum</td>
              <td />
              <td className="num" style={{ fontWeight: 600 }}>{sum.toLocaleString("da-DK")} kr</td>
              <td className="num" style={{ fontWeight: 600 }}>{dur}</td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>
      <button type="button" onClick={add} className="btn btn-outline-primary btn-sm" style={{ marginTop: 8 }}>
        Tilføj opgave
      </button>
    </div>
  );
}
