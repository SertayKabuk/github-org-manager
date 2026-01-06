'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Github, Menu, X } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { AuthButton } from "@/components/auth/AuthButton";

const NAV_ITEMS = [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/teams", label: "Teams" },
    { href: "/admin/members", label: "Members" },
    { href: "/admin/invitations", label: "Invitations" },
    { href: "/admin/cost-centers", label: "Cost Centers" },
    { href: "/admin/budgets", label: "Budgets" },
    { href: "/admin/email-mappings", label: "Email Mappings" },
    { href: "/admin/webhooks", label: "Webhooks" },
];

export default function AdminHeader() {
    const pathname = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
                    {NAV_ITEMS.map((item) => {
                        const isActive =
                            (item.href === "/admin" && pathname === "/admin") ||
                            (item.href !== "/admin" && pathname?.startsWith(item.href));
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
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-md border border-input p-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground md:hidden"
                        aria-label="Toggle navigation menu"
                        aria-expanded={isMobileMenuOpen}
                        onClick={() => setIsMobileMenuOpen((prev) => !prev)}
                    >
                        {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                    </button>
                </div>
            </div>
            {isMobileMenuOpen && (
                <div className="border-t bg-background/95 shadow-md md:hidden">
                    <nav className="flex flex-col gap-2 px-4 py-4 text-sm font-medium text-muted-foreground">
                        {NAV_ITEMS.map((item) => {
                            const isActive =
                                (item.href === "/admin" && pathname === "/admin") ||
                                (item.href !== "/admin" && pathname?.startsWith(item.href));
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={[
                                        "rounded-md px-3 py-2 transition-colors",
                                        isActive
                                            ? "bg-primary text-primary-foreground"
                                            : "hover:bg-accent hover:text-accent-foreground",
                                    ].join(" ")}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    {item.label}
                                </Link>
                            );
                        })}
                    </nav>
                </div>
            )}
        </header>
    );
}
