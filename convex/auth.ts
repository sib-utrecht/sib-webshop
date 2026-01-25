import type { QueryCtx, MutationCtx } from "./_generated/server";

/**
 * Check if the current user is authenticated and is a member of the "admins" group.
 * Throws an error if the user is not authenticated or not an admin.
 */
export async function requireAdmin(
  ctx: QueryCtx | MutationCtx
): Promise<void> {
  const identity = await ctx.auth.getUserIdentity();
  
  if (!identity) {
    throw new Error("Unauthorized: Must be logged in");
  }
  
  const groups = (identity as any)["cognito:groups"] || [];
  if (!groups.includes("admins")) {
    throw new Error("Forbidden: Admin privileges required");
  }
}

/**
 * Check if the current user is authenticated and is a member of the "admins" group.
 * Returns true if admin, false otherwise.
 */
export async function isAdmin(ctx: QueryCtx | MutationCtx): Promise<boolean> {
  try {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return false;
    }
    
    const groups = (identity as any)["cognito:groups"] || [];
    return groups.includes("admins");
  } catch {
    return false;
  }
}
