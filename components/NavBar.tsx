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
    <nav className="flex h-12 flex-none items-center justify-between border-b border-neutral-800 bg-neutral-950 px-4">
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-linear-to-br from-emerald-400 to-emerald-600 text-[11px] font-bold text-black">L</div>
        <span className="text-xs font-semibold text-neutral-300">Oconomi</span>
      </div>

      <div className="flex items-center gap-1">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active = pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                active ? "bg-emerald-500/15 text-emerald-400" : "text-neutral-500 hover:text-neutral-200"
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