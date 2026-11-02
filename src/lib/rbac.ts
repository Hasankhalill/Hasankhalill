export const ROLES = ["OWNER", "ADMINISTRATOR", "INVENTORY_MANAGER", "ORDER_MANAGER", "CUSTOMER"] as const;
export type Role = (typeof ROLES)[number];

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

export type Actor = { id: string; email: string; role: Role; disabled?: boolean };

export function canManageCatalog(role: Role) {
  return role === "OWNER" || role === "ADMINISTRATOR" || role === "INVENTORY_MANAGER";
}

export function canManageOrders(role: Role) {
  return role === "OWNER" || role === "ADMINISTRATOR" || role === "ORDER_MANAGER";
}

export function canViewOrders(role: Role) {
  return canManageOrders(role) || role === "INVENTORY_MANAGER";
}

export function canManageContent(role: Role) {
  return role === "OWNER" || role === "ADMINISTRATOR";
}

export function canManageCoupons(role: Role) {
  return role === "OWNER" || role === "ADMINISTRATOR";
}

export function canManageShipping(role: Role) {
  return role === "OWNER" || role === "ADMINISTRATOR" || role === "ORDER_MANAGER";
}

export function canManageCustomers(role: Role) {
  return role === "OWNER" || role === "ADMINISTRATOR" || role === "ORDER_MANAGER";
}

export function canManageStaff(role: Role) {
  return role === "OWNER";
}

export function canRefund(role: Role) {
  return canManageOrders(role);
}
