/**
 * Selectwise Role-Based Access Control (RBAC).
 *
 * Single source of truth for the role hierarchy and the list of capabilities
 * each role grants. Both server-side guards and client-side UI gating import
 * from this module so behavior cannot drift between layers.
 */

export const ROLES = ["super_admin", "admin", "sub_admin", "coach", "user"] as const;
export type Role = (typeof ROLES)[number];

/** Strictly-ordered hierarchy. Higher index = lower privilege. */
const ROLE_RANK: Record<Role, number> = {
  super_admin: 0,
  admin: 1,
  sub_admin: 2,
  coach: 3,
  user: 4,
};

/**
 * Capabilities are named per-feature. Keep them granular so we can grow the
 * matrix without adding new role tiers. UI labels live next to the matrix
 * below so the admin "Roles" page can render docs straight from this file.
 */
export const PERMISSIONS = [
  // Overview
  "overview.view",

  // Users
  "users.view",
  "users.update",
  "users.suspend",
  "users.delete",

  // Admin team & role assignment
  "team.view",
  "team.invite",
  "team.remove",
  "role.assign.sub_admin",
  "role.assign.admin",
  "role.assign.super_admin",

  // Coaches
  "coaches.view",
  "coaches.create",
  "coaches.update",
  "coaches.delete",

  // Sessions / Reports
  "sessions.view",
  "sessions.delete",
  "reports.view",

  // Bookings
  "bookings.view",
  "bookings.cancel",
  "bookings.reschedule",

  // Revenue / refunds
  "payments.view",
  "refunds.view",
  "refunds.manage",
  "support.view",
  "support.manage",

  // Analytics
  "analytics.freshers_vs_professionals",
  "analytics.conversion",
  "analytics.lead_sources",

  // Settings & content
  "settings.view",
  "settings.update",
  "announcements.update",

  // Audit
  "audit.view",
  "audit.export",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const SUPER_ADMIN_PERMISSIONS: Permission[] = [...PERMISSIONS];

const ADMIN_PERMISSIONS: Permission[] = [
  "overview.view",
  "users.view",
  "users.update",
  "users.suspend",
  "team.view",
  "role.assign.sub_admin",
  "coaches.view",
  "coaches.create",
  "coaches.update",
  "coaches.delete",
  "sessions.view",
  "reports.view",
  "bookings.view",
  "bookings.cancel",
  "bookings.reschedule",
  "payments.view",
  "refunds.view",
  "refunds.manage",
  "support.view",
  "support.manage",
  "analytics.freshers_vs_professionals",
  "analytics.conversion",
  "analytics.lead_sources",
  "settings.view",
  "announcements.update",
  "audit.view",
];

const SUB_ADMIN_PERMISSIONS: Permission[] = [
  "overview.view",
  "users.view",
  "coaches.view",
  "sessions.view",
  "reports.view",
  "bookings.view",
  "bookings.reschedule",
  "payments.view",
  "refunds.view",
  "support.view",
  "analytics.freshers_vs_professionals",
  "analytics.conversion",
  "analytics.lead_sources",
  "settings.view",
];

const COACH_PERMISSIONS: Permission[] = [];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  super_admin: SUPER_ADMIN_PERMISSIONS,
  admin: ADMIN_PERMISSIONS,
  sub_admin: SUB_ADMIN_PERMISSIONS,
  coach: COACH_PERMISSIONS,
  user: [],
};

export function isAdminRole(role: string | null | undefined): boolean {
  return role === "super_admin" || role === "admin" || role === "sub_admin";
}

export function isCoachRole(role: string | null | undefined): boolean {
  return role === "coach";
}

export function normalizeRole(role: string | null | undefined): Role {
  if (
    role === "super_admin" ||
    role === "admin" ||
    role === "sub_admin" ||
    role === "coach"
  ) {
    return role;
  }
  // legacy: some accounts already exist with role "admin" — keep as-is.
  return "user";
}

export function hasPermission(
  role: string | null | undefined,
  permission: Permission,
): boolean {
  if (!role) return false;
  const list = ROLE_PERMISSIONS[role as Role];
  if (!list) return false;
  return list.includes(permission);
}

export function hasAnyPermission(
  role: string | null | undefined,
  permissions: Permission[],
): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

/**
 * Whether `actor` is allowed to assign `target` role.
 * Super-admins can assign anything. Admins can only assign `sub_admin`.
 * Nobody can assign a role >= their own.
 */
export function canAssignRole(actor: Role, target: Role): boolean {
  if (ROLE_RANK[target] < ROLE_RANK[actor]) return false;
  if (target === "super_admin") return hasPermission(actor, "role.assign.super_admin");
  if (target === "admin") return hasPermission(actor, "role.assign.admin");
  if (target === "sub_admin") return hasPermission(actor, "role.assign.sub_admin");
  return true; // demoting to "user" is allowed for any admin tier
}

/**
 * Whether `actor` is allowed to act on a user with `targetRole`.
 * Prevents an admin from suspending/deleting a peer or super-admin.
 */
export function canActOnRole(actor: Role, targetRole: Role): boolean {
  if (actor === "super_admin") return true;
  return ROLE_RANK[actor] < ROLE_RANK[targetRole];
}

export function roleLabel(role: Role | string | null | undefined): string {
  switch (role) {
    case "super_admin":
      return "Super Admin";
    case "admin":
      return "Admin";
    case "sub_admin":
      return "Sub Admin";
    case "user":
      return "User";
    case "coach":
      return "Coach";
    default:
      return "Unknown";
  }
}

export function roleTone(
  role: Role | string | null | undefined,
): "accent" | "success" | "warn" | "neutral" {
  switch (role) {
    case "super_admin":
      return "accent";
    case "admin":
      return "success";
    case "sub_admin":
      return "warn";
    case "coach":
      return "neutral";
    default:
      return "neutral";
  }
}
