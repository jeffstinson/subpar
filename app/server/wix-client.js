function configured(name){return Boolean(process.env[name])}

export function getWixReadReadiness(){
  const credentials=["SUBPAR_WIX_APP_ID","SUBPAR_WIX_APP_SECRET","SUBPAR_WIX_INSTANCE_ID"].every(configured);
  const realDataApproved=process.env.SUBPAR_REAL_DATA_APPROVED==="true";
  const readEnabled=process.env.SUBPAR_WIX_READ_ENABLED==="true";
  return {credentials,realDataApproved,readEnabled,ready:credentials&&realDataApproved&&readEnabled};
}

function parseTokenResponse(data){
  if(data?.access_token)return data;
  if(data?.body){
    try{return typeof data.body==="string"?JSON.parse(data.body):data.body}catch{return data}
  }
  return data;
}

export async function getWixAccessToken(){
  const readiness=getWixReadReadiness();
  if(!readiness.ready)throw new Error("Wix read access is not enabled or credentials are incomplete");
  const response=await fetch("https://www.wixapis.com/oauth2/token",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
      grant_type:"client_credentials",
      client_id:process.env.SUBPAR_WIX_APP_ID,
      client_secret:process.env.SUBPAR_WIX_APP_SECRET,
      instance_id:process.env.SUBPAR_WIX_INSTANCE_ID,
    }),
    cache:"no-store",
  });
  const raw=await response.json();
  const data=parseTokenResponse(raw);
  if(!response.ok||!data?.access_token)throw new Error(`Wix OAuth failed: ${data?.error_description||data?.error||raw?.message||response.status}`);
  return data.access_token;
}

export async function searchWixOrders({cursor=null,limit=100,createdAfter=null,paymentStatus="PAID"}={}){
  const token=await getWixAccessToken();
  const safeLimit=Math.max(1,Math.min(Number(limit)||100,100));
  const filter={};
  if(paymentStatus)filter.paymentStatus=paymentStatus;
  if(createdAfter)filter.createdDate={$gte:new Date(createdAfter).toISOString()};
  const search={
    filter,
    sort:[{fieldName:"createdDate",order:"ASC"}],
    cursorPaging:{limit:safeLimit},
  };
  if(cursor)search.cursorPaging.cursor=cursor;

  const response=await fetch("https://www.wixapis.com/ecom/v1/orders/search",{
    method:"POST",
    headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},
    body:JSON.stringify({search}),
    cache:"no-store",
  });
  const data=await response.json();
  if(!response.ok)throw new Error(`Wix Search Orders failed: ${data?.message||data?.details?.applicationError?.description||response.status}`);
  const metadata=data.metadata||data.pagingMetadata||{};
  const cursors=metadata.cursors||{};
  return {
    orders:data.orders||[],
    nextCursor:cursors.next||null,
    hasNext:Boolean(cursors.hasNext||cursors.next),
    count:metadata.count??data.orders?.length??0,
    rawMetadata:metadata,
  };
}
