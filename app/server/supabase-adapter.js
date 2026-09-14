import { assertSupabaseConfigured, getPersistenceReadiness, getSupabaseUrl } from "./env";

function config() {
  assertSupabaseConfigured();
  return {
    url: getSupabaseUrl().replace(/\/$/, ""),
    key: process.env.SUBPAR_SUPABASE_SERVICE_ROLE_KEY,
  };
}

async function rest(table, params = "", options = {}) {
  const { url, key } = config();
  const response = await fetch(`${url}/rest/v1/${table}${params ? `?${params}` : ""}`, {
    ...options,
    cache: "no-store",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      Prefer: options.prefer || "return=representation",
      ...(options.headers || {}),
    },
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Supabase ${table} request failed (${response.status}): ${detail.slice(0, 300)}`);
  }
  if (response.status === 204) return [];
  return response.json();
}

const one = rows => Array.isArray(rows) && rows.length ? rows[0] : null;
const snakeToCamel = value => value.replace(/_([a-z])/g, (_, c) => c.toUpperCase());

function camelize(row) {
  if (!row || typeof row !== "object") return row;
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [snakeToCamel(key), value]));
}

function customerView(raw) {
  const c = camelize(raw);
  if (!c) return null;
  return {...c,name:[c.firstName,c.lastName].filter(Boolean).join(" ") || c.email};
}

function projectAliases(raw) {
  const p = camelize(raw);
  return {...p,currentRevision:p.currentRevisionNumber ?? 0};
}

function projectView(project, customers, vehicles, orders) {
  const p = projectAliases(project);
  return {
    ...p,
    customer: customerView(customers.find(item => item.id === project.customer_id)),
    vehicle: camelize(vehicles.find(item => item.id === project.vehicle_id)) || null,
    order: camelize(orders.find(item => item.id === project.order_id)) || null,
  };
}

async function baseCollections() {
  const [projects, customers, vehicles, orders] = await Promise.all([
    rest("tune_projects", "select=*&order=updated_at.desc"),
    rest("customers", "select=*"),
    rest("vehicles", "select=*"),
    rest("orders", "select=*"),
  ]);
  return { projects, customers, vehicles, orders };
}

export async function supabaseProjects(filters = {}) {
  const { projects, customers, vehicles, orders } = await baseCollections();
  const q = String(filters.q || "").toLowerCase();
  return projects.map(project => projectView(project, customers, vehicles, orders)).filter(project => {
    if (filters.platform && project.platform?.toLowerCase() !== String(filters.platform).toLowerCase()) return false;
    if (filters.waitingOn && project.waitingOn?.toLowerCase() !== String(filters.waitingOn).toLowerCase()) return false;
    if (filters.status && project.status?.toLowerCase() !== String(filters.status).toLowerCase()) return false;
    if (q) {
      const haystack = [project.projectNumber, project.customer?.name, project.customer?.email, project.vehicle?.model, project.vehicle?.chassis, project.vehicle?.engine, project.platform, project.status].join(" ").toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

export async function supabaseProject(idOrNumber) {
  const byNumber = await rest("tune_projects", `select=*&project_number=eq.${encodeURIComponent(idOrNumber)}&limit=1`);
  let project = one(byNumber);
  if (!project && /^[0-9a-f-]{36}$/i.test(String(idOrNumber))) project = one(await rest("tune_projects", `select=*&id=eq.${encodeURIComponent(idOrNumber)}&limit=1`));
  if (!project) return null;

  const cycleFilter = project.current_cycle_id ? `&cycle_id=eq.${encodeURIComponent(project.current_cycle_id)}` : "";
  const [customerRows, vehicleRows, orderRows, requirements, revisions, logs, files, messages, events] = await Promise.all([
    rest("customers", `select=*&id=eq.${project.customer_id}&limit=1`),
    rest("vehicles", `select=*&id=eq.${project.vehicle_id}&limit=1`),
    project.order_id ? rest("orders", `select=*&id=eq.${project.order_id}&limit=1`) : Promise.resolve([]),
    rest("project_requirements", `select=*&project_id=eq.${project.id}${cycleFilter}&order=created_at.asc`),
    rest("revisions", `select=*&project_id=eq.${project.id}${cycleFilter}&order=revision_number.asc`),
    rest("logs", `select=*&project_id=eq.${project.id}${cycleFilter}&order=uploaded_at.desc`),
    rest("files", `select=*&project_id=eq.${project.id}${cycleFilter}&order=created_at.desc`),
    rest("messages", `select=*&project_id=eq.${project.id}&order=created_at.asc`),
    rest("events", `select=*&project_id=eq.${project.id}${cycleFilter}&order=created_at.desc`),
  ]);

  return {
    ...projectAliases(project),
    customer: customerView(one(customerRows)),
    vehicle: camelize(one(vehicleRows)),
    order: camelize(one(orderRows)),
    requirements: requirements.map(camelize),
    revisions: revisions.map(camelize),
    logs: logs.map(camelize),
    files: files.map(camelize),
    messages: messages.map(camelize),
    events: events.map(camelize),
  };
}

export async function supabaseCustomers() {
  const [customers, vehicles, projects] = await Promise.all([
    rest("customers", "select=*&order=created_at.desc"),
    rest("vehicles", "select=*"),
    rest("tune_projects", "select=id,project_number,customer_id,status,platform"),
  ]);
  return customers.map(raw => ({
    ...customerView(raw),
    vehicles: vehicles.filter(item => item.customer_id === raw.id).map(camelize),
    projects: projects.filter(item => item.customer_id === raw.id).map(projectAliases),
  }));
}

export async function supabaseVehicles() {
  const [vehicles, customers, projects] = await Promise.all([
    rest("vehicles", "select=*&order=created_at.desc"),
    rest("customers", "select=*"),
    rest("tune_projects", "select=id,project_number,vehicle_id,status,platform,current_revision_number,current_cycle_id"),
  ]);
  return vehicles.map(raw => ({
    ...camelize(raw),
    customer: customerView(customers.find(item => item.id === raw.customer_id)),
    projects: projects.filter(item => item.vehicle_id === raw.id).map(projectAliases),
  }));
}

export async function supabaseDashboard() {
  const projects = await supabaseProjects();
  const [customers, vehicles, events, automationRuns] = await Promise.all([
    rest("customers", "select=id"),
    rest("vehicles", "select=id"),
    rest("events", "select=*&order=created_at.desc&limit=8"),
    rest("automation_runs", "select=*&order=created_at.desc&limit=8"),
  ]);
  return {
    counts: {
      customers: customers.length,
      vehicles: vehicles.length,
      activeProjects: projects.filter(item => !item.closedAt).length,
      waitingOnDoug: projects.filter(item => item.waitingOn === "tuner").length,
      waitingOnCustomer: projects.filter(item => item.waitingOn === "customer").length,
      logsWaiting: projects.filter(item => String(item.status).toLowerCase().includes("log")).length,
      readyToDeliver: projects.filter(item => String(item.status).toLowerCase().includes("ready")).length,
    },
    projects,
    events: events.map(camelize),
    automationRuns: automationRuns.map(camelize),
  };
}

export async function supabaseSystem() {
  const readiness = getPersistenceReadiness();
  const started = Date.now();
  const rows = await rest("tune_projects", "select=id&limit=1");
  return {
    mode: "supabase",
    mutationMode: readiness.mutationsEnabled ? "enabled" : "dry-run",
    schemaVersion: "2026-09-14.3",
    connectivity: "ok",
    latencyMs: Date.now() - started,
    probeRows: rows.length,
    readiness,
    integrations: {supabase:"connected",wix:"disconnected",gmail:"disconnected",mhd:"planned",bootmod3:"planned",ecutek:"planned",datazap:"planned"},
    ndaGate: "real-data-disabled",
  };
}
