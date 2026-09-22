'use client';

import { useMemo, useState } from "react";
import { CheckCircle2, Clock, RefreshCcw, XCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ErrorMessage from "@/components/ui/ErrorMessage";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useBudgetRequests } from "@/lib/hooks";
import type { BudgetRequestEntity, BudgetRequestStatus } from "@/lib/entities/budget-request";
import type { ApiResponse, Budget } from "@/lib/types/github";
import { withBasePath } from "@/lib/utils";

type StatusFilter = "all" | BudgetRequestStatus;

interface BudgetRequestActionResult {
  request: BudgetRequestEntity;
  budget: Budget | null;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount));
}

function statusBadge(status: BudgetRequestStatus) {
  switch (status) {
    case "pending":
      return (
        <Badge variant="secondary" className="gap-1">
          <Clock className="h-3 w-3" /> Pending
        </Badge>
      );
    case "approved":
      return (
        <Badge variant="default" className="gap-1">
          <CheckCircle2 className="h-3 w-3" /> Approved
        </Badge>
      );
    case "rejected":
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" /> Rejected
        </Badge>
      );
  }
}

export default function BudgetRequestsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");

  const {
    data: requests = [],
    isLoading: loading,
    error: requestsError,
    refetch,
  } = useBudgetRequests({ status: statusFilter });

  const [reviewTarget, setReviewTarget] = useState<{ request: BudgetRequestEntity; action: "approve" | "reject" } | null>(null);
  const [reviewAmount, setReviewAmount] = useState<number | "">("");
  const [reviewNote, setReviewNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const stats = useMemo(() => {
    const pending = requests.filter((r) => r.status === "pending").length;
    return { total: requests.length, pending };
  }, [requests]);

  const error = requestsError instanceof Error ? requestsError.message : requestsError ? "Failed to load budget requests" : null;

  const openReview = (request: BudgetRequestEntity, action: "approve" | "reject") => {
    setReviewTarget({ request, action });
    setReviewAmount(action === "approve" ? Number(request.requested_amount) : "");
    setReviewNote("");
    setActionError(null);
  };

  const closeReview = () => {
    if (submitting) return;
    setReviewTarget(null);
  };

  const handleReviewSubmit = async () => {
    if (!reviewTarget) return;
    setSubmitting(true);
    setActionError(null);

    try {
      const response = await fetch(withBasePath(`/api/budget-requests/${reviewTarget.request.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: reviewTarget.action,
          ...(reviewTarget.action === "approve" ? { amount: reviewAmount } : {}),
          note: reviewNote.trim() || undefined,
        }),
      });

      const json = (await response.json().catch(() => null)) as ApiResponse<BudgetRequestActionResult> | null;

      if (!response.ok) {
        throw new Error(json?.error ?? `Failed to ${reviewTarget.action} request (${response.status})`);
      }

      await Promise.all([
        refetch(),
        queryClient.invalidateQueries({ queryKey: ["budgets"] }),
        queryClient.invalidateQueries({ queryKey: ["budget-usage-map"] }),
      ]);
      setReviewTarget(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : `Failed to ${reviewTarget.action} request.`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Budget Requests</h1>
          <p className="text-muted-foreground mt-2">
            Review self-service budget requests and apply approved amounts to GitHub.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => void refetch()} disabled={loading}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardDescription>Total requests shown</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Awaiting review</CardDescription>
            <CardTitle className="text-3xl">{stats.pending}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {error && <ErrorMessage message={error} />}

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : requests.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No budget requests found.</p>
          ) : (
            <div className="divide-y">
              {requests.map((r) => (
                <div key={r.id} className="py-4 flex flex-wrap items-center gap-4">
                  <div className="flex-1 min-w-[220px]">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">@{r.requested_by}</span>
                      {statusBadge(r.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Requested {formatCurrency(r.requested_amount)} (had {formatCurrency(r.current_budget_amount)})
                    </p>
                    {r.reason && (
                      <p className="text-xs text-muted-foreground italic mt-1">&quot;{r.reason}&quot;</p>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <div>Submitted: {new Date(r.created_at).toLocaleString()}</div>
                    {r.reviewed_by && (
                      <div>
                        Reviewed by @{r.reviewed_by} on{" "}
                        {r.reviewed_at ? new Date(r.reviewed_at).toLocaleDateString() : "-"}
                      </div>
                    )}
                    {r.review_note && <div className="italic">Note: {r.review_note}</div>}
                  </div>
                  {r.status === "pending" && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => openReview(r, "approve")}>
                        Approve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openReview(r, "reject")}>
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(reviewTarget)} onOpenChange={(open) => (open ? undefined : closeReview())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewTarget?.action === "approve" ? "Approve budget request" : "Reject budget request"}
            </DialogTitle>
            <DialogDescription>
              {reviewTarget?.action === "approve"
                ? `This will create or update @${reviewTarget?.request.requested_by}'s user-scoped budget on GitHub.`
                : `This will reject @${reviewTarget?.request.requested_by}'s request without changing their budget.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {reviewTarget?.action === "approve" && (
              <div className="space-y-2">
                <label htmlFor="review-amount" className="text-sm font-medium">
                  Budget amount to apply (USD)
                </label>
                <Input
                  id="review-amount"
                  type="number"
                  min={1}
                  step={1}
                  value={reviewAmount}
                  onChange={(event) =>
                    setReviewAmount(event.target.value === "" ? "" : Number(event.target.value))
                  }
                />
                <p className="text-xs text-muted-foreground">Whole dollars only.</p>
                <p className="text-xs text-muted-foreground">
                  Requested amount was {reviewTarget ? formatCurrency(reviewTarget.request.requested_amount) : "-"}.
                  Adjust if needed before applying.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="review-note" className="text-sm font-medium">
                Note {reviewTarget?.action === "reject" ? "(shown to the requester)" : "(Optional)"}
              </label>
              <Input
                id="review-note"
                type="text"
                placeholder={reviewTarget?.action === "reject" ? "e.g. Already at team allocation limit" : "Optional note"}
                value={reviewNote}
                onChange={(event) => setReviewNote(event.target.value)}
              />
            </div>

            {actionError && <p className="text-sm text-destructive">{actionError}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={closeReview} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="button"
              variant={reviewTarget?.action === "reject" ? "destructive" : "default"}
              onClick={() => void handleReviewSubmit()}
              disabled={
                submitting ||
                (reviewTarget?.action === "approve" &&
                  (reviewAmount === "" || !Number.isInteger(reviewAmount) || reviewAmount <= 0))
              }
            >
              {submitting
                ? "Saving..."
                : reviewTarget?.action === "approve"
                  ? "Approve & Apply"
                  : "Reject request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
