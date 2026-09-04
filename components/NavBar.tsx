"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare, LayoutDashboard } from "lucide-react";

const LINKS = [
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="flex h-12 flex-none items-center justify-between border-b border-brand-border bg-brand-bg px-4">
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-linear-to-br from-brand-accent to-brand-accent-dark text-[11px] font-bold text-black">O</div>
        <span className="text-xs font-semibold text-brand-muted">Oconomi</span>
      </div>

      <div className="flex items-center gap-1">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active = pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                active ? "bg-brand-accent/15 text-brand-accent" : "text-brand-muted-2 hover:text-brand-text"
              }`}
            >
              <Icon size={14} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}