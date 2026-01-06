'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminHeader from "@/components/layout/AdminHeader";
import { useAuth } from "@/components/auth/AuthProvider";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { isAuthenticated, isAdmin, isLoading, adminLogin } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            // Redirect to admin login
            adminLogin('/admin');
        } else if (!isLoading && isAuthenticated && !isAdmin) {
            // User is logged in but not an admin
            router.push('/?error=admin_required');
        }
    }, [isAuthenticated, isAdmin, isLoading, adminLogin, router]);

    // Show loading while checking auth
    if (isLoading) {
        return (
            <div className="min-h-screen bg-background">
                <div className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
                    <div className="mx-auto flex h-14 w-full max-w-7xl items-center px-4 sm:px-6 lg:px-8">
                        <Skeleton className="h-9 w-9 rounded-lg" />
                        <Skeleton className="ml-2 h-6 w-32" />
                    </div>
                </div>
                <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                    <Skeleton className="h-64 w-full" />
                </main>
            </div>
        );
    }

    // Don't render if not authorized
    if (!isAuthenticated || !isAdmin) {
        return null;
    }

    return (
        <div className="min-h-screen bg-background">
            <AdminHeader />
            <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                {children}
            </main>
        </div>
    );
}
