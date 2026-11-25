"use client";

import { CalendarDays, LayoutGrid, Plus, Sun } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BrandMark } from "@/components/brand/mark";
import { RegisterSheet } from "./register-sheet";

const tabs = [
  { href: "/", label: "Hoje", Icon: Sun },
  { href: "/agenda", label: "Agenda", Icon: CalendarDays },
  { href: "/vida", label: "Vida", Icon: LayoutGrid },
] as const;

export function TabBar() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  const item = (href: string, label: string, Icon: typeof Sun) => (
    <Link
      key={href}
      href={href}
      aria-label={label}
      aria-current={active(href) ? "page" : undefined}
      className={`grid h-11 place-items-center rounded-full transition ${active(href) ? "w-14 bg-ink text-bg" : "w-11 text-ink"}`}
    >
      <Icon className="size-5" strokeWidth={2.2} />
    </Link>
  );

  return (
    <>
      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-gutter"
        style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="flex h-[60px] w-full max-w-md items-center justify-around rounded-full bg-surface px-2 shadow-[var(--shadow-float)]">
          {item(tabs[0].href, tabs[0].label, tabs[0].Icon)}
          {item(tabs[1].href, tabs[1].label, tabs[1].Icon)}
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Registrar"
            aria-haspopup="dialog"
            className="grid size-11 place-items-center rounded-full bg-coral text-on-color transition active:scale-95"
          >
            <Plus className="size-6" strokeWidth={2.6} />
          </button>
          {item(tabs[2].href, tabs[2].label, tabs[2].Icon)}
          <Link
            href="/finch"
            aria-label="Assistente Finch"
            aria-current={active("/finch") ? "page" : undefined}
            className={`grid h-11 place-items-center rounded-full transition ${active("/finch") ? "w-14 bg-ink" : "w-11"}`}
          >
            <BrandMark className="size-7" eye={active("/finch") ? "var(--ink)" : "var(--stage)"} />
          </Link>
        </div>
      </nav>
      <RegisterSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}
