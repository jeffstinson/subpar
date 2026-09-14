import {
  dashboardSnapshot,
  getProject,
  listCustomers,
  listProjects,
  listVehicles,
  systemSnapshot,
} from "./demo-store";
import {
  supabaseCustomers,
  supabaseDashboard,
  supabaseProject,
  supabaseProjects,
  supabaseSystem,
  supabaseVehicles,
} from "./supabase-adapter";
import { getDataMode, getPersistenceReadiness, mutationsEnabled } from "./env";
import { previewTransition, stageForLegacyStatus } from "./workflow";

function assertSupportedMode() {
  const mode = getDataMode();
  if (mode !== "demo" && mode !== "supabase") {
    throw new Error(`Unsupported Subpar data mode '${mode}'. Expected 'demo' or 'supabase'.`);
  }
  return mode;
}

export { getDataMode, mutationsEnabled };

export async function getDashboardData() {
  const mode = assertSupportedMode();
  return mode === "supabase" ? supabaseDashboard() : dashboardSnapshot();
}

export async function getProjects(filters = {}) {
  const mode = assertSupportedMode();
  return mode === "supabase" ? supabaseProjects(filters) : listProjects(filters);
}

export async function getProjectById(id) {
  const mode = assertSupportedMode();
  return mode === "supabase" ? supabaseProject(id) : getProject(id);
}

export async function getCustomers() {
  const mode = assertSupportedMode();
  return mode === "supabase" ? supabaseCustomers() : listCustomers();
}

export async function getVehicles() {
  const mode = assertSupportedMode();
  return mode === "supabase" ? supabaseVehicles() : listVehicles();
}

export async function getSystemData() {
  const mode = assertSupportedMode();
  const readiness = getPersistenceReadiness();

  if (mode === "supabase") {
    return {
      ...(await supabaseSystem()),
      configuredMode: mode,
      mutationsEnabled: mutationsEnabled(),
      workflowStateMachine: true,
      persistenceReadiness: readiness,
    };
  }

  return {
    ...systemSnapshot(),
    configuredMode: mode,
    mutationsEnabled: mutationsEnabled(),
    workflowStateMachine: true,
    persistenceReadiness: readiness,
  };
}

export async function getReadinessData() {
  const readiness = getPersistenceReadiness();
  let connectivity = "not-tested";
  let connectivityError = null;

  if (readiness.mode === "supabase" && readiness.supabaseConfigured) {
    try {
      const probe = await supabaseSystem();
      connectivity = probe.connectivity;
    } catch (error) {
      connectivity = "error";
      connectivityError = error.message;
    }
  }

  return {
    ...readiness,
    connectivity,
    connectivityError,
    repositoryAdapter: readiness.mode === "supabase" ? "supabase-rest" : "demo-memory",
    schemaMigration: "supabase/migrations/0001_core.sql",
    schemaMigrations: [
      "supabase/migrations/0001_core.sql",
      "supabase/migrations/0002_identity_storage.sql",
      "supabase/migrations/0003_access_hardening.sql",
      "supabase/migrations/0004_integration_staging.sql",
      "supabase/migrations/0005_go_live_imports.sql",
      "supabase/migrations/0006_intake_activation.sql",
      "supabase/migrations/0007_provisioning_state.sql",
      "supabase/migrations/0008_customer_intake_activation.sql",
      "supabase/migrations/0009_intake_handoff_queue.sql",
      "supabase/migrations/0010_vehicle_platform_intelligence.sql",
      "supabase/migrations/0011_log_intelligence.sql",
    ],
    schemaHead: "0011_log_intelligence",
    syntheticSeed: "supabase/seed/0001_demo.sql",
  };
}

export async function previewAction(payload = {}) {
  const mode = assertSupportedMode();
  const action = String(payload.action || "").trim();
  if (!action) throw new Error("action is required");

  const supported = new Set([
    "project.status.change",
    "project.next_action.change",
    "revision.create",
    "revision.publish",
    "log.review",
    "customer.message.send",
    "requirement.complete",
  ]);

  if (!supported.has(action)) throw new Error(`Unsupported action '${action}'`);

  let transition = null;
  if (action === "project.status.change") {
    const project = await getProjectById(payload.project);
    if (!project) throw new Error("project was not found");
    const to = payload.input?.stage;
    if (!to) throw new Error("input.stage is required for project.status.change");
    transition = previewTransition({...project,stage:project.stage || stageForLegacyStatus(project.status)},to);
  }

  return {
    accepted:false,
    dryRun:true,
    action,
    project:payload.project || null,
    input:payload.input || {},
    transition,
    adapter:mode === "supabase" ? "supabase-rest" : "demo-memory",
    reason:mutationsEnabled()
      ? "Persistent action handlers are not enabled in this phase; repository writes remain intentionally gated."
      : "Mutation mode is disabled. No persistent write or outbound customer action was performed.",
    wouldCreateEvent:{
      type:action,
      actor:"Doug Talmadge",
      visibility:"internal",
      timestamp:new Date().toISOString(),
    },
  };
}
