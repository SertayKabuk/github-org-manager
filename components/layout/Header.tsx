'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Github } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { AuthButton } from "@/components/auth/AuthButton";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/teams", label: "Teams" },
  { href: "/members", label: "Members" },
];

export default function Header() {
  const pathname = usePathname();
  const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "GitHub Org Manager";

  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 text-base font-semibold">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Github className="h-5 w-5" />
          </span>
          <span className="hidden sm:inline-block">{appName}</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "transition-colors hover:text-foreground",
                  isActive ? "text-foreground" : "",
                ].join(" ")}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-4">
          <AuthButton />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
