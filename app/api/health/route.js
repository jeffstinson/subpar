export async function GET(){
  return Response.json({
    ok:true,
    service:"subpar-os",
    mode:"synthetic-demo",
    integrations:{wix:"disconnected",gmail:"disconnected",mhd:"planned",bootmod3:"planned",ecutek:"planned",datazap:"planned"},
    data:"synthetic-only",
    timestamp:new Date().toISOString()
  },{headers:{"Cache-Control":"no-store"}})
}
