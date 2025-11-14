'use client';

import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { X } from "lucide-react";

import type {
  BudgetScope,
  BudgetType,
  CreateBudgetInput,
} from "@/lib/types/github";
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

const scopeOptions: { label: string; value: BudgetScope }[] = [
  { label: "Enterprise", value: "enterprise" },
  { label: "Organization", value: "organization" },
  { label: "Repository", value: "repository" },
  { label: "Cost Center", value: "cost_center" },
];

const typeOptions: { label: string; value: BudgetType }[] = [
  { label: "Product Pricing", value: "ProductPricing" },
  { label: "SKU Pricing", value: "SkuPricing" },
];

interface CreateBudgetFormProps {
  onSubmit: (data: CreateBudgetInput) => Promise<void> | void;
  onCancel: () => void;
  loading?: boolean;
}

export default function CreateBudgetForm({ onSubmit, onCancel, loading = false }: CreateBudgetFormProps) {
  const [form, setForm] = useState<CreateBudgetInput>({
    budget_amount: 100,
    prevent_further_usage: true,
    budget_scope: "enterprise",
    budget_entity_name: "",
    budget_type: "ProductPricing",
    budget_product_sku: "actions",
    budget_alerting: {
      will_alert: false,
      alert_recipients: [],
    },
  });
  const [recipientInput, setRecipientInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => form.budget_product_sku.trim().length > 0 && form.budget_amount >= 0, [form]);

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
      setError("Budget amount and SKU are required.");
      return;
    }

    setError(null);

    await onSubmit({
      ...form,
      budget_amount: Number(form.budget_amount),
      budget_entity_name: form.budget_entity_name?.trim() ?? "",
      budget_product_sku: form.budget_product_sku.trim(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="budget-amount" className="text-sm font-medium">
            Budget amount (USD)
          </label>
          <Input
            id="budget-amount"
            type="number"
            min={0}
            step={50}
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
        <div className="space-y-2">
          <label className="text-sm font-medium">Budget scope</label>
          <Select value={form.budget_scope} onValueChange={(value) => updateForm("budget_scope", value as BudgetScope)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {scopeOptions.map((scope) => (
                <SelectItem key={scope.value} value={scope.value}>
                  {scope.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Budget type</label>
          <Select value={form.budget_type} onValueChange={(value) => updateForm("budget_type", value as BudgetType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {typeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 md:col-span-2">
          <label htmlFor="budget-entity" className="text-sm font-medium">
            Entity name (optional)
          </label>
          <Input
            id="budget-entity"
            placeholder="e.g. octo-org or octo-org/octo-repo"
            value={form.budget_entity_name}
            onChange={(event) => updateForm("budget_entity_name", event.target.value)}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <label htmlFor="budget-sku" className="text-sm font-medium">
            Product SKU
          </label>
          <Input
            id="budget-sku"
            placeholder="e.g. actions"
            value={form.budget_product_sku}
            onChange={(event) => updateForm("budget_product_sku", event.target.value)}
            required
          />
        </div>
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
        <Button type="submit" disabled={loading || !canSubmit}>
          {loading ? "Creating..." : "Create Budget"}
        </Button>
      </div>
    </form>
  );
}
