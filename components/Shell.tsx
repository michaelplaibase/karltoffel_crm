"use client";

import { usePathname } from "next/navigation";
import Navbar from "./Navbar";

// Create/edit forms render as chromeless modal-style pages (no navbar),
// matching the live portal's /contact_create/, /contact_edit/ etc.
// Matches /…/new, /…/edit and id-scoped /…/{id}/settings — but NOT the
// top-level /settings (Generelt), which keeps the navbar.
const FORM_ROUTE = /\/(new|edit)(\/|$)|\/\d+\/settings\/?$/;

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/login" || FORM_ROUTE.test(pathname)) {
    return <div className="form-page">{children}</div>;
  }
  return (
    <>
      <Navbar />
      <div className="app-main">{children}</div>
    </>
  );
}
