import { notFound } from "next/navigation";
import { TEMPLATES } from "@/lib/templates-config";
import { getTemplateValues } from "@/lib/settings-store";
import { saveTemplate } from "@/app/actions/settings";
import TemplateEditor from "@/components/TemplateEditor";

export default async function TemplatePage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const t = TEMPLATES.find((x) => x.key === key);
  if (!t) notFound();
  const values = await getTemplateValues(key);
  return <TemplateEditor t={t} action={saveTemplate.bind(null, key)} values={values} />;
}
