export function customerProjectView(project) {
  if (!project) return null;
  const customer = project.customer || null;
  const vehicle = project.vehicle || null;
  const requirements = (project.requirements || []).filter(item => item.customerVisible !== false && item.customer_visible !== false);
  const revisions = (project.revisions || []).filter(item => {
    const status = String(item.status || "").toLowerCase();
    return status === "delivered" || status === "final";
  });
  const files = (project.files || []).filter(item => item.visibility === "customer");
  const messages = (project.messages || []).filter(item => item.customerVisible !== false && item.customer_visible !== false);
  const events = (project.events || []).filter(item => {
    const visibility = String(item.visibility || "").toLowerCase();
    return visibility === "customer" || visibility === "both";
  });

  return {
    id: project.id,
    projectNumber: project.projectNumber,
    status: project.customerVisibleStatus || project.customer_visible_status || project.status,
    stage: project.stage || null,
    waitingOn: project.waitingOn === "tuner" || project.waitingOn === "doug" ? "Subpar Tuning" : project.waitingOn,
    nextAction: project.nextAction || project.next_action || null,
    platform: project.platform,
    fuelTarget: project.fuelTarget || project.fuel_target || null,
    currentRevision: project.currentRevision ?? project.currentRevisionNumber ?? project.current_revision_number ?? null,
    customer: customer ? {
      id: customer.id,
      name: customer.name || [customer.firstName, customer.lastName].filter(Boolean).join(" "),
      email: customer.email || null,
    } : null,
    vehicle: vehicle ? {
      id: vehicle.id,
      year: vehicle.year,
      make: vehicle.make,
      model: vehicle.model,
      chassis: vehicle.chassis || null,
      engine: vehicle.engine || null,
      transmission: vehicle.transmission || null,
      currentFuel: vehicle.currentFuel || vehicle.current_fuel || null,
    } : null,
    requirements: requirements.map(item => ({
      id: item.id,
      type: item.type || item.requirementType || item.requirement_type,
      label: item.label,
      status: item.status,
      required: item.required !== false,
    })),
    revisions: revisions.map(item => ({
      id: item.id,
      number: item.number ?? item.revisionNumber ?? item.revision_number,
      status: item.status,
      fuelTarget: item.fuelTarget || item.fuel_target || null,
      customerSummary: item.customerSummary || item.customer_summary || null,
      publishedAt: item.publishedAt || item.published_at || item.createdAt || item.created_at || null,
    })),
    files: files.map(item => ({
      id: item.id,
      kind: item.kind,
      name: item.originalName || item.original_name || item.name,
      sizeBytes: item.sizeBytes ?? item.size_bytes ?? null,
      createdAt: item.createdAt || item.created_at || null,
    })),
    messages: messages.map(item => ({
      id: item.id,
      direction: item.direction,
      subject: item.subject || null,
      body: item.body || item.bodyText || item.body_text || null,
      createdAt: item.createdAt || item.created_at || item.createdLabel || null,
    })),
    events: events.map(item => ({
      id: item.id,
      type: item.type || item.eventType || item.event_type,
      title: item.title || item.payload?.title || null,
      createdAt: item.createdAt || item.created_at || item.createdLabel || null,
    })),
  };
}
