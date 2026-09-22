/**
 * Budget request entity types for database operations.
 * These types represent the budget_requests table in the database.
 */

export type BudgetRequestStatus = 'pending' | 'approved' | 'rejected';

/**
 * Budget request entity as returned by the API (JSON over the wire).
 */
export interface BudgetRequestEntity {
  id: number;
  requested_by: string;
  requested_amount: number;
  current_budget_amount: number;
  reason: string | null;
  status: BudgetRequestStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  resulting_budget_id: string | null;
  created_at: string;
}

/**
 * Data required to create a new budget request.
 */
export interface CreateBudgetRequestEntity {
  requested_by: string;
  requested_amount: number;
  current_budget_amount: number;
  reason?: string | null;
}
