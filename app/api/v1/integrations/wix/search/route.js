import { can, resolvePrincipalFromRequest } from "../../../../../server/access-control";
import { normalizeWixOrder } from "../../../../../server/integrations";
import { getWixReadReadiness, searchWixOrders } from "../../../../../server/wix-client";

export async function POST(request){
  try{
    const body=await request.json();
    const principal=await resolvePrincipalFromRequest(request,{demoFallback:body.principal||"doug"});
    if(!principal)return Response.json({ok:false,error:"Authentication required"},{status:401});
    if(!can(principal,"integration.manage"))return Response.json({ok:false,error:"Integration access denied"},{status:403});
    const readiness=getWixReadReadiness();
    if(!readiness.ready)return Response.json({ok:false,disabled:true,error:"Wix historical read gate is closed",readiness},{status:503,headers:{"Cache-Control":"no-store"}});

    const result=await searchWixOrders({cursor:body.cursor||null,limit:body.limit||100,createdAfter:body.createdAfter||null,paymentStatus:body.paymentStatus||"PAID"});
    const orders=result.orders.map(order=>normalizeWixOrder({eventType:"historical_order",eventId:order._id||order.id,data:{entity:order}}));
    return Response.json({ok:true,count:orders.length,nextCursor:result.nextCursor,hasNext:result.hasNext,orders},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return Response.json({ok:false,error:error.message},{status:400,headers:{"Cache-Control":"no-store"}})}
}
