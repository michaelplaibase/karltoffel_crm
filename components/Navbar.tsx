"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { TOP_NAV, ACCOUNT_MENU, COMPANY_NAME } from "@/lib/nav";

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState<string | null>(null);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(null);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  useEffect(() => setOpen(null), [pathname]);

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(href));

  return (
    <nav className="navbar" ref={ref}>
      <Link href="/" className="navbar-brand">
        <span className="brand-logo">
          <i /><i /><i /><i />
        </span>
        Karltoffel
      </Link>

      <div className="nav-menus">
        {TOP_NAV.map((menu) => {
          const single = menu.items.length === 1 && menu.items[0].label === menu.label;
          if (single) {
            const it = menu.items[0];
            return (
              <div className="nav-item" key={menu.label}>
                <Link href={it.href} className={`nav-link ${isActive(it.href) ? "active" : ""}`}>
                  {menu.label}
                </Link>
              </div>
            );
          }
          const anyActive = menu.items.some((i) => isActive(i.href));
          return (
            <div className="nav-item" key={menu.label}>
              <button
                className={`nav-link ${anyActive ? "active" : ""}`}
                onClick={() => setOpen(open === menu.label ? null : menu.label)}
                aria-expanded={open === menu.label}
              >
                {menu.label}
                <i className="bi bi-caret-down-fill" />
              </button>
              {open === menu.label && (
                <div className="dropdown-menu">
                  {menu.items.map((it) => (
                    <Link key={it.href} href={it.href} className="dropdown-item">
                      <span>{it.label}</span>
                      {it.gate ? <span className="gate">{it.gate}</span> : <span className="en">{it.en}</span>}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="navbar-right nav-item">
        <button
          className="acct-toggle"
          onClick={() => setOpen(open === "__acct" ? null : "__acct")}
          aria-expanded={open === "__acct"}
        >
          <i className="bi bi-person-circle" />
          {COMPANY_NAME}
          <i className="bi bi-caret-down-fill" style={{ fontSize: 11 }} />
        </button>
        {open === "__acct" && (
          <div className="dropdown-menu right">
            {ACCOUNT_MENU.map((it) => (
              <Link key={it.href} href={it.href} className="dropdown-item">
                <span>{it.label}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
