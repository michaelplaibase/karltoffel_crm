// Persistence for the settings pages + message templates. Everything lives in
// one JSON blob on Company.settings (single-tenant), namespaced by route/key.
// Values are stored as string arrays so the rendering can coerce by field type
// without ambiguity (a checkbox group and a text field round-trip the same way).
import { prisma } from "./db";

type SettingsValues = Record<string, string[]>;
type TemplateValues = { subjects?: string[]; body?: string; smsSender?: string };
type Store = {
  settings?: Record<string, SettingsValues>;
  templates?: Record<string, TemplateValues>;
};

async function readStore(): Promise<{ companyId: number; store: Store }> {
  const c = await prisma.company.findFirst();
  let store: Store = {};
  if (c?.settings) { try { store = JSON.parse(c.settings) as Store; } catch { store = {}; } }
  return { companyId: c?.id ?? 1, store };
}

async function writeStore(mutate: (s: Store) => void): Promise<void> {
  const { companyId, store } = await readStore();
  mutate(store);
  await prisma.company.update({ where: { id: companyId }, data: { settings: JSON.stringify(store) } });
}

export async function getSettingsValues(route: string): Promise<SettingsValues> {
  const { store } = await readStore();
  return store.settings?.[route] ?? {};
}

export async function setSettingsValues(route: string, values: SettingsValues): Promise<void> {
  await writeStore((s) => { (s.settings ??= {})[route] = values; });
}

export async function getTemplateValues(key: string): Promise<TemplateValues> {
  const { store } = await readStore();
  return store.templates?.[key] ?? {};
}

export async function setTemplateValues(key: string, values: TemplateValues): Promise<void> {
  await writeStore((s) => { (s.templates ??= {})[key] = values; });
}
