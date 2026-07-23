"use client";

// "Test forbindelse" — fetches a client-credentials token and confirms the Dinero
// organization is reachable, showing the result (or the exact error) inline.
import { useActionState } from "react";
import { runDineroTest } from "@/app/actions/dinero";
import type { TestResult } from "@/lib/dinero";

export default function DineroTestButton() {
  const [state, formAction, pending] = useActionState<TestResult, FormData>((p, fd) => runDineroTest(p, fd), { ok: false });

  return (
    <form action={formAction}>
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Tester…" : "Test forbindelse"}
      </button>
      {state.ok ? (
        <div className="help-note" style={{ color: "var(--success, #2e7d32)", marginTop: 10 }}>
          Forbundet til Dinero: {state.orgName ?? "org"} (ID {state.organizationId}
          {state.isPro ? ", Pro" : ", ikke Pro — API kræver Pro"}).
        </div>
      ) : state.error ? (
        <div className="help-note" style={{ color: "var(--danger, #C4183C)", marginTop: 10 }}>{state.error}</div>
      ) : null}
    </form>
  );
}
