'use client';

import { useState } from "react";
import type { FormEvent } from "react";
import { X } from "lucide-react";

import type { Budget, UpdateBudgetInput } from "@/lib/types/github";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EditBudgetFormProps {
  budget: Budget;
  onSubmit: (data: UpdateBudgetInput) => Promise<void> | void;
  onCancel: () => void;
  loading?: boolean;
}

export default function EditBudgetForm({ budget, onSubmit, onCancel, loading = false }: EditBudgetFormProps) {
  const isUserScope = budget.budget_scope === "user";

  const [amount, setAmount] = useState(budget.budget_amount);
  const [preventFurtherUsage, setPreventFurtherUsage] = useState(budget.prevent_further_usage);
  const [willAlert, setWillAlert] = useState(budget.budget_alerting.will_alert);
  const [alertRecipients, setAlertRecipients] = useState<string[]>(budget.budget_alerting.alert_recipients);
  const [recipientInput, setRecipientInput] = useState("");
  const [expiresAt, setExpiresAt] = useState(budget.expires_at ?? "");
  const [error, setError] = useState<string | null>(null);

  const handleAddRecipient = () => {
    const trimmed = recipientInput.trim();
    if (!trimmed) return;

    setRecipientInput("");
    setAlertRecipients((prev) => Array.from(new Set([...prev, trimmed])));
  };

  const handleRemoveRecipient = (recipient: string) => {
    setAlertRecipients((prev) => prev.filter((value) => value !== recipient));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!Number.isFinite(amount) || amount < 0) {
      setError("Budget amount must be a non-negative number.");
      return;
    }

    setError(null);

    const data: UpdateBudgetInput = {
      budget_amount: Number(amount),
      // Must remain true for user-scoped budgets per the GitHub API.
      prevent_further_usage: isUserScope ? true : preventFurtherUsage,
    };

    if (isUserScope) {
      data.expires_at = expiresAt.trim() ? expiresAt.trim() : null;
    } else {
      data.budget_alerting = {
        will_alert: willAlert,
        alert_recipients: alertRecipients,
      };
    }

    await onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="edit-budget-amount" className="text-sm font-medium">
            Budget amount (USD)
          </label>
          <Input
            id="edit-budget-amount"
            type="number"
            min={0}
            step={1}
            value={amount}
            onChange={(event) => setAmount(Number(event.target.value))}
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Prevent further usage</label>
          {isUserScope ? (
            <p className="flex h-9 items-center text-sm text-muted-foreground">
              Always enabled for user-scoped budgets
            </p>
          ) : (
            <Select
              value={preventFurtherUsage ? "true" : "false"}
              onValueChange={(value) => setPreventFurtherUsage(value === "true")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Enabled</SelectItem>
                <SelectItem value="false">Disabled</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {isUserScope ? (
        <div className="space-y-2">
          <label htmlFor="edit-budget-expires-at" className="text-sm font-medium">
            Expires on (Optional)
          </label>
          <Input
            id="edit-budget-expires-at"
            type="date"
            min={new Date().toISOString().slice(0, 10)}
            value={expiresAt}
            onChange={(event) => setExpiresAt(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Leave blank to clear the expiration. Alerting is not available for user-scoped budgets.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <label className="text-sm font-medium">Alerting</label>
          <Select
            value={willAlert ? "true" : "false"}
            onValueChange={(value) => setWillAlert(value === "true")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Send alerts</SelectItem>
              <SelectItem value="false">No alerts</SelectItem>
            </SelectContent>
          </Select>
          {willAlert && (
            <div className="space-y-2">
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  placeholder="Add GitHub username"
                  value={recipientInput}
                  onChange={(event) => setRecipientInput(event.target.value)}
                />
                <Button type="button" onClick={handleAddRecipient} disabled={!recipientInput.trim()}>
                  Add recipient
                </Button>
              </div>
              {alertRecipients.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {alertRecipients.map((recipient) => (
                    <Badge key={recipient} variant="secondary" className="flex items-center gap-2">
                      @{recipient}
                      <button
                        type="button"
                        onClick={() => handleRemoveRecipient(recipient)}
                        className="rounded-full p-1 text-muted-foreground hover:bg-background"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
