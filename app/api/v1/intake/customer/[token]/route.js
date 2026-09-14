import { resolveIntakeAccess, submitCustomerIntake } from "../../../../../server/intake";

export async function GET(_request,{params}){
  try{
    const {token}=await params;
    const intake=await resolveIntakeAccess(token);
    if(!intake)return Response.json({ok:false,error:"Intake link is invalid or expired"},{status:404,headers:{"Cache-Control":"no-store"}});
    return Response.json({ok:true,intake},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return Response.json({ok:false,error:error.message},{status:400,headers:{"Cache-Control":"no-store"}})}
}

export async function POST(request,{params}){
  try{
    const {token}=await params;
    const body=await request.json();
    const result=await submitCustomerIntake(token,body);
    return Response.json({ok:true,...result},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return Response.json({ok:false,error:error.message},{status:400,headers:{"Cache-Control":"no-store"}})}
}
