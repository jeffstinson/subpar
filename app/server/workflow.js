export const PROJECT_STAGES = [
  "new_order",
  "intake",
  "compatibility_review",
  "calibration",
  "log_requested",
  "log_review",
  "revision_delivery",
  "waiting_customer",
  "closeout",
  "complete",
];

export const ALLOWED_TRANSITIONS = {
  new_order:["intake"],
  intake:["compatibility_review","calibration"],
  compatibility_review:["intake","calibration"],
  calibration:["log_requested","revision_delivery","closeout"],
  log_requested:["log_review","waiting_customer"],
  log_review:["calibration","revision_delivery","log_requested","closeout"],
  revision_delivery:["waiting_customer","log_requested","closeout"],
  waiting_customer:["log_review","calibration","closeout"],
  closeout:["complete","calibration"],
  complete:["calibration"],
};

export const STAGE_OWNER = {
  new_order:"system",
  intake:"customer",
  compatibility_review:"tuner",
  calibration:"tuner",
  log_requested:"customer",
  log_review:"tuner",
  revision_delivery:"tuner",
  waiting_customer:"customer",
  closeout:"tuner",
  complete:"none",
};

export function canTransition(from, to) {
  return Boolean(ALLOWED_TRANSITIONS[from]?.includes(to));
}

export function previewTransition(project, to) {
  const from = project.stage || "new_order";
  if (!PROJECT_STAGES.includes(to)) {
    return {ok:false,from,to,reason:`Unknown stage '${to}'`};
  }
  if (!canTransition(from,to)) {
    return {ok:false,from,to,reason:`Transition ${from} → ${to} is not allowed`};
  }
  return {
    ok:true,
    from,
    to,
    waitingOn:STAGE_OWNER[to],
    eventType:"project.stage.changed",
  };
}

export function stageForLegacyStatus(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized.includes("new order")) return "new_order";
  if (normalized.includes("vehicle info") || normalized.includes("compatibility")) return "compatibility_review";
  if (normalized.includes("log uploaded")) return "log_review";
  if (normalized.includes("waiting on customer")) return "waiting_customer";
  if (normalized.includes("revision")) return "calibration";
  if (normalized.includes("ready to deliver")) return "revision_delivery";
  return "calibration";
}
