import { canAccessProject, requireCustomerPrincipal } from "../../../../../server/access-control";
import { getProjectById } from "../../../../../server/repository";
import { acknowledgeRevisionDelivery, getCustomerRevisionDelivery } from "../../../../../server/revision-delivery";

export async function GET(request,context){
  try{
    const auth=await requireCustomerPrincipal(request);
    if(!auth.ok)return Response.json({ok:false,error:auth.error},{status:auth.status});
    const {project}=await context.params;
    const record=await getProjectById(project);
    if(!record)return Response.json({ok:false,error:"Project not found"},{status:404});
    if(!canAccessProject(auth.principal,record))return Response.json({ok:false,error:"Project access denied"},{status:403});
    const data=await getCustomerRevisionDelivery({projectNumber:project,principal:auth.principal});
    return Response.json({ok:true,data},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return Response.json({ok:false,error:error.message},{status:400,headers:{"Cache-Control":"no-store"}})}
}

export async function POST(request,context){
  try{
    const auth=await requireCustomerPrincipal(request);
    if(!auth.ok)return Response.json({ok:false,error:auth.error},{status:auth.status});
    const {project}=await context.params;
    const record=await getProjectById(project);
    if(!record)return Response.json({ok:false,error:"Project not found"},{status:404});
    if(!canAccessProject(auth.principal,record))return Response.json({ok:false,error:"Project access denied"},{status:403});
    const body=await request.json();
    if(body.action!=="acknowledge")return Response.json({ok:false,error:"action must be acknowledge"},{status:400});
    if(!body.deliveryId)return Response.json({ok:false,error:"deliveryId is required"},{status:400});
    const data=await acknowledgeRevisionDelivery({projectNumber:project,deliveryId:body.deliveryId,installed:Boolean(body.installed),actor:auth.principal.displayName||auth.principal.email||"Customer"});
    return Response.json({ok:true,data},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return Response.json({ok:false,error:error.message},{status:400,headers:{"Cache-Control":"no-store"}})}
}
