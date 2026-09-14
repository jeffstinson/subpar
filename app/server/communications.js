import { getDataMode } from "./env";
import { getSupabaseServerClient } from "./supabase-server";
import { getProjects } from "./repository";
import { messageThreads, jobs } from "../lib/demo-data";

function demoThread(thread,index,projects){
  const job=jobs.find(item=>item.order===thread.order);
  const project=projects.find(item=>item.projectNumber===thread.order)||null;
  const customer=project?.customer||{name:thread.name,email:job?.email||null};
  const vehicle=project?.vehicle||null;
  const received=new Date(Date.now()-(index+1)*37*60000).toISOString();
  const previous=new Date(Date.now()-(index+1)*2*60*60000).toISOString();
  return {
    id:`demo_thread_${thread.order.toLowerCase().replace(/-/g,"")}`,
    channel:"gmail",
    projectNumber:thread.order,
    projectId:project?.id||null,
    customerId:project?.customerId||null,
    customer,
    vehicle,
    subject:thread.subject,
    unread:Number(thread.unread||0),
    updatedLabel:thread.time,
    updatedAt:received,
    waitingOn:project?.waitingOn||job?.waitingOn?.toLowerCase()||null,
    status:project?.status||job?.status||null,
    messages:[
      {id:`demo_${thread.order}_out`,direction:"outbound",sender:"Doug Talmadge",recipient:customer.email,subject:thread.subject,body:`Hey ${customer.name?.split(" ")[0]||"there"}, just checking in on ${thread.order}. Send over the next item when you have it and I’ll keep things moving.`,createdAt:previous,customerVisible:true},
      {id:`demo_${thread.order}_in`,direction:"inbound",sender:customer.name,recipient:"Doug Talmadge",subject:thread.subject,body:thread.preview,createdAt:received,customerVisible:true},
    ],
  };
}

export async function getCommunicationWorkspace({limit=50}={}){
  const projects=await getProjects();
  if(getDataMode()!=="supabase"){
    const threads=messageThreads.slice(0,limit).map((thread,index)=>demoThread(thread,index,projects));
    return {mode:"demo",threads,counts:{threads:threads.length,unread:threads.reduce((sum,item)=>sum+item.unread,0),waitingOnDoug:threads.filter(item=>String(item.waitingOn).toLowerCase()==="doug"||String(item.waitingOn).toLowerCase()==="tuner").length}};
  }

  const supabase=getSupabaseServerClient();
  const {data:conversations,error}=await supabase.from("conversations")
    .select("id,project_id,customer_id,channel,external_thread_id,subject,created_at,updated_at")
    .order("updated_at",{ascending:false}).limit(Math.max(1,Math.min(Number(limit)||50,100)));
  if(error)throw new Error(`Unable to load communications: ${error.message}`);
  const rows=conversations||[];
  const conversationIds=rows.map(row=>row.id);
  const customerIds=[...new Set(rows.map(row=>row.customer_id).filter(Boolean))];
  const projectIds=[...new Set(rows.map(row=>row.project_id).filter(Boolean))];

  const [messagesResult,customersResult,projectsResult]=await Promise.all([
    conversationIds.length?supabase.from("messages").select("id,conversation_id,project_id,direction,sender,recipient,subject,body_text,customer_visible,sent_at,received_at,created_at").in("conversation_id",conversationIds).order("created_at",{ascending:true}):Promise.resolve({data:[],error:null}),
    customerIds.length?supabase.from("customers").select("id,email,first_name,last_name").in("id",customerIds):Promise.resolve({data:[],error:null}),
    projectIds.length?supabase.from("tune_projects").select("id,project_number,vehicle_id,status,waiting_on,next_action,current_revision_number,platform,fuel_target").in("id",projectIds):Promise.resolve({data:[],error:null}),
  ]);
  for(const result of [messagesResult,customersResult,projectsResult])if(result.error)throw new Error(`Unable to hydrate communications: ${result.error.message}`);

  const vehicleIds=[...new Set((projectsResult.data||[]).map(row=>row.vehicle_id).filter(Boolean))];
  const {data:vehicles,error:vehicleError}=vehicleIds.length?await supabase.from("vehicles").select("id,year,make,model,chassis,engine").in("id",vehicleIds):{data:[],error:null};
  if(vehicleError)throw new Error(`Unable to load communication vehicles: ${vehicleError.message}`);

  const customerMap=new Map((customersResult.data||[]).map(row=>[row.id,{id:row.id,email:row.email,name:[row.first_name,row.last_name].filter(Boolean).join(" ")||row.email}]));
  const projectMap=new Map((projectsResult.data||[]).map(row=>[row.id,row]));
  const vehicleMap=new Map((vehicles||[]).map(row=>[row.id,row]));
  const messagesByConversation=new Map();
  for(const message of messagesResult.data||[]){const list=messagesByConversation.get(message.conversation_id)||[];list.push({id:message.id,direction:message.direction,sender:message.sender,recipient:message.recipient,subject:message.subject,body:message.body_text||"",createdAt:message.received_at||message.sent_at||message.created_at,customerVisible:message.customer_visible});messagesByConversation.set(message.conversation_id,list)}

  const threads=rows.map(row=>{
    const project=projectMap.get(row.project_id)||null;
    const customer=customerMap.get(row.customer_id)||null;
    const threadMessages=messagesByConversation.get(row.id)||[];
    const last=threadMessages.at(-1)||null;
    return {id:row.id,channel:row.channel,externalThreadId:row.external_thread_id,projectNumber:project?.project_number||null,projectId:row.project_id,customerId:row.customer_id,customer,vehicle:project?vehicleMap.get(project.vehicle_id)||null:null,subject:row.subject||last?.subject||"Customer conversation",unread:0,updatedAt:row.updated_at,updatedLabel:row.updated_at?new Date(row.updated_at).toLocaleString():"—",waitingOn:project?.waiting_on||null,status:project?.status||null,nextAction:project?.next_action||null,currentRevision:project?.current_revision_number||0,platform:project?.platform||null,fuel:project?.fuel_target||null,messages:threadMessages};
  });
  return {mode:"supabase",threads,counts:{threads:threads.length,unread:0,waitingOnDoug:threads.filter(item=>item.waitingOn==="tuner").length}};
}
