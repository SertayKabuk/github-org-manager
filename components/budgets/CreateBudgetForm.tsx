'use client';

import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { X } from "lucide-react";

import type { CreateBudgetInput, Budget } from "@/lib/types/github";
import { useMembers } from "@/lib/hooks";
import { SearchableCombobox } from "@/components/ui/searchable-combobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getSpentAmountForBudget } from "@/lib/budget-usage";
import { withBasePath } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CreateBudgetFormProps {
  onSubmit: (data: CreateBudgetInput & {
    transfer?: {
      fromUser: string;
      fromUserBudgetId: string;
      fromUserSpent: number;
      remaining: number;
    }
  }) => Promise<void> | void;
  onCancel: () => void;
  loading?: boolean;
  budgets: Budget[];
}

export default function CreateBudgetForm({ onSubmit, onCancel, loading = false, budgets }: CreateBudgetFormProps) {
  const { data: members = [], isLoading: membersLoading } = useMembers();

  const [form, setForm] = useState<CreateBudgetInput>({
    budget_amount: 29, // Default to 29 USD as per user's template
    prevent_further_usage: true,
    budget_scope: "user",
    budget_entity_name: "",
    budget_type: "BundlePricing",
    budget_product_sku: "ai_credits",
    budget_alerting: {
      will_alert: true,
      alert_recipients: ["SertayKabuk"], // Set default alert recipients from user's template
    },
    note: "",
  });
  
  const [recipientInput, setRecipientInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Transfer credit state variables
  const [isTransfer, setIsTransfer] = useState(false);
  const [fromUser, setFromUser] = useState("");
  const [fromUserLoading, setFromUserLoading] = useState(false);
  const [fromUserSpent, setFromUserSpent] = useState<number>(0);
  const [fromUserBudget, setFromUserBudget] = useState<Budget | null>(null);

  // Target user budget state variables
  const [targetUserBudget, setTargetUserBudget] = useState<Budget | null>(null);
  const [targetUserSpent, setTargetUserSpent] = useState<number>(0);
  const [targetUserLoading, setTargetUserLoading] = useState<boolean>(false);

  const targetUserLimit = useMemo(() => {
    if (!targetUserBudget) return 0;
    return targetUserBudget.budget_amount;
  }, [targetUserBudget]);

  const targetUserBalance = useMemo(() => {
    return Math.max(targetUserLimit - targetUserSpent, 0);
  }, [targetUserLimit, targetUserSpent]);

  const handleTargetUserChange = async (username: string) => {
    updateForm("budget_entity_name", username);
    if (!username) {
      setTargetUserBudget(null);
      setTargetUserSpent(0);
      return;
    }

    const existingBudget = budgets.find(
      (b) => b.budget_scope === "user" && b.budget_entity_name === username
    );

    if (existingBudget) {
      setTargetUserBudget(existingBudget);
    } else {
      // Look up global budget limit
      const globalBudget = budgets.find((b) => b.budget_scope === "multi_user_customer");
      const globalLimit = globalBudget ? globalBudget.budget_amount : 29;
      const globalAlerting = globalBudget ? globalBudget.budget_alerting : { will_alert: true, alert_recipients: ["SertayKabuk"] };
      const globalPreventFurtherUsage = globalBudget ? globalBudget.prevent_further_usage : true;
      setTargetUserBudget({
        id: "", // Empty string means no user-scoped budget to delete
        budget_scope: "user",
        budget_entity_name: username,
        budget_amount: globalLimit,
        prevent_further_usage: globalPreventFurtherUsage,
        budget_type: "BundlePricing",
        budget_product_sku: "ai_credits",
        budget_alerting: globalAlerting
      });
    }

    setTargetUserLoading(true);
    try {
      const response = await fetch(withBasePath(`/api/billing-usage?user=${encodeURIComponent(username)}`));
      if (response.ok) {
        const json = await response.json();
        const spent = getSpentAmountForBudget(
          { budget_product_sku: "ai_credits", budget_type: "BundlePricing" },
          json.data?.usageItems || []
        );
        setTargetUserSpent(spent);
      }
    } catch (err) {
      console.error("Failed to fetch usage for target user:", err);
    } finally {
      setTargetUserLoading(false);
    }
  };

  const memberOptions = useMemo(() => {
    return members.map((member) => ({
      value: member.login,
      label: member.name ? `${member.name} (@${member.login})` : `@${member.login}`,
      description: member.role ? `Role: ${member.role}` : undefined,
    }));
  }, [members]);

  const canSubmit = useMemo(() => {
    return (
      form.budget_amount >= 0 &&
      Boolean(form.budget_entity_name && form.budget_entity_name.trim().length > 0)
    );
  }, [form]);

  const remainingTransferAmount = useMemo(() => {
    if (!fromUserBudget) return 0;
    const limit = fromUserBudget.budget_amount;
    const spent = fromUserSpent;
    return Math.max(limit - spent, 0);
  }, [fromUserBudget, fromUserSpent]);

  const handleFromUserChange = async (username: string) => {
    setFromUser(username);
    if (!username) {
      setFromUserBudget(null);
      setFromUserSpent(0);
      return;
    }

    const existingBudget = budgets.find(
      (b) => b.budget_scope === "user" && b.budget_entity_name === username
    );

    if (existingBudget) {
      setFromUserBudget(existingBudget);
    } else {
      // Look up global budget limit
      const globalBudget = budgets.find((b) => b.budget_scope === "multi_user_customer");
      const globalLimit = globalBudget ? globalBudget.budget_amount : 29;
      const globalAlerting = globalBudget ? globalBudget.budget_alerting : { will_alert: true, alert_recipients: ["SertayKabuk"] };
      const globalPreventFurtherUsage = globalBudget ? globalBudget.prevent_further_usage : true;
      setFromUserBudget({
        id: "", // Empty string means no user-scoped budget to delete
        budget_scope: "user",
        budget_entity_name: username,
        budget_amount: globalLimit,
        prevent_further_usage: globalPreventFurtherUsage,
        budget_type: "BundlePricing",
        budget_product_sku: "ai_credits",
        budget_alerting: globalAlerting
      });
    }

    setFromUserLoading(true);
    try {
      const response = await fetch(withBasePath(`/api/billing-usage?user=${encodeURIComponent(username)}`));
      if (response.ok) {
        const json = await response.json();
        const spent = getSpentAmountForBudget(
          { budget_product_sku: "ai_credits", budget_type: "BundlePricing" },
          json.data?.usageItems || []
        );
        setFromUserSpent(spent);
      }
    } catch (err) {
      console.error("Failed to fetch usage for transfer source user:", err);
    } finally {
      setFromUserLoading(false);
    }
  };

  const updateForm = <K extends keyof CreateBudgetInput>(key: K, value: CreateBudgetInput[K]) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const updateAlerting = <K extends keyof CreateBudgetInput["budget_alerting"]>(
    key: K,
    value: CreateBudgetInput["budget_alerting"][K]
  ) => {
    setForm((prev) => ({
      ...prev,
      budget_alerting: {
        ...prev.budget_alerting,
        [key]: value,
      },
    }));
  };

  const handleAddRecipient = () => {
    const trimmed = recipientInput.trim();
    if (!trimmed) return;

    setRecipientInput("");
    updateAlerting("alert_recipients", Array.from(new Set([...form.budget_alerting.alert_recipients, trimmed])));
  };

  const handleRemoveRecipient = (recipient: string) => {
    updateAlerting(
      "alert_recipients",
      form.budget_alerting.alert_recipients.filter((value) => value !== recipient)
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSubmit) {
      setError("Username and budget amount are required.");
      return;
    }

    if (isTransfer) {
      if (!fromUser) {
        setError("Please select a user to transfer credit from.");
        return;
      }
      if (!fromUserBudget) {
        setError("The selected user does not have an active budget to transfer from.");
        return;
      }
    }

    setError(null);

    const submitData: any = {
      ...form,
      budget_amount: Number(form.budget_amount),
      budget_entity_name: form.budget_entity_name?.trim() ?? "",
      budget_product_sku: form.budget_product_sku.trim(),
    };

    if (isTransfer && fromUserBudget) {
      submitData.transfer = {
        fromUser,
        fromUserBudgetId: fromUserBudget.id || null,
        fromUserSpent,
        remaining: remainingTransferAmount,
        fromUserBudgetScope: fromUserBudget.budget_scope,
        fromUserAlerting: fromUserBudget.budget_alerting,
      };
    }

    await onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="budget-amount" className="text-sm font-medium">
            Base Budget amount (USD)
          </label>
          <Input
            id="budget-amount"
            type="number"
            min={0}
            step={1}
            value={form.budget_amount}
            onChange={(event) => updateForm("budget_amount", Number(event.target.value))}
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Prevent further usage</label>
          <Select
            value={form.prevent_further_usage ? "true" : "false"}
            onValueChange={(value) => updateForm("prevent_further_usage", value === "true")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Enabled</SelectItem>
              <SelectItem value="false">Disabled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 md:col-span-2">
          <label htmlFor="budget-entity" className="text-sm font-medium">
            New User (Username)
          </label>
          <SearchableCombobox
            options={memberOptions}
            value={form.budget_entity_name || ""}
            onValueChange={handleTargetUserChange}
            placeholder="Select target user..."
            searchPlaceholder="Search enterprise members..."
            emptyText="No members found."
            loading={membersLoading || targetUserLoading}
          />
        </div>

        {form.budget_entity_name && (
          <div className="space-y-2 md:col-span-2">
            <div className="text-xs space-y-1 bg-muted/20 p-3 rounded-lg border">
              {targetUserLoading ? (
                <p className="text-muted-foreground animate-pulse">Calculating balance...</p>
              ) : targetUserBudget ? (
                <>
                  <p className="flex justify-between">
                    <span className="text-muted-foreground">Current Budget Limit:</span>{" "}
                    <span className="font-mono font-medium">
                      ${targetUserLimit.toFixed(2)}
                      {targetUserBudget.id === "" ? " (Global Fallback)" : " (User Specific)"}
                    </span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-muted-foreground">Current Spent:</span>{" "}
                    <span className="font-mono font-medium">${targetUserSpent.toFixed(2)}</span>
                  </p>
                  <p className="flex justify-between font-medium text-emerald-600 border-t pt-1 mt-1">
                    <span>Remaining Balance:</span>{" "}
                    <span className="font-mono font-semibold">
                      ${targetUserBalance.toFixed(2)}
                    </span>
                  </p>
                </>
              ) : null}
            </div>
          </div>
        )}

        {/* Transfer credits toggle */}
        <div className="flex items-center space-x-2 md:col-span-2 pt-2 border-t mt-2">
          <input
            id="is-transfer"
            type="checkbox"
            checked={isTransfer}
            onChange={(e) => setIsTransfer(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
          <label htmlFor="is-transfer" className="text-sm font-medium select-none cursor-pointer">
            Transfer remaining credits from another user
          </label>
        </div>

        {isTransfer && (
          <div className="space-y-4 md:col-span-2 border rounded-lg p-4 bg-muted/20">
            <div className="space-y-2">
              <label className="text-sm font-medium">Transfer From User</label>
              <SearchableCombobox
                options={memberOptions.filter(o => o.value !== form.budget_entity_name)}
                value={fromUser}
                onValueChange={handleFromUserChange}
                placeholder="Select user to transfer from..."
                searchPlaceholder="Search members..."
                emptyText="No members found."
                loading={membersLoading || fromUserLoading}
              />
            </div>

            {fromUser && (
              <div className="text-xs space-y-1 bg-background p-3 rounded border">
                {fromUserBudget ? (
                  <>
                    <p>
                      Current Budget:{" "}
                      <span className="font-mono font-medium">
                        ${fromUserBudget.budget_amount.toFixed(2)}
                      </span>
                    </p>
                    <p>
                      Current Spent:{" "}
                      <span className="font-mono font-medium">${fromUserSpent.toFixed(2)}</span>
                    </p>
                    <p className="font-medium text-blue-600 mt-1">
                      Remaining credit to transfer:{" "}
                      <span className="font-mono font-semibold">
                        ${remainingTransferAmount.toFixed(2)}
                      </span>
                    </p>
                  </>
                ) : (
                  <p className="text-destructive font-medium">
                    This user does not have an active AI credits budget to transfer from.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="budget-note" className="text-sm font-medium">
          Note / Reason (Optional)
        </label>
        <Input
          id="budget-note"
          type="text"
          placeholder="e.g. Initial allocation for Q3, or credit transfer due to team change..."
          value={form.note || ""}
          onChange={(event) => updateForm("note", event.target.value)}
        />
      </div>

      <div className="space-y-3">
        <label className="text-sm font-medium">Alerting</label>
        <Select
          value={form.budget_alerting.will_alert ? "true" : "false"}
          onValueChange={(value) => updateAlerting("will_alert", value === "true")}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">Send alerts</SelectItem>
            <SelectItem value="false">No alerts</SelectItem>
          </SelectContent>
        </Select>
        {form.budget_alerting.will_alert && (
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
            {form.budget_alerting.alert_recipients.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {form.budget_alerting.alert_recipients.map((recipient) => (
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

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading || !canSubmit || (isTransfer && !fromUserBudget)}>
          {loading ? "Creating..." : isTransfer ? "Transfer & Create" : "Create Budget"}
        </Button>
      </div>
    </form>
  );
}
