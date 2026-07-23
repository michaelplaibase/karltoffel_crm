"use server";

// Server actions for the Dinero (Visma) accounting integration: test the
// client-credentials connection, edit the chart-of-accounts numbers, and (re)issue
// an order's invoice.
import { prisma } from "@/lib/db";
import { guardAction, getSessionUser } from "@/lib/api-auth";
import { issueInvoiceForOrder, testDineroConnection, resolveOrgId, type TestResult } from "@/lib/dinero";
import { revalidatePath } from "next/cache";

export type AccountsState = { error?: string; ok?: boolean };

/** Update the sales/cash Dinero chart-of-accounts numbers (admin only). Upserts the
 *  connection row so numbers can be set before the first "Test forbindelse". */
export async function saveDineroAccounts(_prev: AccountsState, formData: FormData): Promise<AccountsState> {
  await guardAction();
  const user = await getSessionUser();
  if (!user?.isAdmin) return { error: "Kun administratorer kan ændre regnskabsindstillinger." };

  const sales = Number(formData.get("salesAccountNumber"));
  const cash = Number(formData.get("cashAccountNumber"));
  const salesN = Number.isFinite(sales) && sales > 0 ? Math.trunc(sales) : 1000;
  const cashN = Number.isFinite(cash) && cash > 0 ? Math.trunc(cash) : 55040;

  const company = await prisma.company.findFirst({ select: { id: true } });
  if (!company) return { error: "Ingen virksomhed fundet." };

  const existing = await prisma.dineroConnection.findFirst({ where: { companyId: company.id }, select: { id: true } });
  const orgId = resolveOrgId();
  if (!existing && !orgId) return { error: "Test forbindelsen til Dinero først." };

  await prisma.dineroConnection.upsert({
    where: { companyId: company.id },
    create: { companyId: company.id, organizationId: orgId ?? "", salesAccountNumber: salesN, cashAccountNumber: cashN },
    update: { salesAccountNumber: salesN, cashAccountNumber: cashN },
  });
  revalidatePath("/accounting");
  return { ok: true };
}

/** "Test forbindelse" — fetch a client-credentials token, confirm the org is
 *  reachable, and cache org name/isPro/status. Returns the result for inline display. */
export async function runDineroTest(_prev: TestResult, _formData: FormData): Promise<TestResult> {
  await guardAction();
  const user = await getSessionUser();
  if (!user?.isAdmin) return { ok: false, error: "Kun administratorer." };
  const company = await prisma.company.findFirst({ select: { id: true } });
  if (!company) return { ok: false, error: "Ingen virksomhed fundet." };
  const res = await testDineroConnection(company.id);
  revalidatePath("/accounting");
  return res;
}

/** "Fakturér igen" — re-run invoicing for an order using its stored decision,
 *  resuming from the furthest Dinero state already reached. */
export async function retryInvoice(orderId: number): Promise<void> {
  await guardAction();
  await issueInvoiceForOrder(orderId);
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
}
