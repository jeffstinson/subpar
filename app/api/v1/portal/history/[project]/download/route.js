import { canAccessProject, requireCustomerPrincipal } from "../../../../../../server/access-control";
import { getDataMode } from "../../../../../../server/env";
import { getProjectById } from "../../../../../../server/repository";
import { createSignedDownload } from "../../../../../../server/storage";
import { getSupabaseServerClient } from "../../../../../../server/supabase-server";

export async function POST(request,context){
  try{
    const auth=await requireCustomerPrincipal(request);
    if(!auth.ok)return Response.json({ok:false,error:auth.error},{status:auth.status});
    const {project}=await context.params;
    const record=await getProjectById(project);
    if(!record)return Response.json({ok:false,error:"Project not found"},{status:404});
    if(!canAccessProject(auth.principal,record))return Response.json({ok:false,error:"Project access denied"},{status:403});
    const body=await request.json();
    const cycleId=String(body.cycleId||"").trim();
    if(!cycleId)return Response.json({ok:false,error:"cycleId is required"},{status:400});

    if(getDataMode()!=="supabase"){
      return Response.json({ok:true,data:{dryRun:true,cycleId,fileName:"alex_m340i_final_e40.bin",expiresIn:300,signedUrl:null,note:"Preview mode validates archive ownership without exposing a real file URL."}},{headers:{"Cache-Control":"no-store"}});
    }

    const supabase=getSupabaseServerClient();
    const {data:closeout,error:closeoutError}=await supabase
      .from("project_closeouts")
      .select("id,project_id,cycle_id,final_file_id,status")
      .eq("project_id",record.id)
      .eq("cycle_id",cycleId)
      .eq("status","closed")
      .maybeSingle();
    if(closeoutError)throw new Error(`Unable to resolve archived closeout: ${closeoutError.message}`);
    if(!closeout?.final_file_id)return Response.json({ok:false,error:"This tune cycle does not have a closed final package"},{status:404});

    const {data:file,error:fileError}=await supabase
      .from("files")
      .select("id,project_id,cycle_id,kind,storage_bucket,storage_path,original_name,visibility,immutable")
      .eq("id",closeout.final_file_id)
      .maybeSingle();
    if(fileError)throw new Error(`Unable to resolve archived tune artifact: ${fileError.message}`);
    if(!file)return Response.json({ok:false,error:"Archived final tune artifact was not found"},{status:404});
    if(file.project_id!==record.id||file.cycle_id!==cycleId)return Response.json({ok:false,error:"Archived file ownership mismatch"},{status:403});
    if(file.kind!=="tune_revision"||file.visibility!=="customer"||file.immutable!==true)return Response.json({ok:false,error:"Archived file is not eligible for customer download"},{status:409});
    if(!file.storage_bucket||!file.storage_path)return Response.json({ok:false,error:"Archived file storage reference is incomplete"},{status:409});

    const ticket=await createSignedDownload({bucket:file.storage_bucket,path:file.storage_path,downloadName:file.original_name||"subpar-final-tune.bin",expiresIn:300});
    return Response.json({ok:true,data:{dryRun:false,cycleId,fileName:file.original_name||"Final tune",expiresIn:ticket.expiresIn,signedUrl:ticket.signedUrl}},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return Response.json({ok:false,error:error.message},{status:400,headers:{"Cache-Control":"no-store"}})}
}
