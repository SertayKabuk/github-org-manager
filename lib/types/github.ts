export type TeamPrivacy = "closed" | "secret";

export interface GitHubTeam {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  privacy: TeamPrivacy;
  members_count: number;
  repos_count: number;
  html_url: string;
  avatar_url?: string | null;
}

export interface GitHubMember {
  id: number;
  login: string;
  avatar_url: string;
  name?: string | null;
  role?: "admin" | "member" | "maintainer";
  type: string;
  teams?: { id: number; name: string; slug: string }[];
}

export interface GitHubOrganization {
  login: string;
  name: string | null;
  description: string | null;
  avatar_url: string;
  blog?: string | null;
  html_url: string;
  public_repos: number;
  public_gists: number;
  members?: number;
}

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  owner: {
    login: string;
  };
  html_url: string;
  description: string | null;
}

export interface TeamMembership {
  role: "member" | "maintainer";
}

export interface CreateTeamInput {
  name: string;
  description?: string;
  privacy?: TeamPrivacy;
  parent_team_id?: number;
}

export interface ApiResponse<T> {
  data: T;
  error?: string;
}

export type CostCenterState = "active" | "deleted";

export type CostCenterResourceType = "User" | "Repo" | "Organization";

export interface CostCenterResource {
  type: CostCenterResourceType;
  name: string;
}

export interface CostCenter {
  id: string;
  name: string;
  state: CostCenterState;
  azure_subscription?: string | null;
  resources: CostCenterResource[];
}

export interface CreateCostCenterInput {
  name: string;
}

export interface UpdateCostCenterInput {
  name: string;
}

export interface AddResourceToCostCenterInput {
  users?: string[];
  organizations?: string[];
  repositories?: string[];
}

export interface RemoveResourceFromCostCenterInput {
  users?: string[];
  organizations?: string[];
  repositories?: string[];
}

export interface ResourceReassignment {
  resource_type: string;
  name: string;
  previous_cost_center: string;
}

export type BudgetScope = "enterprise" | "organization" | "repository" | "cost_center";

export type BudgetType = "ProductPricing" | "SkuPricing" | "BundlePricing";

export interface BudgetAlerting {
  will_alert: boolean;
  alert_recipients: string[];
}

export interface Budget {
  id: string;
  budget_scope: BudgetScope;
  budget_entity_name?: string;
  budget_amount: number;
  prevent_further_usage: boolean;
  budget_type: BudgetType;
  budget_product_sku?: string;
  budget_alerting: BudgetAlerting;
}

export interface CreateBudgetInput {
  budget_amount: number;
  prevent_further_usage: boolean;
  budget_scope: BudgetScope;
  budget_entity_name?: string;
  budget_type: BudgetType;
  budget_product_sku: string;
  budget_alerting: BudgetAlerting;
}

export interface BudgetCreateResult {
  message: string;
  budget: Budget | null;
}

export interface BudgetDeleteResult {
  message: string;
  id: string;
}

export enum SkuName {
  copilot_agent_premium_request = "copilot_agent_premium_request",
  copilot_enterprise = "copilot_enterprise",
  copilot_for_business = "copilot_for_business",
  copilot_premium_request = "copilot_premium_request",
  copilot_standalone = "copilot_standalone",
  spark_premium_request = "spark_premium_request",
  models_inference = "models_inference",
}

// Billing usage summary types
export interface BillingTimePeriod {
  year: number;
  month: number;
}

export interface BillingCostCenterRef {
  id: string;
  name: string;
}

export interface BillingUsageItem {
  product: string;
  sku: string;
  grossQuantity: number;
  discountQuantity: number;
  netQuantity: number;
  grossAmount: number;
  discountAmount: number;
  netAmount: number;
  pricePerUnit: number;
  unitType: string;
}

export interface BillingUsageSummary {
  timePeriod: BillingTimePeriod;
  enterprise: string;
  costCenter?: BillingCostCenterRef | null;
  usageItems: BillingUsageItem[];
}

// Enterprise member types (from GraphQL API)
export type EnterpriseMemberType = "EnterpriseUserAccount" | "User";

export interface EnterpriseMember {
  id: string;
  login: string;
  type: EnterpriseMemberType;
}

// Invitation tracking types
export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'failed';

export interface Invitation {
  id: number;
  email: string;
  github_username: string | null;
  github_user_id: number | null;
  status: InvitationStatus;
  github_invitation_id: number | null;
  role: string;
  team_ids: number[] | null;
  inviter_login: string | null;
  inviter_id: number | null;
  invited_at: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

export interface CreateInvitationInput {
  email: string;
  role?: 'admin' | 'direct_member' | 'billing_manager';
  team_ids?: number[];
}
