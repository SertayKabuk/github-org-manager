'use client';

import Link from "next/link";
import { Users, Layers, GitFork, Plus, ArrowRight, Github, Mail } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import ErrorMessage from "@/components/ui/ErrorMessage";
import { useOrg, useTeams, useMembers } from "@/lib/hooks";

export default function AdminDashboard() {
    const {
        data: org,
        isLoading: orgLoading,
        error: orgError,
    } = useOrg();

    const {
        data: teams = [],
        isLoading: teamsLoading,
        error: teamsError,
    } = useTeams();

    const {
        data: members = [],
        isLoading: membersLoading,
        error: membersError,
    } = useMembers();

    const loading = orgLoading || teamsLoading || membersLoading;
    const error = orgError || teamsError || membersError;

    if (loading) {
        return (
            <div className="space-y-6">
                <div>
                    <Skeleton className="h-8 w-64 mb-2" />
                    <Skeleton className="h-4 w-96" />
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                    <Skeleton className="h-32" />
                    <Skeleton className="h-32" />
                    <Skeleton className="h-32" />
                </div>
                <Skeleton className="h-64" />
            </div>
        );
    }

    if (error) {
        return <ErrorMessage message={error.message} />;
    }

    if (!org) {
        return <ErrorMessage message="Organization data is unavailable." />;
    }

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div>
                <div className="flex items-center gap-3 mb-2">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/60">
                        <Github className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{org.name ?? org.login}</h1>
                        <p className="text-muted-foreground">
                            {org.description ?? "No organization description provided."}
                        </p>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-50 to-background dark:from-blue-950/20 dark:to-background">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Total Members
                        </CardTitle>
                        <Users className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{members.length}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Active organization members
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-emerald-500 bg-gradient-to-br from-emerald-50 to-background dark:from-emerald-950/20 dark:to-background">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Teams
                        </CardTitle>
                        <Layers className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{teams.length}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Organized in teams
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-500 bg-gradient-to-br from-purple-50 to-background dark:from-purple-950/20 dark:to-background">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Public Repos
                        </CardTitle>
                        <GitFork className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{org.public_repos}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Open source projects
                        </p>
                    </CardContent>
                </Card>

                <Link href="/admin/email-mappings">
                    <Card className="border-l-4 border-l-orange-500 bg-gradient-to-br from-orange-50 to-background dark:from-orange-950/20 dark:to-background hover:shadow-md transition-shadow cursor-pointer">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Email Mappings
                            </CardTitle>
                            <Mail className="h-4 w-4 text-orange-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-sm font-medium text-orange-600">View All →</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                User email verifications
                            </p>
                        </CardContent>
                    </Card>
                </Link>
            </div>

            {/* Quick Actions */}
            <Card>
                <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                    <CardDescription>Manage your organization efficiently</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <Link
                            href="/admin/teams/new"
                            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
                        >
                            <Plus className="h-4 w-4" />
                            Create New Team
                        </Link>
                        <Link
                            href="/admin/members"
                            className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                        >
                            <Users className="h-4 w-4" />
                            View All Members
                        </Link>
                    </div>
                </CardContent>
            </Card>

            {/* Teams Overview */}
            <Card>
                <CardHeader>
                    <CardTitle>Teams Overview</CardTitle>
                    <CardDescription>Recently created teams in your organization</CardDescription>
                </CardHeader>
                <CardContent>
                    {teams.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <Layers className="h-12 w-12 text-muted-foreground/50 mb-4" />
                            <p className="text-sm text-muted-foreground">No teams yet. Create one to get started.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {teams.slice(0, 4).map((team) => (
                                <div key={team.id}>
                                    <div className="flex items-center justify-between py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                                                <Layers className="h-5 w-5 text-muted-foreground" />
                                            </div>
                                            <div>
                                                <p className="font-medium">{team.name}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Badge variant="secondary" className="text-xs">
                                                        <Users className="h-3 w-3 mr-1" />
                                                        {team.members_count} {team.members_count === 1 ? 'member' : 'members'}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                        <Link
                                            href={`/admin/teams/${team.slug}`}
                                            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                                        >
                                            Manage
                                            <ArrowRight className="h-4 w-4" />
                                        </Link>
                                    </div>
                                    {team.id !== teams.slice(0, 4)[teams.slice(0, 4).length - 1].id && (
                                        <Separator />
                                    )}
                                </div>
                            ))}
                            {teams.length > 4 && (
                                <div className="pt-2">
                                    <Link
                                        href="/admin/teams"
                                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        View all {teams.length} teams →
                                    </Link>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
