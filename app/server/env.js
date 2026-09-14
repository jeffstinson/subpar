const optional = [
  "NEXT_PUBLIC_SUBPAR_SUPABASE_ANON_KEY",
  "SUBPAR_BUCKET_STOCK_FILES",
  "SUBPAR_BUCKET_REVISIONS",
  "SUBPAR_BUCKET_LOGS",
  "SUBPAR_BUCKET_PARAMETER_PACKS",
  "SUBPAR_BUCKET_CUSTOMER_FILES",
];

export function getDataMode() {
  return process.env.SUBPAR_DATA_MODE || "demo";
}

export function getAuthMode() {
  return process.env.SUBPAR_AUTH_MODE || "demo";
}

export function mutationsEnabled() {
  return process.env.SUBPAR_MUTATIONS_ENABLED === "true";
}

export function syntheticSeedAllowed() {
  return process.env.SUBPAR_ALLOW_SYNTHETIC_SEED === "true";
}

export function internalAuthEnabled() {
  return process.env.SUBPAR_INTERNAL_AUTH_ENABLED === "true";
}

export function portalAuthEnabled() {
  return process.env.SUBPAR_PORTAL_AUTH_ENABLED === "true";
}

export function getSupabaseUrl() {
  return process.env.SUBPAR_SUPABASE_URL || process.env.NEXT_PUBLIC_SUBPAR_SUPABASE_URL || "";
}

function statusFor(name) {
  return Boolean(process.env[name]);
}

export function getPersistenceReadiness() {
  const mode = getDataMode();
  const supabaseUrl = Boolean(getSupabaseUrl());
  const serviceRole = Boolean(process.env.SUBPAR_SUPABASE_SERVICE_ROLE_KEY);
  const required = {
    SUBPAR_SUPABASE_URL: supabaseUrl,
    SUBPAR_SUPABASE_SERVICE_ROLE_KEY: serviceRole,
  };
  const optionalState = Object.fromEntries(optional.map(name => [name, statusFor(name)]));
  const missing = [];
  if (!supabaseUrl) missing.push("SUBPAR_SUPABASE_URL or NEXT_PUBLIC_SUBPAR_SUPABASE_URL");
  if (!serviceRole) missing.push("SUBPAR_SUPABASE_SERVICE_ROLE_KEY");

  return {
    mode,
    supportedMode: mode === "demo" || mode === "supabase",
    supabaseConfigured: missing.length === 0,
    required,
    optional: optionalState,
    missing,
    mutationsEnabled: mutationsEnabled(),
    syntheticSeedAllowed: syntheticSeedAllowed(),
    safeForRealData: mode === "supabase" && missing.length === 0 && mutationsEnabled(),
    realDataGate: "disabled-until-explicit-approval",
  };
}

export function getAuthReadiness() {
  const authMode = getAuthMode();
  const urlConfigured = Boolean(getSupabaseUrl());
  const anonConfigured = Boolean(process.env.NEXT_PUBLIC_SUBPAR_SUPABASE_ANON_KEY);
  const appUrlConfigured = Boolean(process.env.NEXT_PUBLIC_SUBPAR_APP_URL);
  const publicAuthConfigured = urlConfigured && anonConfigured;

  return {
    mode: authMode,
    supportedMode: authMode === "demo" || authMode === "supabase",
    publicAuthConfigured,
    internalAuthEnabled: internalAuthEnabled(),
    portalAuthEnabled: portalAuthEnabled(),
    appUrlConfigured,
    missing: [
      !urlConfigured && "Supabase URL",
      !anonConfigured && "NEXT_PUBLIC_SUBPAR_SUPABASE_ANON_KEY",
      !appUrlConfigured && "NEXT_PUBLIC_SUBPAR_APP_URL",
    ].filter(Boolean),
    defaultDeny: true,
  };
}

export function assertSupabaseConfigured() {
  const readiness = getPersistenceReadiness();
  if (!readiness.supabaseConfigured) {
    throw new Error(`Supabase mode is missing server configuration: ${readiness.missing.join(", ")}`);
  }
  return readiness;
}
