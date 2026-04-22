'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Save, ShieldCheck, Trash2, Webhook } from 'lucide-react';

import { withBasePath } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import ErrorMessage from '@/components/ui/ErrorMessage';
import type { ApiResponse } from '@/lib/types/github';

interface AccessAutomationRuleForm {
  id?: number;
  ruleName: string;
  targetOrg: string;
  targetTeamSlug: string;
  targetTeamId: string;
  targetUsername: string;
  enableGrantOnAdd: boolean;
  enableRevokeOnRemove: boolean;
  enableRevokeOnTeamMemberRemove: boolean;
  dryRun: boolean;
  repositoryAllowlist: string;
  repositoryDenylist: string;
}

interface AccessAutomationSettingsForm {
  rules: AccessAutomationRuleForm[];
}

const EMPTY_RULE: AccessAutomationRuleForm = {
  ruleName: '',
  targetOrg: '',
  targetTeamSlug: '',
  targetTeamId: '',
  targetUsername: '',
  enableGrantOnAdd: true,
  enableRevokeOnRemove: false,
  enableRevokeOnTeamMemberRemove: false,
  dryRun: false,
  repositoryAllowlist: '',
  repositoryDenylist: '',
};

const EMPTY_FORM: AccessAutomationSettingsForm = {
  rules: [],
};

function Field({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-2">
      <div>
        <div className="text-sm font-medium">{label}</div>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </label>
  );
}

