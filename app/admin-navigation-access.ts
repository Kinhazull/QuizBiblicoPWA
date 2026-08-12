export type AdminNavigationAccess = { role: string; permissions?: string[] } | null;
type PermissionItem = { permissions?: string[]; requireAllPermissions?: boolean };
type PermissionGroup<T extends PermissionItem> = { items: T[] };

const leaderPermissions = new Set([
  "members.manage", "invitations.manage", "questions.edit", "questions.review",
  "rounds.manage", "reports.view", "audit.view",
  "content.manage", "events.manage", "operations.view", "privacy.manage", "economy.manage", "analytics.view",
]);

export function visibleAdminNavigation<T extends PermissionItem, G extends PermissionGroup<T>>(
  navigation: G[],
  access: AdminNavigationAccess,
): G[] {
  if (!access) return [];
  if (["owner", "admin"].includes(access.role)) return navigation;
  const permissions = new Set(access.role === "leader"
    ? [...leaderPermissions, ...(access.permissions || [])]
    : access.permissions || []);
  return navigation.map(group => ({
    ...group,
    items: group.items.filter(item => {
      if (!item.permissions?.length) return true;
      return item.requireAllPermissions
        ? item.permissions.every(permission => permissions.has(permission))
        : item.permissions.some(permission => permissions.has(permission));
    }),
  }));
}
