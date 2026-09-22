/**
 * Repository for budget request database operations.
 * Encapsulates all database queries related to self-service budget requests.
 */
import { query } from "@/lib/db";
import type {
  BudgetRequestEntity,
  BudgetRequestStatus,
  CreateBudgetRequestEntity,
} from "@/lib/entities/budget-request";

/**
 * Get all budget requests, optionally filtered by status.
 */
export async function findAll(status?: string): Promise<BudgetRequestEntity[]> {
  if (status && status !== "all") {
    return query<BudgetRequestEntity>(
      "SELECT * FROM budget_requests WHERE status = $1 ORDER BY created_at DESC",
      [status]
    );
  }
  return query<BudgetRequestEntity>("SELECT * FROM budget_requests ORDER BY created_at DESC");
}

/**
 * Get all budget requests submitted by a given GitHub login.
 */
export async function findByRequester(login: string): Promise<BudgetRequestEntity[]> {
  return query<BudgetRequestEntity>(
    "SELECT * FROM budget_requests WHERE requested_by = $1 ORDER BY created_at DESC",
    [login]
  );
}

/**
 * Find the most recent pending request from a given GitHub login, if any.
 */
export async function findPendingByRequester(login: string): Promise<BudgetRequestEntity | null> {
  const results = await query<BudgetRequestEntity>(
    "SELECT * FROM budget_requests WHERE requested_by = $1 AND status = 'pending' ORDER BY created_at DESC LIMIT 1",
    [login]
  );
  return results[0] || null;
}

/**
 * Find a budget request by id.
 */
export async function findById(id: number): Promise<BudgetRequestEntity | null> {
  const results = await query<BudgetRequestEntity>(
    "SELECT * FROM budget_requests WHERE id = $1",
    [id]
  );
  return results[0] || null;
}

/**
 * Create a new pending budget request.
 */
export async function create(entity: CreateBudgetRequestEntity): Promise<BudgetRequestEntity> {
  const results = await query<BudgetRequestEntity>(
    `INSERT INTO budget_requests (requested_by, requested_amount, current_budget_amount, reason)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [entity.requested_by, entity.requested_amount, entity.current_budget_amount, entity.reason || null]
  );
  return results[0];
}

/**
 * Mark a pending request as approved or rejected. No-ops (returns null) if the
 * request is no longer pending, to avoid double-reviewing the same request.
 */
export async function review(
  id: number,
  status: Extract<BudgetRequestStatus, "approved" | "rejected">,
  reviewedBy: string,
  options: { note?: string | null; resultingBudgetId?: string | null } = {}
): Promise<BudgetRequestEntity | null> {
  const results = await query<BudgetRequestEntity>(
    `UPDATE budget_requests
     SET status = $1, reviewed_by = $2, reviewed_at = NOW(), review_note = $3, resulting_budget_id = $4
     WHERE id = $5 AND status = 'pending'
     RETURNING *`,
    [status, reviewedBy, options.note || null, options.resultingBudgetId || null, id]
  );
  return results[0] || null;
}
