import {
  dashboardSnapshot,
  getProject,
  listCustomers,
  listProjects,
  listVehicles,
  systemSnapshot,
} from "./demo-store";
import { previewTransition, stageForLegacyStatus } from "./workflow";

export function getDataMode() {
  return process.env.SUBPAR_DATA_MODE || "demo";
}

export function mutationsEnabled() {
  return process.env.SUBPAR_MUTATIONS_ENABLED === "true";
}

function assertSupportedMode() {
  const mode = getDataMode();
  if (mode !== "demo") {
    throw new Error(`Subpar data mode '${mode}' is not configured yet. Live adapters remain intentionally gated.`);
  }
}

export async function getDashboardData() {
  assertSupportedMode();
  return dashboardSnapshot();
}

export async function getProjects(filters = {}) {
  assertSupportedMode();
  return listProjects(filters);
}

export async function getProjectById(id) {
  assertSupportedMode();
  return getProject(id);
}

export async function getCustomers() {
  assertSupportedMode();
  return listCustomers();
}

export async function getVehicles() {
  assertSupportedMode();
  return listVehicles();
}

export async function getSystemData() {
  assertSupportedMode();
  return {
    ...systemSnapshot(),
    configuredMode:getDataMode(),
    mutationsEnabled:mutationsEnabled(),
    workflowStateMachine:true,
  };
}

export async function previewAction(payload = {}) {
  assertSupportedMode();
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
    const project = getProject(payload.project);
    if (!project) throw new Error("project was not found");
    const to = payload.input?.stage;
    if (!to) throw new Error("input.stage is required for project.status.change");
    transition = previewTransition({...project,stage:stageForLegacyStatus(project.status)},to);
  }

  return {
    accepted:false,
    dryRun:true,
    action,
    project:payload.project || null,
    input:payload.input || {},
    transition,
    reason:"Synthetic demo mode prevents persistent mutations and outbound customer actions.",
    wouldCreateEvent:{
      type:action,
      actor:"Doug Talmadge",
      visibility:"internal",
      timestamp:new Date().toISOString(),
    },
  };
}
