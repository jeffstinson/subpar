const requiredForSupabase = [
  "SUBPAR_SUPABASE_URL",
  "SUBPAR_SUPABASE_SERVICE_ROLE_KEY",
];

const optional = [
  "SUBPAR_SUPABASE_ANON_KEY",
  "SUBPAR_STORAGE_BUCKET_TUNES",
  "SUBPAR_STORAGE_BUCKET_LOGS",
  "SUBPAR_STORAGE_BUCKET_CUSTOMER",
];

export function getDataMode() {
  return process.env.SUBPAR_DATA_MODE || "demo";
}

export function mutationsEnabled() {
  return process.env.SUBPAR_MUTATIONS_ENABLED === "true";
}

export function syntheticSeedAllowed() {
  return process.env.SUBPAR_ALLOW_SYNTHETIC_SEED === "true";
}

function statusFor(name) {
  return Boolean(process.env[name]);
}

export function getPersistenceReadiness() {
  const mode = getDataMode();
  const required = Object.fromEntries(requiredForSupabase.map(name => [name, statusFor(name)]));
  const optionalState = Object.fromEntries(optional.map(name => [name, statusFor(name)]));
  const missing = requiredForSupabase.filter(name => !process.env[name]);

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

export function assertSupabaseConfigured() {
  const readiness = getPersistenceReadiness();
  if (!readiness.supabaseConfigured) {
    throw new Error(`Supabase mode is missing server configuration: ${readiness.missing.join(", ")}`);
  }
  return readiness;
}
