'use client';

import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { AlertCircle, CheckCircle2, Clock, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ErrorMessage from "@/components/ui/ErrorMessage";
import { Input } from "@/components/ui/input";
import { Loading } from "@/components/ui/Loading";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMyBudgetRequestLimits, useMyBudgetRequests } from "@/lib/hooks";
import type { BudgetRequestEntity, BudgetRequestStatus } from "@/lib/entities/budget-request";
import type { ApiResponse } from "@/lib/types/github";
import { withBasePath } from "@/lib/utils";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
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

export function UserBudgetRequestSection() {
  const { data: limits, isLoading: limitsLoading, error: limitsError } = useMyBudgetRequestLimits();
  const {
    data: requests = [],
    isLoading: requestsLoading,
    error: requestsError,
    refetch: refetchRequests,
  } = useMyBudgetRequests();

  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const pendingRequest = useMemo(() => requests.find((r) => r.status === "pending"), [requests]);

  if (limitsLoading || requestsLoading) return <Loading />;
  if (limitsError || !limits) return <ErrorMessage message={limitsError?.message ?? "Failed to load budget limits."} />;

  const { current_budget: currentTotal, default_budget: defaultBudget, max, step, options: amountOptions } = limits;
  const atLimit = amountOptions.length === 0;
  const amount = selectedAmount !== null && amountOptions.includes(selectedAmount) ? selectedAmount : amountOptions[0];

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (amount === undefined) {
      setFormError("Select an amount to request.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(withBasePath("/api/me/budget-requests"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requested_amount: amount, reason: reason.trim() || undefined }),
      });

      const json = (await response.json().catch(() => null)) as ApiResponse<BudgetRequestEntity> | null;

      if (!response.ok) {
        throw new Error(json?.error ?? `Failed to submit request (${response.status})`);
      }

      setFormSuccess(`Request for ${formatCurrency(amount)} submitted for review.`);
      setReason("");
      await refetchRequests();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to submit request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Request a Budget Increase</CardTitle>
          <CardDescription>
            Request more budget in {formatCurrency(step)} increments, up to{" "}
            {formatCurrency(max)} total. An admin reviews every request before it takes effect.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Current budget: <span className="font-medium text-foreground">{formatCurrency(currentTotal)}</span>
            <span className="ml-2">(company default: {formatCurrency(defaultBudget)})</span>
          </p>

          {atLimit ? (
            <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
              <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
              <p>
                You already have {formatCurrency(currentTotal)} in budget, which meets or exceeds the{" "}
                {formatCurrency(max)} self-service limit, so you can&apos;t request
                more from here. Contact an admin if you need additional budget.
              </p>
            </div>
          ) : pendingRequest ? (
            <div className="flex items-start gap-3 rounded-lg border border-blue-500/30 bg-blue-500/10 p-4 text-sm">
              <Clock className="h-5 w-5 shrink-0 text-blue-600" />
              <p>
                You have a pending request for {formatCurrency(pendingRequest.requested_amount)} submitted on{" "}
                {new Date(pendingRequest.created_at).toLocaleDateString()}. Please wait for it to be reviewed
                before submitting another.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="request-amount" className="text-sm font-medium">
                    Requested total budget (USD)
                  </label>
                  <Select
                    value={amount !== undefined ? String(amount) : undefined}
                    onValueChange={(value) => setSelectedAmount(Number(value))}
                  >
                    <SelectTrigger id="request-amount" className="w-full">
                      <SelectValue placeholder="Select an amount" />
                    </SelectTrigger>
                    <SelectContent>
                      {amountOptions.map((option) => (
                        <SelectItem key={option} value={String(option)}>
                          {formatCurrency(option)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Choose a new total above your current {formatCurrency(currentTotal)}, in{" "}
                    {formatCurrency(step)} steps up to{" "}
                    {formatCurrency(max)}.
                  </p>
                </div>
                <div className="space-y-2">
                  <label htmlFor="request-reason" className="text-sm font-medium">
                    Reason (optional)
                  </label>
                  <Input
                    id="request-reason"
                    type="text"
                    placeholder="e.g. Ran out of AI credits this month"
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                  />
                </div>
              </div>

              {formError && <p className="text-sm text-destructive">{formError}</p>}
              {formSuccess && <p className="text-sm text-emerald-600">{formSuccess}</p>}

              <div className="flex justify-end">
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Submitting..." : "Submit request"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {requestsError ? (
        <ErrorMessage message={requestsError.message} />
      ) : requests.length > 0 ? (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Your request history</h4>
          <div className="divide-y rounded-lg border">
            {requests.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                <div className="flex items-center gap-2">
                  {statusBadge(r.status)}
                  <span className="font-medium">{formatCurrency(r.requested_amount)}</span>
                  <span className="text-muted-foreground">
                    on {new Date(r.created_at).toLocaleDateString()}
                  </span>
                </div>
                {r.status === "rejected" && r.review_note && (
                  <span className="text-xs text-muted-foreground italic">Reason: {r.review_note}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
