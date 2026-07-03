import { notFound } from "next/navigation";
import { getFixedPriceEditData, getContactOptions } from "@/lib/queries";
import { updateFixedPrice } from "@/app/actions/fixed-prices";
import FixedPriceForm from "@/components/FixedPriceForm";

export const metadata = { title: "Rediger fastprisaftale · Karltoffel" };

export default async function EditFixedPrice({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const displayNo = Number(id);
  const [fp, contacts] = await Promise.all([
    getFixedPriceEditData(displayNo),
    getContactOptions(),
  ]);
  if (!fp) notFound();

  return (
    <div className="container-1140">
      <FixedPriceForm
        action={updateFixedPrice.bind(null, fp.pk)}
        contacts={contacts}
        initial={{ contactId: fp.contactId, tasks: fp.tasks }}
        title={`Rediger fastprisaftale #${fp.displayNo}`}
        submitLabel="Opdater fastprisaftale"
      />
    </div>
  );
}
