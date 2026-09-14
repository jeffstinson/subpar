import { can, resolvePrincipalFromRequest } from "../../../../server/access-control";
import { planGmailThread, planWixOrderEvent } from "../../../../server/integrations";

const samples = {
  wix: {
    eventType:"com.wix.ecommerce.order_paid",
    eventId:"synthetic-wix-1846",
    instanceId:"synthetic-subpar-site",
    data:{
      entity:{
        _id:"WIX-1846",
        _createdDate:"2026-09-14T15:45:00Z",
        paymentStatus:"PAID",
        currency:"USD",
        priceSummary:{ total:{ amount:"750.00", currency:"USD" } },
        billingInfo:{ contactDetails:{ firstName:"Carlos", lastName:"Mendez", email:"carlos.mendez@example.com", phone:"555-0146" } },
        lineItems:[{ name:"S55 Custom Tune · bootmod3" }],
        customTextFields:[{ title:"Tuning platform", value:"bootmod3" }],
      }
    }
  },
  gmail: {
    id:"synthetic-thread-alex-1842",
    subject:"Rev 4 logs uploaded",
    messages:[
      {
        id:"gmail-msg-1842-a",
        threadId:"synthetic-thread-alex-1842",
        payload:{ headers:[
          {name:"From",value:"Doug Talmadge <doug@subpartuning.com>"},
          {name:"To",value:"Alex Rivera <alex.rivera@gmail.com>"},
          {name:"Subject",value:"Rev 4 logs"},
        ]},
        snippet:"When you have a clean third-gear pull, send it over and I’ll review it.",
      },
      {
        id:"gmail-msg-1842-b",
        threadId:"synthetic-thread-alex-1842",
        payload:{ headers:[
          {name:"From",value:"Alex Rivera <alex.rivera@gmail.com>"},
          {name:"To",value:"Doug Talmadge <doug@subpartuning.com>"},
          {name:"Subject",value:"Rev 4 logs"},
        ]},
        snippet:"Just uploaded two new logs. Car feels much smoother on this revision.",
      }
    ]
  }
};

export async function POST(request) {
  try {
    const body = await request.json();
    const principal = await resolvePrincipalFromRequest(request, { demoFallback:body.principal || "doug" });
    if (!principal) return Response.json({ ok:false, error:"Authentication required" }, { status:401 });
    if (!can(principal, "integration.manage")) return Response.json({ ok:false, error:"Integration access denied" }, { status:403 });

    const provider = String(body.provider || "").toLowerCase();
    if (provider === "wix") {
      const plan = await planWixOrderEvent(body.payload || samples.wix);
      return Response.json({ ok:true, dryRun:true, provider, plan }, { headers:{ "Cache-Control":"no-store" } });
    }
    if (provider === "gmail") {
      const plan = await planGmailThread(body.thread || samples.gmail);
      return Response.json({ ok:true, dryRun:true, provider, plan }, { headers:{ "Cache-Control":"no-store" } });
    }
    return Response.json({ ok:false, error:"provider must be wix or gmail" }, { status:400 });
  } catch (error) {
    return Response.json({ ok:false, error:error.message }, { status:400, headers:{ "Cache-Control":"no-store" } });
  }
}
