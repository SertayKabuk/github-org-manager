'use client';

import Link from "next/link";
import { Github } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { AuthButton } from "@/components/auth/AuthButton";

export default function Header() {
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
        <div className="flex items-center gap-3">
          <AuthButton />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
