"use client";

// A KPI section with a working period toggle (Sidste 12 mdr / År til dato) that
// swaps between the two precomputed KPI datasets from lib/reports-data.
import { useState } from "react";
import type { Kpi } from "@/lib/reports-data";

export default function KpiSection({ title, twelve, ytd }: { title: string; twelve: Kpi[]; ytd: Kpi[] }) {
  const [period, setPeriod] = useState<"12" | "ytd">("12");
  const items = period === "12" ? twelve : ytd;
  return (
    <>
      <div className="report-head">
        <h4 className="section-title">{title}</h4>
        <span className="seg">
          <span className={period === "12" ? "on" : ""} onClick={() => setPeriod("12")}>Sidste 12 mdr</span>
          <span className={period === "ytd" ? "on" : ""} onClick={() => setPeriod("ytd")}>År til dato</span>
        </span>
      </div>
      <div className="kpigrid">
        {items.map((c, i) => (
          <div className="kpi" key={i}>
            <div className="k">{c.k}</div>
            <div className="t">{c.t}</div>
            {c.s ? <div className="s">{c.s}</div> : null}
          </div>
        ))}
      </div>
    </>
  );
}
