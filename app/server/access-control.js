import { getAuthMode, getAuthReadiness, getPersistenceReadiness } from "./env";
import { getSupabaseServerClient } from "./supabase-server";

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

function bearerToken(request) {
  const value = request?.headers?.get?.("authorization") || "";
  return value.toLowerCase().startsWith("bearer ") ? value.slice(7).trim() : null;
}

export async function resolvePrincipalFromRequest(request, { demoFallback = null } = {}) {
  const authMode = getAuthMode();

  if (authMode === "demo") {
    const key = request?.headers?.get?.("x-subpar-demo-principal") || demoFallback;
    return key ? demoPrincipals[key] || null : null;
  }

  if (authMode !== "supabase") return null;
  const token = bearerToken(request);
  if (!token) return null;

  const supabase = getSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  const user = userData?.user;
  if (userError || !user) return null;

  const { data: internalRows, error: internalError } = await supabase
    .from("internal_users")
    .select("id,display_name,role,active")
    .eq("auth_user_id", user.id)
    .eq("active", true)
    .limit(1);
  if (internalError) throw new Error(`Unable to resolve internal identity: ${internalError.message}`);
  if (internalRows?.length) {
    const row = internalRows[0];
    return {
      id: user.id,
      type: "internal",
      role: row.role,
      displayName: row.display_name,
      email: user.email,
      membershipId: row.id,
    };
  }

  const { data: portalRows, error: portalError } = await supabase
    .from("customer_portal_users")
    .select("id,customer_id,active")
    .eq("auth_user_id", user.id)
    .eq("active", true)
    .limit(1);
  if (portalError) throw new Error(`Unable to resolve customer identity: ${portalError.message}`);
  if (portalRows?.length) {
    const row = portalRows[0];
    return {
      id: user.id,
      type: "customer",
      role: "customer",
      displayName: user.user_metadata?.full_name || user.email,
      email: user.email,
      customerId: row.customer_id,
      portalMembershipId: row.id,
    };
  }

  return null;
}

export function getAccessReadiness() {
  const persistence = getPersistenceReadiness();
  const auth = getAuthReadiness();
  return {
    mode: persistence.mode,
    authMode: auth.mode,
    authProvider: auth.mode === "supabase" ? "supabase-auth" : "demo-principals",
    publicAuthConfigured: auth.publicAuthConfigured,
    internalRoles: INTERNAL_ROLES,
    customerPortalIdentity: "modeled",
    permissionCount: Object.keys(PERMISSIONS).length,
    defaultDeny: true,
    realSessionsEnabled: auth.mode === "supabase" && auth.publicAuthConfigured,
    internalAuthEnabled: auth.internalAuthEnabled,
    portalAuthEnabled: auth.portalAuthEnabled,
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
