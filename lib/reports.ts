// Reporting data (Phase 5, UI-first). KPI values mirror the sample account.

export type Kpi = { k: string; t: string; s?: string };
export type ChartDef = { title: string; yLabel: string; series: string[]; seed: number };

export const KPI_CUSTOMERS: Kpi[] = [
  { k: "4", t: "Antal unikke kunder totalt", s: "Unikke kunder med omsætning i perioden" },
  { k: "5", t: "Abonnementskunder", s: "Abonnementskunder med omsætning i perioden, inkl. stoppede abonnementer" },
  { k: "2", t: "Online kunder", s: "Kunder, der har bestilt online og har omsætning i perioden" },
  { k: "1", t: "Manuelt oprettede kunder", s: "Kunder med manuelle ordrer og omsætning i perioden" },
];

export const KPI_REVENUE: Kpi[] = [
  { k: "DKK 163.480", t: "Omsætning totalt", s: "Omsætning fra alle kundetyper i perioden" },
  { k: "DKK 141.900", t: "Omsætning fra abonnementskunder", s: "Inkl. stoppede abonnementer" },
  { k: "DKK 12.100", t: "Omsætning fra online kunder", s: "Fra online ordrer i perioden" },
  { k: "DKK 9.480", t: "Omsætning fra manuelt oprettede kunder", s: "Fra manuelle ordrer i perioden" },
];

export const KPI_SUBS: Kpi[] = [
  { k: "DKK 13.623", t: "Gns. månedlig omsætning", s: "Gns. månedlig omsætning fra abonnementskunder" },
  { k: "DKK 13.623", t: "Vækst i gns. månedlig omsætning", s: "I indeværende kalenderår" },
  { k: "5", t: "Aktive abonnementskunder", s: "Samlet antal abonnementskunder oprettet" },
  { k: "5", t: "Vækst i aktive abonnementskunder", s: "I indeværende kalenderår" },
];

export const CHARTS: ChartDef[] = [
  { title: "Omsætning per kundetype", yLabel: "DKK (inkl. moms)", seed: 3, series: [
    "Manuelle kunder (planlagt)", "Online kunder (planlagt)", "Abonnementskunder (planlagt)",
    "Manuelle kunder (leveret)", "Online kunder (leveret)", "Abonnementskunder (leveret)",
  ] },
  { title: "Antal leverede ordrer", yLabel: "Antal ordrer", seed: 5, series: ["Manuelle kunder", "Online kunder", "Abonnementskunder"] },
  { title: "Gns. timepris og ordrestørrelse for leverede ordrer", yLabel: "DKK (inkl. moms)", seed: 7, series: ["Gns. timepris", "Gns. ordrestørrelse"] },
];

export const SERIES_COLORS = ["#257BB6", "#1CBD6B", "#FFB400", "#00B8D8", "#C4183C", "#9A6324"];

export const MAP_LEGEND = {
  title: "Kort over kunder med omsætning de sidste 12 mdr.",
  property: ["Lejlighed", "Hus", "Rækkehus", "Ukendt"],
  revenue: ["$ 0-500 DKK", "$$ 500-1000 DKK", "$$$ 1000+ DKK"],
};