export default function AccessAutomationPage() {
  const [form, setForm] = useState<AccessAutomationSettingsForm>(EMPTY_FORM);
  const [initialForm, setInitialForm] = useState<AccessAutomationSettingsForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(withBasePath('/api/admin/access-automation'));
        const data: ApiResponse<AccessAutomationSettingsForm> = await response.json();

        if (!response.ok || data.error) {
          throw new Error(data.error ?? 'Failed to load access automation settings.');
        }

        if (!cancelled) {
          setForm(data.data);
          setInitialForm(data.data);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load settings.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadSettings();

    return () => {
      cancelled = true;
    };
  }, []);

  const isDirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(initialForm), [form, initialForm]);

  function updateRule<K extends keyof AccessAutomationRuleForm>(
    index: number,
    key: K,
    value: AccessAutomationRuleForm[K]
  ) {
    setForm((current) => ({
      ...current,
      rules: current.rules.map((rule, ruleIndex) =>
        ruleIndex === index ? { ...rule, [key]: value } : rule
      ),
    }));
  }

  function addRule() {
    setForm((current) => ({
      ...current,
      rules: [...current.rules, { ...EMPTY_RULE }],
    }));
    setError(null);
    setSuccess(null);
  }

  function removeRule(index: number) {
    setForm((current) => ({
      ...current,
      rules: current.rules.filter((_, ruleIndex) => ruleIndex !== index),
    }));
    setError(null);
    setSuccess(null);
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(withBasePath('/api/admin/access-automation'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });

      const data: ApiResponse<AccessAutomationSettingsForm> = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error ?? 'Failed to save settings.');
      }

      setForm(data.data);
      setInitialForm(data.data);
      setSuccess('Access automation settings saved successfully.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Access Automation</h1>
        <p className="mt-2 text-muted-foreground">
          Manage webhook-driven repository admin grants from the UI instead of environment variables.
        </p>
      </div>

      <Alert>
        <Webhook className="h-4 w-4" />
        <AlertTitle>How this works</AlertTitle>
        <AlertDescription>
          GitHub still sends webhook deliveries to the app, the webhook secret stays in server environment variables, and the automation rule list lives in the database. Each rule can target a different org/team/user combination.
        </AlertDescription>
      </Alert>

      <Alert>
        <ShieldCheck className="h-4 w-4" />
        <AlertTitle>Webhook secret source</AlertTitle>
        <AlertDescription>
          The webhook secret is not editable here. Set <code>GITHUB_WEBHOOK_SECRET</code> or <code>WEBHOOK_SECRET</code> in the server environment.
        </AlertDescription>
      </Alert>

      {error ? <ErrorMessage message={error} onDismiss={() => setError(null)} /> : null}
      {success ? (
        <Alert>
          <ShieldCheck className="h-4 w-4" />
          <AlertTitle>Saved</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      ) : null}

      <form className="space-y-6" onSubmit={handleSave}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Automation rules</h2>
            <p className="text-sm text-muted-foreground">Create as many rules as you need. Each rule can target a different team and user.</p>
          </div>
          <Button type="button" variant="outline" onClick={addRule} disabled={loading || saving}>
            <Plus className="mr-2 h-4 w-4" />
            Add rule
          </Button>
        </div>

        {form.rules.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No rules yet. Add your first automation rule to start managing multiple team/user mappings.
            </CardContent>
          </Card>
        ) : null}

        {form.rules.map((rule, index) => (
          <Card key={rule.id ?? `new-${index}`}>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>Rule {index + 1}</CardTitle>
                  <CardDescription>
                    Configure one org/team/user mapping and its grant/revoke behavior.
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeRule(index)}
                  disabled={loading || saving}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <Field label="Rule name" description="A friendly name to identify this rule in the UI and webhook logs.">
                  <Input
                    value={rule.ruleName}
                    onChange={(event) => updateRule(index, 'ruleName', event.target.value)}
                    disabled={loading || saving}
                  />
                </Field>

                <Field label="Target organization" description="Only webhook events from this organization will match this rule.">
                  <Input
                    value={rule.targetOrg}
                    onChange={(event) => updateRule(index, 'targetOrg', event.target.value)}
                    disabled={loading || saving}
                  />
                </Field>

                <Field label="Target team slug" description="Exact team slug to watch. Leave blank if you prefer team ID matching only.">
                  <Input
                    value={rule.targetTeamSlug}
                    onChange={(event) => updateRule(index, 'targetTeamSlug', event.target.value)}
                    disabled={loading || saving}
                  />
                </Field>

                <Field label="Target team ID" description="Optional numeric team ID for stricter matching.">
                  <Input
                    inputMode="numeric"
                    value={rule.targetTeamId}
                    onChange={(event) => updateRule(index, 'targetTeamId', event.target.value)}
                    disabled={loading || saving}
                  />
                </Field>

                <Field label="Target GitHub username" description="This user receives direct admin access when a repository is linked to the target team for this rule.">
                  <Input
                    value={rule.targetUsername}
                    onChange={(event) => updateRule(index, 'targetUsername', event.target.value)}
                    disabled={loading || saving}
                  />
                </Field>
              </div>

              <div className="grid gap-4">
                <label className="flex items-start gap-3 rounded-lg border p-4">
                  <Checkbox
                    checked={rule.enableGrantOnAdd}
                    onCheckedChange={(checked) => updateRule(index, 'enableGrantOnAdd', checked === true)}
                    disabled={loading || saving}
                  />
                  <div>
                    <div className="font-medium">Grant admin when repo is added to team</div>
                    <p className="text-sm text-muted-foreground">Handles both <code>team.added_to_repository</code> and <code>team_add</code>.</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 rounded-lg border p-4">
                  <Checkbox
                    checked={rule.enableRevokeOnRemove}
                    onCheckedChange={(checked) => updateRule(index, 'enableRevokeOnRemove', checked === true)}
                    disabled={loading || saving}
                  />
                  <div>
                    <div className="font-medium">Revoke direct access when repo is removed from team</div>
                    <p className="text-sm text-muted-foreground">Uses <code>team.removed_from_repository</code> when enabled.</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 rounded-lg border p-4">
                  <Checkbox
                    checked={rule.enableRevokeOnTeamMemberRemove}
                    onCheckedChange={(checked) => updateRule(index, 'enableRevokeOnTeamMemberRemove', checked === true)}
                    disabled={loading || saving}
                  />
                  <div>
                    <div className="font-medium">Revoke across all team repos if user is removed from the team</div>
                    <p className="text-sm text-muted-foreground">Runs a sweep across repositories attached to the configured team.</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 rounded-lg border p-4">
                  <Checkbox
                    checked={rule.dryRun}
                    onCheckedChange={(checked) => updateRule(index, 'dryRun', checked === true)}
                    disabled={loading || saving}
                  />
                  <div>
                    <div className="font-medium">Dry-run mode</div>
                    <p className="text-sm text-muted-foreground">Logs intended changes without calling the collaborator API.</p>
                  </div>
                </label>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <Field label="Allowlist" description="If empty, all repositories are allowed unless denylisted.">
                  <textarea
                    className="min-h-40 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    value={rule.repositoryAllowlist}
                    onChange={(event) => updateRule(index, 'repositoryAllowlist', event.target.value)}
                    disabled={loading || saving}
                  />
                </Field>

                <Field label="Denylist" description="These repositories are always ignored, even if allowlisted.">
                  <textarea
                    className="min-h-40 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    value={rule.repositoryDenylist}
                    onChange={(event) => updateRule(index, 'repositoryDenylist', event.target.value)}
                    disabled={loading || saving}
                  />
                </Field>
              </div>
            </CardContent>
          </Card>
        ))}

        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={!isDirty || loading || saving}
            onClick={() => {
              setForm(initialForm);
              setError(null);
              setSuccess(null);
            }}
          >
            Reset
          </Button>
          <Button type="submit" disabled={loading || saving || !isDirty}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save settings
          </Button>
        </div>
      </form>
    </div>
  );
}