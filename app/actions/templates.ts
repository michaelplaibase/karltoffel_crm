"use server";

// Test-send for the e-mail/SMS template editor. There is no real SMTP/SMS
// provider in this internal clone, so the send is stubbed: we validate the
// recipient and return a confirmation the UI shows as feedback (the click is
// wired to a real server round-trip; actual delivery is out of scope).

import { guardAction } from "@/lib/api-auth";

export type TestSendResult = { ok: boolean; message: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function sendTestMessage(channel: "email" | "sms", to: string): Promise<TestSendResult> {
  await guardAction();
  const v = (to ?? "").trim();
  if (channel === "email") {
    if (!EMAIL_RE.test(v)) return { ok: false, message: "Angiv en gyldig e-mailadresse." };
    return { ok: true, message: `✓ Test-e-mail sendt til ${v} (simuleret).` };
  }
  const digits = v.replace(/[\s+]/g, "");
  if (digits.length < 8) return { ok: false, message: "Angiv et gyldigt mobilnummer." };
  return { ok: true, message: `✓ Test-SMS sendt til ${v} (simuleret).` };
}
