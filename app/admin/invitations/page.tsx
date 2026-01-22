'use client';

import { useState, useEffect, useCallback } from "react";
import { Mail, UserPlus, Clock, CheckCircle, XCircle, AlertCircle, RefreshCw, CloudDownload } from "lucide-react";

import type { ApiResponse, Invitation, InvitationStatus, CreateInvitationInput } from "@/lib/types/github";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import ErrorMessage from "@/components/ui/ErrorMessage";
import { useAuth } from "@/components/auth/AuthProvider";

const STATUS_OPTIONS = [
    { label: "All", value: "all" },
    { label: "Pending", value: "pending" },
    { label: "Accepted", value: "accepted" },
    { label: "Expired", value: "expired" },
];

const ROLE_OPTIONS = [
    { label: "Member", value: "direct_member" },
    { label: "Admin", value: "admin" },
    { label: "Billing Manager", value: "billing_manager" },
];

function getStatusIcon(status: InvitationStatus) {
    switch (status) {
        case "pending":
            return <Clock className="h-4 w-4 text-yellow-500" />;
        case "accepted":
            return <CheckCircle className="h-4 w-4 text-green-500" />;
        case "expired":
            return <AlertCircle className="h-4 w-4 text-gray-500" />;
        case "failed":
            return <XCircle className="h-4 w-4 text-red-500" />;
        default:
            return null;
    }
}

function getStatusBadgeVariant(status: InvitationStatus): "default" | "secondary" | "destructive" | "outline" {
    switch (status) {
        case "pending":
            return "secondary";
        case "accepted":
            return "default";
        case "expired":
        case "failed":
            return "destructive";
        default:
            return "outline";
    }
}

