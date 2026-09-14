import { getPersistenceReadiness } from "./env";

export const INTERNAL_ROLES = ["owner", "tuner", "staff"];
export const PRINCIPAL_TYPES = ["internal", "customer", "system"];

export const PERMISSIONS = {
  "dashboard.read": ["owner", "tuner", "staff"],
  "customer.read": ["owner", "tuner", "staff"],
  "customer.write": ["owner", "tuner", "staff"],
  "vehicle.read": ["owner", "tuner", "staff"],
  "vehicle.write": ["owner", "tuner", "staff"],
  "project.read": ["owner", "tuner", "staff"],
  "project.write": ["owner", "tuner"],
  "revision.create": ["owner", "tuner"],
  "revision.publish": ["owner", "tuner"],
  "log.review": ["owner", "tuner"],
  "file.internal.read": ["owner", "tuner", "staff"],
  "file.internal.write": ["owner", "tuner"],
  "file.customer.read": ["owner", "tuner", "staff", "customer"],
  "file.customer.write": ["owner", "tuner", "customer"],
  "message.send": ["owner", "tuner", "staff"],
  "automation.manage": ["owner", "tuner"],
  "integration.manage": ["owner"],
  "user.manage": ["owner"],
};

export const demoPrincipals = {
  doug: {
    id: "demo_doug_talmadge",
    type: "internal",
    role: "owner",
    displayName: "Doug Talmadge",
    email: "doug@subpartuning.example",
  },
  tuner: {
    id: "demo_tuner",
    type: "internal",
    role: "tuner",
    displayName: "Subpar Tuner",
    email: "tuner@subpartuning.example",
  },
  staff: {
    id: "demo_staff",
    type: "internal",
    role: "staff",
    displayName: "Subpar Staff",
    email: "staff@subpartuning.example",
  },
  alex: {
    id: "demo_customer_alex",
    type: "customer",
    role: "customer",
    displayName: "Alex Rivera",
    email: "alex.rivera@gmail.com",
    customerId: "cus_alex-rivera",
    projectNumbers: ["SP-1842"],
  },
};

export function can(principal, permission) {
  if (!principal) return false;
  if (principal.type === "system") return true;
  const allowed = PERMISSIONS[permission] || [];
  return allowed.includes(principal.role);
}

export function canAccessCustomer(principal, customerId) {
  if (!principal) return false;
  if (principal.type === "internal") return can(principal, "customer.read");
  return principal.type === "customer" && principal.customerId === customerId;
}

export function canAccessProject(principal, project) {
  if (!principal || !project) return false;
  if (principal.type === "internal") return can(principal, "project.read");
  return principal.type === "customer" && (
    principal.customerId === project.customerId ||
    principal.projectNumbers?.includes(project.projectNumber)
  );
}

export function canAccessFile(principal, file, project) {
  if (!principal || !file || !project) return false;
  if (!canAccessProject(principal, project)) return false;
  if (file.visibility === "customer") return can(principal, "file.customer.read");
  return principal.type === "internal" && can(principal, "file.internal.read");
}

export function getAccessReadiness() {
  const persistence = getPersistenceReadiness();
  const publicAuthConfigured = Boolean(
    (process.env.NEXT_PUBLIC_SUBPAR_SUPABASE_URL || process.env.SUBPAR_SUPABASE_URL) &&
    process.env.NEXT_PUBLIC_SUBPAR_SUPABASE_ANON_KEY
  );

  return {
    mode: persistence.mode,
    authProvider: persistence.mode === "supabase" ? "supabase-auth" : "demo-principals",
    publicAuthConfigured,
    internalRoles: INTERNAL_ROLES,
    customerPortalIdentity: "modeled",
    permissionCount: Object.keys(PERMISSIONS).length,
    defaultDeny: true,
    realSessionsEnabled: persistence.mode === "supabase" && publicAuthConfigured,
    currentPreviewPrincipal: demoPrincipals.doug,
    customerPreviewPrincipal: demoPrincipals.alex,
  };
}

export function permissionMatrix() {
  const roles = ["owner", "tuner", "staff", "customer"];
  return Object.entries(PERMISSIONS).map(([permission, allowed]) => ({
    permission,
    roles: Object.fromEntries(roles.map(role => [role, allowed.includes(role)])),
  }));
}
