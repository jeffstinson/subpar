export function apiOk(data, extraMeta = {}, init = {}) {
  return Response.json({
    data,
    meta:{
      apiVersion:"v1",
      mode:process.env.SUBPAR_DATA_MODE || "demo",
      generatedAt:new Date().toISOString(),
      ...extraMeta,
    },
  },{
    ...init,
    headers:{
      "Cache-Control":"no-store",
      "X-Subpar-Data-Mode":process.env.SUBPAR_DATA_MODE || "demo",
      ...(init.headers || {}),
    },
  });
}

export function apiError(message, status = 400, details = null) {
  return Response.json({
    error:{message,details},
    meta:{apiVersion:"v1",mode:process.env.SUBPAR_DATA_MODE || "demo",generatedAt:new Date().toISOString()},
  },{
    status,
    headers:{"Cache-Control":"no-store","X-Subpar-Data-Mode":process.env.SUBPAR_DATA_MODE || "demo"},
  });
}
