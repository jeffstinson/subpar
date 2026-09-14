import { jobs, closedTunes, activities, messageThreads, automationRules } from "../lib/demo-data";

const slug = value => String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const projectId = order => `prj_${order.toLowerCase().replace(/-/g, "")}`;
const customerId = job => `cus_${slug(job.name)}`;
const vehicleId = order => `veh_${order.toLowerCase().replace(/-/g, "")}`;
const orderId = order => `ord_${order.toLowerCase().replace(/-/g, "")}`;

export const customers = jobs.map(job => ({
  id: customerId(job),
  name: job.name,
  email: job.email,
  customerSince: job.customerSince,
  vehicleCount: job.vehicles,
  source: "demo",
  createdAt: `${job.customerSince}-01-01T12:00:00.000Z`,
}));

export const vehicles = jobs.map(job => ({
  id: vehicleId(job.order),
  customerId: customerId(job),
  year: Number(job.vehicle.match(/\d{4}/)?.[0] || 2020),
  make: job.vehicle.includes("Toyota") ? "Toyota" : "BMW",
  model: job.vehicle.replace(/^\d{4}\s+(BMW|Toyota)\s+/, ""),
  chassis: job.chassis,
  engine: job.engine,
  transmission: "Automatic",
  currentFuel: job.fuel,
  vinLast8: job.order === "SP-1842" ? "LL304587" : null,
  source: "demo",
}));

export const orders = jobs.map(job => ({
  id: orderId(job.order),
  externalSource: "wix",
  externalOrderId: job.order,
  customerId: customerId(job),
  vehicleId: vehicleId(job.order),
  productName: `${job.engine} Custom Tune`,
  paymentStatus: "paid",
  amountCents: job.order === "SP-1842" ? 65000 : job.order === "SP-1834" ? 85000 : 75000,
  currency: "USD",
  createdAt: new Date(Date.now() - job.id * 86400000).toISOString(),
}));

export const projects = jobs.map(job => ({
  id: projectId(job.order),
  projectNumber: job.order,
  customerId: customerId(job),
  vehicleId: vehicleId(job.order),
  orderId: orderId(job.order),
  platform: job.platform,
  fuelTarget: job.fuel,
  currentRevision: Number(job.rev.replace(/\D/g, "")) || 1,
  status: job.status,
  priority: job.priority.toLowerCase(),
  waitingOn: job.waitingOn.toLowerCase(),
  nextAction: job.next,
  updatedLabel: job.last,
  assignedTo: "Doug Talmadge",
  source: "demo",
}));

const alexProject = projectId("SP-1842");
const alexVehicle = vehicleId("SP-1842");
const alexCustomer = customerId(jobs[0]);

export const requirements = [
  {id:"req_sp1842_intake",projectId:alexProject,type:"vehicle_intake",label:"Vehicle intake",status:"complete",customerVisible:true},
  {id:"req_sp1842_stock",projectId:alexProject,type:"stock_file",label:"MHD stock file",status:"complete",customerVisible:true},
  {id:"req_sp1842_pack",projectId:alexProject,type:"parameter_pack",label:"B58TU logging parameter pack",status:"complete",customerVisible:true},
  {id:"req_sp1842_baseline",projectId:alexProject,type:"baseline_log",label:"Baseline datalog",status:"complete",customerVisible:true},
  {id:"req_sp1842_review",projectId:alexProject,type:"log_review",label:"Rev 4 log review",status:"pending",customerVisible:true},
];

export const revisions = [1,2,3,4].map(number => ({
  id:`rev_sp1842_${number}`,
  projectId:alexProject,
  number,
  status:number === 4 ? "delivered" : "superseded",
  fuelTarget:"E40",
  fileName:`alex_m340i_rev${number}_e40.bin`,
  customerSummary:number === 4 ? "Smoother torque delivery and refined boost control." : `Revision ${number} calibration update.`,
  internalNotes:number === 4 ? "Review small cylinder 4 correction near 5700 RPM; fuel pressure healthy." : "Synthetic revision history.",
  createdAt:new Date(Date.now() - (5-number) * 86400000).toISOString(),
}));

export const logs = [
  {id:"log_sp1842_01",projectId:alexProject,revisionId:"rev_sp1842_4",platform:"MHD",fileName:"rev4_pull_01.csv",gear:3,fuel:"E40",status:"needs_review",datazapUrl:"https://datazap.me/",metrics:{boostTargetPsi:24.0,boostActualPsi:24.3,lambda:0.81,timingCorrectionDeg:-1.5,hpfpMinPsi:2570,iatPeakF:118,throttleClosure:false},createdAt:new Date(Date.now()-20*60000).toISOString()},
  {id:"log_sp1842_02",projectId:alexProject,revisionId:"rev_sp1842_4",platform:"MHD",fileName:"rev4_pull_02.csv",gear:3,fuel:"E40",status:"needs_review",datazapUrl:"https://datazap.me/",metrics:{boostTargetPsi:24.0,boostActualPsi:24.1,lambda:0.80,timingCorrectionDeg:-1.2,hpfpMinPsi:2610,iatPeakF:116,throttleClosure:false},createdAt:new Date(Date.now()-18*60000).toISOString()},
];

export const files = [
  {id:"file_stock_sp1842",projectId:alexProject,kind:"stock_file",name:"stock_backup.bin",visibility:"internal",status:"stored"},
  {id:"file_pack_sp1842",projectId:alexProject,kind:"parameter_pack",name:"B58TU_MHD_Params_v3.2.pdf",visibility:"customer",status:"stored"},
  ...revisions.map(rev => ({id:`file_${rev.id}`,projectId:alexProject,revisionId:rev.id,kind:"tune_revision",name:rev.fileName,visibility:"customer",status:"stored"})),
];

