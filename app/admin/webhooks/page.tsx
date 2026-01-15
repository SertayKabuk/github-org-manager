'use client';

import { useState, useEffect, useCallback } from "react";
import { Webhook, Clock, CheckCircle, XCircle, RefreshCw, ChevronLeft, ChevronRight, Play } from "lucide-react";

import type { ApiResponse } from "@/lib/types/github";
import type { WebhookEventEntity, WebhookEventStatus } from "@/lib/entities/webhook-event";
import { Button } from "@/components/ui/button";
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

interface PaginatedWebhookResponse {
    events: WebhookEventEntity[];
    total: number;
    limit: number;
    offset: number;
}

const STATUS_OPTIONS = [
    { label: "All", value: "all" },
    { label: "Pending", value: "pending" },
    { label: "Processed", value: "processed" },
    { label: "Failed", value: "failed" },
];

const EVENT_TYPE_OPTIONS = [
    { label: "All Events", value: "all" },
    { label: "Organization", value: "organization" },
];

const ACTION_OPTIONS = [
    { label: "All Actions", value: "all" },
    { label: "Member Added", value: "member_added" },
    { label: "Member Invited", value: "member_invited" },
    { label: "Member Removed", value: "member_removed" },
];

const PAGE_SIZE = 20;

function getStatusIcon(status: WebhookEventStatus) {
    switch (status) {
        case "pending":
            return <Clock className="h-4 w-4 text-yellow-500" />;
        case "processed":
            return <CheckCircle className="h-4 w-4 text-green-500" />;
        case "failed":
            return <XCircle className="h-4 w-4 text-red-500" />;
        default:
            return null;
    }
}

function getStatusBadgeVariant(status: WebhookEventStatus): "default" | "secondary" | "destructive" | "outline" {
    switch (status) {
        case "pending":
            return "secondary";
        case "processed":
            return "default";
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
        second: "2-digit",
    });
}

