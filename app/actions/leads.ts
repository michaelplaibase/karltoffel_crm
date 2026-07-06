"use server";

// Server actions for the Emner (leads) register: advance a lead's status and
// convert it into a real Contact. All guarded — anonymous callers bounce to
// /login (see lib/api-auth).
import { prisma } from "@/lib/db";
import { guardAction } from "@/lib/api-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

/** Same "one free-text address -> street + city on the first comma" split the
 *  contact create flow uses (app/actions/contacts.ts). */
function splitAddress(addr: string): { street: string; city: string } {
  const i = addr.indexOf(",");
  if (i === -1) return { street: addr.trim(), city: "" };
  return { street: addr.slice(0, i).trim(), city: addr.slice(i + 1).trim() };
}

export async function markLeadContacted(id: number): Promise<void> {
  await guardAction();
  await prisma.lead.update({ where: { id }, data: { status: "contacted" } });
  revalidatePath("/leads");
}

export async function rejectLead(id: number): Promise<void> {
  await guardAction();
  await prisma.lead.update({ where: { id }, data: { status: "rejected" } });
  revalidatePath("/leads");
}

/** Convert a lead into a customer. If it is already linked to a Contact, just
 *  mark it converted and open that customer; otherwise create the Contact and
 *  link it, in one transaction. */
export async function convertLead(id: number): Promise<void> {
  await guardAction();
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) return;

  if (lead.contactId) {
    await prisma.lead.update({ where: { id }, data: { status: "converted" } });
    revalidatePath("/leads");
    redirect(`/customers/${lead.contactId}`);
  }

  const company = await prisma.company.findFirst();
  if (!company) return;
  const { street, city } = splitAddress(lead.address ?? "");

  const contact = await prisma.$transaction(async (tx) => {
    const c = await tx.contact.create({
      data: { companyId: company.id, name: lead.name, email: lead.email, phone: lead.phone, street, city },
    });
    await tx.lead.update({ where: { id }, data: { status: "converted", contactId: c.id } });
    return c;
  });

  revalidatePath("/leads");
  revalidatePath("/customers");
  redirect(`/customers/${contact.id}`);
}
