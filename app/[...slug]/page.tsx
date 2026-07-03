import Link from "next/link";
import { TOP_NAV } from "@/lib/nav";

function labelFor(path: string): { label: string; en: string } | null {
  for (const menu of TOP_NAV) {
    for (const it of menu.items) if (it.href === path) return { label: it.label, en: it.en };
  }
  return null;
}

export default async function ComingSoon({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const path = "/" + (slug ?? []).join("/");
  const meta = labelFor(path);

  return (
    <div className="container-1140">
      <h1 className="page-title">{meta?.label ?? "Under udvikling"}</h1>
      <p className="page-desc">
        {meta ? `${meta.en} · ${path}` : path}
      </p>
      <div className="card">
        <div className="card-body">
          <div className="help-note">
            Denne side er en del af en senere fase i opbygningen. Fase 1 dækker <b>Kartotek</b> (Kunder,
            Abonnementer, Ordrer). Se det fulde, navigerbare blueprint over alle undersider i{" "}
            <code>docs/fenster-blueprint/blueprint.html</code>.
          </div>
          <div className="row-actions" style={{ marginTop: 18 }}>
            <Link href="/customers" className="btn btn-primary">Gå til Kunder</Link>
            <Link href="/subscriptions" className="btn btn-outline-secondary">Abonnementer</Link>
            <Link href="/orders" className="btn btn-outline-secondary">Ordrer</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