export default function WebhooksPage() {
    const { isAuthenticated } = useAuth();
    const [events, setEvents] = useState<WebhookEventEntity[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [total, setTotal] = useState(0);
    const [offset, setOffset] = useState(0);

    // Filters
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [eventTypeFilter, setEventTypeFilter] = useState<string>("all");
    const [actionFilter, setActionFilter] = useState<string>("all");

    // Process state
    const [processing, setProcessing] = useState(false);
    const [processMessage, setProcessMessage] = useState<string | null>(null);

    const fetchEvents = useCallback(async () => {
        if (!isAuthenticated) return;

        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (statusFilter !== "all") params.set("status", statusFilter);
            if (eventTypeFilter !== "all") params.set("eventType", eventTypeFilter);
            if (actionFilter !== "all") params.set("action", actionFilter);
            params.set("limit", PAGE_SIZE.toString());
            params.set("offset", offset.toString());

            const url = `/api/webhooks/github?${params.toString()}`;
            const response = await fetch(url);
            const data: ApiResponse<PaginatedWebhookResponse> = await response.json();

            if (data.error) {
                setError(data.error);
            } else {
                setEvents(data.data.events);
                setTotal(data.data.total);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to fetch webhook events");
        } finally {
            setLoading(false);
        }
    }, [statusFilter, eventTypeFilter, actionFilter, offset, isAuthenticated]);

    useEffect(() => {
        if (isAuthenticated) {
            fetchEvents();
        }
    }, [fetchEvents, isAuthenticated]);

    // Reset offset when filters change
    useEffect(() => {
        setOffset(0);
    }, [statusFilter, eventTypeFilter, actionFilter]);

    const handleProcess = async () => {
        setProcessing(true);
        setProcessMessage(null);

        try {
            const response = await fetch("/api/webhooks/github/process", {
                method: "POST",
            });

            const data = await response.json();

            if (data.error) {
                setProcessMessage(`Error: ${data.error}`);
            } else {
                const { processed, failed } = data.data;
                setProcessMessage(`Processed: ${processed}, Failed: ${failed}`);
                fetchEvents();
            }
        } catch (err) {
            setProcessMessage(`Error: ${err instanceof Error ? err.message : "Failed to process"}`);
        } finally {
            setProcessing(false);
        }
    };

    const totalPages = Math.ceil(total / PAGE_SIZE);
    const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

    const goToPage = (page: number) => {
        setOffset((page - 1) * PAGE_SIZE);
    };


    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Webhook Events</h1>
                <p className="text-muted-foreground mt-2">
                    View and manage incoming GitHub webhook events.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Webhook className="h-5 w-5" />
                                Events
                            </CardTitle>
                            <CardDescription>
                                {total} total event{total !== 1 ? 's' : ''}
                            </CardDescription>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-[130px]">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    {STATUS_OPTIONS.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
                                <SelectTrigger className="w-[140px]">
                                    <SelectValue placeholder="Event Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {EVENT_TYPE_OPTIONS.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={actionFilter} onValueChange={setActionFilter}>
                                <SelectTrigger className="w-[160px]">
                                    <SelectValue placeholder="Action" />
                                </SelectTrigger>
                                <SelectContent>
                                    {ACTION_OPTIONS.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button
                                variant="outline"
                                onClick={handleProcess}
                                disabled={processing}
                                className="gap-2"
                            >
                                <Play className={`h-4 w-4 ${processing ? 'animate-pulse' : ''}`} />
                                {processing ? "Processing..." : "Process Pending"}
                            </Button>
                            <Button variant="outline" size="icon" onClick={fetchEvents}>
                                <RefreshCw className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                {processMessage && (
                    <div className={`mx-6 mb-4 p-3 rounded-md text-sm ${processMessage.startsWith('Error')
                        ? 'bg-destructive/10 text-destructive'
                        : 'bg-green-500/10 text-green-600 dark:text-green-400'
                        }`}>
                        {processMessage}
                    </div>
                )}
                <CardContent>
                    {loading ? (
                        <div className="space-y-2">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <Skeleton key={i} className="h-20" />
                            ))}
                        </div>
                    ) : error ? (
                        <ErrorMessage message={error} />
                    ) : events.length === 0 ? (
                        <p className="text-muted-foreground text-center py-8">
                            No webhook events found.
                        </p>
                    ) : (
                        <>
                            <div className="divide-y">
                                {events.map((event) => (
                                    <div key={event.id} className="py-4">
                                        <div className="flex flex-wrap items-start justify-between gap-4">
                                            <div className="flex-1 min-w-[200px]">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded">
                                                        {event.event_type}.{event.action}
                                                    </code>
                                                    <Badge variant={getStatusBadgeVariant(event.status)}>
                                                        {getStatusIcon(event.status)}
                                                        <span className="ml-1 capitalize">{event.status}</span>
                                                    </Badge>
                                                </div>
                                                <p className="text-xs text-muted-foreground font-mono">
                                                    Delivery: {event.delivery_id}
                                                </p>
                                                {event.error_message && (
                                                    <p className="text-sm text-destructive mt-1">
                                                        {event.error_message}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="text-sm text-muted-foreground text-right">
                                                <div>Received: {formatDate(event.created_at as unknown as string)}</div>
                                                {event.processed_at && (
                                                    <div>Processed: {formatDate(event.processed_at as unknown as string)}</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                                    <p className="text-sm text-muted-foreground">
                                        Showing {offset + 1}-{Math.min(offset + PAGE_SIZE, total)} of {total}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => goToPage(currentPage - 1)}
                                            disabled={currentPage <= 1}
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                            Previous
                                        </Button>
                                        <span className="text-sm text-muted-foreground px-2">
                                            Page {currentPage} of {totalPages}
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => goToPage(currentPage + 1)}
                                            disabled={currentPage >= totalPages}
                                        >
                                            Next
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