function formatDate(dateString: string | null): string {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

import { withBasePath } from "@/lib/utils";

export default function InvitationsPage() {
    const { isAuthenticated } = useAuth();
    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>("all");

    // Form state
    const [email, setEmail] = useState("");
    const [role, setRole] = useState<CreateInvitationInput["role"]>("direct_member");
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [formSuccess, setFormSuccess] = useState<string | null>(null);

    // Sync state
    const [syncing, setSyncing] = useState(false);
    const [syncMessage, setSyncMessage] = useState<string | null>(null);

    const fetchInvitations = useCallback(async () => {
        if (!isAuthenticated) return;

        setLoading(true);
        setError(null);
        try {
            const url = statusFilter === "all"
                ? "/api/invitations"
                : `/api/invitations?status=${statusFilter}`;
            const response = await fetch(url);
            const data: ApiResponse<Invitation[]> = await response.json();

            if (data.error) {
                setError(data.error);
            } else {
                setInvitations(data.data);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to fetch invitations");
        } finally {
            setLoading(false);
        }
    }, [statusFilter, isAuthenticated]);

    useEffect(() => {
        if (isAuthenticated) {
            fetchInvitations();
        }
    }, [fetchInvitations, isAuthenticated]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);
        setFormSuccess(null);
        setSubmitting(true);

        try {
            const response = await fetch(withBasePath("/api/invitations"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, role }),
            });

            const data: ApiResponse<Invitation> = await response.json();

            if (data.error) {
                setFormError(data.error);
            } else {
                setFormSuccess(`Invitation sent to ${email}`);
                setEmail("");
                fetchInvitations();
            }
        } catch (err) {
            setFormError(err instanceof Error ? err.message : "Failed to send invitation");
        } finally {
            setSubmitting(false);
        }
    };

    const handleSync = async () => {
        setSyncing(true);
        setSyncMessage(null);

        try {
            const response = await fetch(withBasePath("/api/invitations/sync"), {
                method: "POST",
            });

            const data = await response.json();

            if (data.error) {
                setSyncMessage(`Error: ${data.error}`);
            } else {
                const { markedAsAccepted, markedAsFailed, pendingInGitHub, failedInGitHub, newFromGitHub } = data.data;
                setSyncMessage(
                    `Synced with GitHub: ${pendingInGitHub} pending, ${failedInGitHub} failed. ` +
                    `Updated: ${markedAsAccepted} accepted, ${markedAsFailed} failed. ` +
                    `Imported: ${newFromGitHub} new.`
                );
                fetchInvitations();
            }
        } catch (err) {
            setSyncMessage(`Error: ${err instanceof Error ? err.message : "Failed to sync"}`);
        } finally {
            setSyncing(false);
        }
    };


    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Invitations</h1>
                <p className="text-muted-foreground mt-2">
                    Invite members by email and track when they accept to match their GitHub username.
                </p>
            </div>

            {/* Invite Form */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <UserPlus className="h-5 w-5" />
                        Send Invitation
                    </CardTitle>
                    <CardDescription>
                        Invite a new member to your organization by email address.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="flex flex-wrap gap-4">
                        <Input
                            type="email"
                            placeholder="email@company.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="flex-1 min-w-[200px]"
                            required
                        />
                        <Select value={role} onValueChange={(v) => setRole(v as CreateInvitationInput["role"])}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Role" />
                            </SelectTrigger>
                            <SelectContent>
                                {ROLE_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button type="submit" disabled={submitting || !email}>
                            {submitting ? "Sending..." : "Send Invitation"}
                        </Button>
                    </form>
                    {formError && (
                        <p className="text-destructive text-sm mt-2">{formError}</p>
                    )}
                    {formSuccess && (
                        <p className="text-green-600 text-sm mt-2">{formSuccess}</p>
                    )}
                </CardContent>
            </Card>

            {/* Invitations List */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Mail className="h-5 w-5" />
                                Invitation History
                            </CardTitle>
                            <CardDescription>
                                Track sent invitations and see which emails correspond to GitHub usernames.
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-[140px]">
                                    <SelectValue placeholder="Filter status" />
                                </SelectTrigger>
                                <SelectContent>
                                    {STATUS_OPTIONS.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button
                                variant="outline"
                                onClick={handleSync}
                                disabled={syncing}
                                className="gap-2"
                            >
                                <CloudDownload className={`h-4 w-4 ${syncing ? 'animate-pulse' : ''}`} />
                                {syncing ? "Syncing..." : "Sync with GitHub"}
                            </Button>
                            <Button variant="outline" size="icon" onClick={fetchInvitations}>
                                <RefreshCw className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                {syncMessage && (
                    <div className={`mx-6 mb-4 p-3 rounded-md text-sm ${syncMessage.startsWith('Error')
                        ? 'bg-destructive/10 text-destructive'
                        : 'bg-green-500/10 text-green-600 dark:text-green-400'
                        }`}>
                        {syncMessage}
                    </div>
                )}
                <CardContent>
                    {loading ? (
                        <div className="space-y-2">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <Skeleton key={i} className="h-16" />
                            ))}
                        </div>
                    ) : error ? (
                        <ErrorMessage message={error} />
                    ) : invitations.length === 0 ? (
                        <p className="text-muted-foreground text-center py-8">
                            No invitations found. Send your first invitation above!
                        </p>
                    ) : (
                        <div className="divide-y">
                            {invitations.map((invitation) => (
                                <div key={invitation.id} className="py-4 flex flex-wrap items-center gap-4">
                                    <div className="flex-1 min-w-[200px]">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">{invitation.email}</span>
                                            <Badge variant={getStatusBadgeVariant(invitation.status)}>
                                                {getStatusIcon(invitation.status)}
                                                <span className="ml-1 capitalize">{invitation.status}</span>
                                            </Badge>
                                        </div>
                                        {invitation.github_username && (
                                            <p className="text-sm text-muted-foreground">
                                                → @{invitation.github_username}
                                            </p>
                                        )}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        <div>Invited: {formatDate(invitation.invited_at)}</div>
                                        {invitation.accepted_at && (
                                            <div>Accepted: {formatDate(invitation.accepted_at)}</div>
                                        )}
                                        {invitation.inviter_login && (
                                            <div>By: @{invitation.inviter_login}</div>
                                        )}
                                    </div>
                                    <Badge variant="outline" className="capitalize">
                                        {invitation.role.replace("_", " ")}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
