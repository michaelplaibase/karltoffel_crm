import Link from "next/link";
import { TOP_NAV } from "@/lib/nav";
import { SETTINGS_PAGES } from "@/lib/settings-config";
import SettingsForm from "@/components/SettingsForm";

function labelFor(path: string): { label: string; en: string } | null {
  for (const menu of TOP_NAV) {
    for (const it of menu.items) if (it.href === path) return { label: it.label, en: it.en };
  }
  return null;
}

export default async function CatchAll({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const path = "/" + (slug ?? []).join("/");

  // Settings pages are data-driven from lib/settings-config.
  if (SETTINGS_PAGES[path]) return <SettingsForm page={SETTINGS_PAGES[path]} />;

  const meta = labelFor(path);
  return (
    <div className="container-1140">
      <h1 className="page-title">{meta?.label ?? "Under udvikling"}</h1>
      <p className="page-desc">{meta ? `${meta.en} · ${path}` : path}</p>
      <div className="card">
        <div className="card-body">
          <div className="help-note">
            Denne side bygges i en senere fase. Se det fulde, navigerbare blueprint over alle undersider i{" "}
            <code>docs/fenster-blueprint/blueprint.html</code>.
          </div>
          <div className="row-actions" style={{ marginTop: 18 }}>
            <Link href="/calendar" className="btn btn-primary">Kalender</Link>
            <Link href="/customers" className="btn btn-outline-secondary">Kunder</Link>
            <Link href="/settings" className="btn btn-outline-secondary">Indstillinger</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
