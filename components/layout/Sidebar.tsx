'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LayoutDashboard, Users, Layers, ChevronDown, Building2 } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/teams", label: "Teams", icon: Layers },
  { href: "/members", label: "Members", icon: Users },
  { href: "/cost-centers", label: "Cost Centers", icon: Building2 },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <aside className="border-r bg-card md:w-64">
      <div className="md:hidden">
        <button
          type="button"
          onClick={() => setIsOpen((value) => !value)}
          className="flex w-full items-center justify-between border-b px-4 py-3 text-sm font-medium"
          aria-expanded={isOpen}
        >
          Navigation
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>
      <nav
        className={[
          "flex flex-col gap-1 px-3 py-4 text-sm",
          isOpen ? "block" : "hidden md:flex",
        ].join(" ")}
      >
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsOpen(false)}
              className={[
                "flex items-center gap-3 rounded-md px-3 py-2 transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              ].join(" ")}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