export const messages = messageThreads.map((thread,index) => {
  const job = jobs.find(item => item.order === thread.order);
  return {
    id:`msg_${thread.order.toLowerCase().replace(/-/g,"")}_${index+1}`,
    projectId:projectId(thread.order),
    customerId:job ? customerId(job) : null,
    channel:"gmail",
    direction:index % 2 === 0 ? "inbound" : "outbound",
    subject:thread.subject,
    body:thread.preview,
    unread:Boolean(thread.unread),
    createdLabel:thread.time,
  };
});

export const events = activities.map((activity,index) => ({
  id:`evt_${index+1}`,
  projectId:projectId(activity.order),
  type:activity.type,
  title:activity.text,
  actor:activity.type === "message" ? "customer" : "system",
  visibility:"internal",
  createdLabel:activity.time,
}));

export const automationRuns = automationRules.map((rule,index) => ({
  id:`run_${index+1}`,
  rule:rule.name,
  trigger:rule.trigger,
  action:rule.action,
  status:rule.status === "Active" ? "enabled" : "draft",
  runs:rule.runs,
  mode:"demo",
}));

export const closedProjects = closedTunes.map((tune,index) => ({
  id:`closed_${index+1}`,
  projectNumber:tune.order,
  customerName:tune.name,
  vehicle:tune.vehicle,
  engine:tune.engine,
  platform:tune.platform,
  finalRevision:tune.finalRev,
  fuel:tune.fuel,
  closed:tune.closed,
  duration:tune.duration,
}));

export function listProjects(filters = {}) {
  const { platform, waitingOn, status, q } = filters;
  return projects.filter(project => {
    const customer = customers.find(item => item.id === project.customerId);
    const vehicle = vehicles.find(item => item.id === project.vehicleId);
    if (platform && project.platform.toLowerCase() !== String(platform).toLowerCase()) return false;
    if (waitingOn && project.waitingOn !== String(waitingOn).toLowerCase()) return false;
    if (status && project.status.toLowerCase() !== String(status).toLowerCase()) return false;
    if (q) {
      const haystack = [project.projectNumber, customer?.name, customer?.email, vehicle?.model, vehicle?.chassis, vehicle?.engine, project.platform, project.status].join(" ").toLowerCase();
      if (!haystack.includes(String(q).toLowerCase())) return false;
    }
    return true;
  }).map(project => hydrateProject(project, false));
}

export function getProject(idOrNumber) {
  const project = projects.find(item => item.id === idOrNumber || item.projectNumber === idOrNumber);
  return project ? hydrateProject(project, true) : null;
}

export function hydrateProject(project, includeRelations = true) {
  const base = {
    ...project,
    customer:customers.find(item => item.id === project.customerId) || null,
    vehicle:vehicles.find(item => item.id === project.vehicleId) || null,
    order:orders.find(item => item.id === project.orderId) || null,
  };
  if (!includeRelations) return base;
  return {
    ...base,
    requirements:requirements.filter(item => item.projectId === project.id),
    revisions:revisions.filter(item => item.projectId === project.id),
    logs:logs.filter(item => item.projectId === project.id),
    files:files.filter(item => item.projectId === project.id),
    messages:messages.filter(item => item.projectId === project.id),
    events:events.filter(item => item.projectId === project.id),
  };
}

export function listCustomers() {
  return customers.map(customer => ({
    ...customer,
    vehicles:vehicles.filter(vehicle => vehicle.customerId === customer.id),
    projects:projects.filter(project => project.customerId === customer.id).map(project => ({id:project.id,projectNumber:project.projectNumber,status:project.status,platform:project.platform})),
  }));
}

export function listVehicles() {
  return vehicles.map(vehicle => ({
    ...vehicle,
    customer:customers.find(customer => customer.id === vehicle.customerId) || null,
    projects:projects.filter(project => project.vehicleId === vehicle.id).map(project => ({id:project.id,projectNumber:project.projectNumber,status:project.status,platform:project.platform})),
  }));
}

export function dashboardSnapshot() {
  return {
    counts:{
      customers:customers.length,
      vehicles:vehicles.length,
      activeProjects:projects.length,
      waitingOnDoug:projects.filter(item => item.waitingOn === "doug").length,
      waitingOnCustomer:projects.filter(item => item.waitingOn === "customer").length,
      logsWaiting:projects.filter(item => item.status === "Log Uploaded").length,
      readyToDeliver:projects.filter(item => item.status === "Ready to Deliver").length,
      closedProjects:closedProjects.length,
    },
    projects:listProjects(),
    events:events.slice(0,8),
    automationRuns,
  };
}

export function systemSnapshot() {
  return {
    mode:"demo",
    mutationMode:"dry-run",
    schemaVersion:"2026-09-14.1",
    counts:{customers:customers.length,vehicles:vehicles.length,orders:orders.length,projects:projects.length,revisions:revisions.length,logs:logs.length,files:files.length,messages:messages.length,events:events.length},
    integrations:{wix:"disconnected",gmail:"disconnected",mhd:"planned",bootmod3:"planned",ecutek:"planned",datazap:"planned",supabase:"not-configured"},
    ndaGate:"real-data-disabled",
  };
}

export const demoRelations = { alexProject, alexVehicle, alexCustomer };
