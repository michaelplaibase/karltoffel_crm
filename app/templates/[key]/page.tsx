import { notFound } from "next/navigation";
import { TEMPLATES } from "@/lib/templates-config";
import TemplateEditor from "@/components/TemplateEditor";

export default async function TemplatePage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const t = TEMPLATES.find((x) => x.key === key);
  if (!t) notFound();
  return <TemplateEditor t={t} />;
}
