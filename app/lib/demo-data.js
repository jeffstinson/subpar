export const jobs = [
  {id:1,name:"Alex Rivera",email:"alex.rivera@gmail.com",vehicle:"2021 BMW M340i",chassis:"G20",engine:"B58TU",platform:"MHD",rev:"Rev 4",status:"Log Uploaded",priority:"High",last:"18m ago",fuel:"E40",order:"SP-1842",next:"Review 2 new logs",tone:"green",waitingOn:"Doug",customerSince:"2025",vehicles:2},
  {id:2,name:"Mike Tremblay",email:"mike.tremblay@outlook.com",vehicle:"2019 BMW M2 Competition",chassis:"F87",engine:"S55",platform:"BM3",rev:"Rev 2",status:"Revision in Progress",priority:"High",last:"46m ago",fuel:"93",order:"SP-1839",next:"Finish Rev 2",tone:"red",waitingOn:"Doug",customerSince:"2024",vehicles:1},
  {id:3,name:"Ryan Gallagher",email:"rgallagher@me.com",vehicle:"2022 BMW M3 Competition",chassis:"G80",engine:"S58",platform:"EcuTek",rev:"Rev 5",status:"Ready to Deliver",priority:"Med",last:"1h ago",fuel:"E50",order:"SP-1834",next:"Send customer update",tone:"purple",waitingOn:"Doug",customerSince:"2025",vehicles:1},
  {id:4,name:"Sarah Chen",email:"s.chen.bmw@icloud.com",vehicle:"2020 Toyota Supra",chassis:"A90",engine:"B58",platform:"MHD",rev:"Rev 2",status:"Waiting on Customer",priority:"Med",last:"3h ago",fuel:"93",order:"SP-1830",next:"Waiting for pull",tone:"amber",waitingOn:"Customer",customerSince:"2026",vehicles:1},
  {id:5,name:"Tyler Brooks",email:"tyler.brooks@gmail.com",vehicle:"2015 BMW 335i xDrive",chassis:"F30",engine:"N55",platform:"MHD",rev:"Rev 4",status:"Compatibility Review",priority:"Low",last:"5h ago",fuel:"E30",order:"SP-1827",next:"Review ROM details",tone:"blue",waitingOn:"Doug",customerSince:"2023",vehicles:2},
  {id:6,name:"Carlos Mendez",email:"c.mendez.tuning@hotmail.com",vehicle:"2016 BMW M4",chassis:"F82",engine:"S55",platform:"BM3",rev:"Rev 1",status:"New Order",priority:"High",last:"Just now",fuel:"93",order:"SP-1846",next:"Send intake",tone:"amber",waitingOn:"Customer",customerSince:"2026",vehicles:1},
  {id:7,name:"Jordan Patel",email:"jpatel@proton.me",vehicle:"2024 BMW M2",chassis:"G87",engine:"S58",platform:"EcuTek",rev:"Rev 1",status:"Vehicle Info Received",priority:"Med",last:"11m ago",fuel:"E50",order:"SP-1845",next:"Review intake",tone:"blue",waitingOn:"Doug",customerSince:"2026",vehicles:1},
  {id:8,name:"Brandon Cole",email:"brandon@icloud.com",vehicle:"2023 BMW X3 M40i",chassis:"G01",engine:"B58TU",platform:"MHD",rev:"Rev 3",status:"Log Uploaded",priority:"High",last:"29m ago",fuel:"E35",order:"SP-1822",next:"Review HPFP trace",tone:"green",waitingOn:"Doug",customerSince:"2025",vehicles:1}
];

export const closedTunes = [
  {order:"SP-1818",name:"Derek Shaw",vehicle:"2021 Toyota Supra",engine:"B58TU",platform:"MHD",finalRev:"Rev 5",fuel:"E50",closed:"Sep 12",duration:"9 days"},
  {order:"SP-1815",name:"Emily Park",vehicle:"2020 BMW M340i",engine:"B58TU",platform:"MHD",finalRev:"Rev 4",fuel:"93",closed:"Sep 10",duration:"6 days"},
  {order:"SP-1809",name:"Chris Walton",vehicle:"2018 BMW M3",engine:"S55",platform:"BM3",finalRev:"Rev 6",fuel:"E30",closed:"Sep 8",duration:"12 days"},
  {order:"SP-1803",name:"Nate Collins",vehicle:"2023 BMW M4 Competition",engine:"S58",platform:"EcuTek",finalRev:"Rev 5",fuel:"E50",closed:"Sep 5",duration:"10 days"}
];

export const activities = [
  {type:"log",text:"Alex Rivera uploaded 2 MHD logs",time:"18m ago",tone:"green",order:"SP-1842"},
  {type:"email",text:"EcuTek log alert matched to Ryan Gallagher",time:"31m ago",tone:"purple",order:"SP-1834"},
  {type:"order",text:"Carlos Mendez purchased an S55 custom tune",time:"Just now",tone:"amber",order:"SP-1846"},
  {type:"revision",text:"Mike Tremblay moved into Rev 2",time:"46m ago",tone:"red",order:"SP-1839"},
  {type:"message",text:"Sarah Chen replied through Gmail",time:"3h ago",tone:"blue",order:"SP-1830"},
  {type:"intake",text:"Jordan Patel completed vehicle intake",time:"11m ago",tone:"green",order:"SP-1845"}
];

export const messageThreads = [
  {order:"SP-1842",name:"Alex Rivera",subject:"Rev 4 logs uploaded",preview:"Car feels much smoother on this revision.",time:"18m",unread:1},
  {order:"SP-1830",name:"Sarah Chen",subject:"Question about next pull",preview:"Should I keep the same fuel mix for this one?",time:"3h",unread:2},
  {order:"SP-1846",name:"Carlos Mendez",subject:"New order confirmation",preview:"Thanks — I’ll fill the intake out tonight.",time:"4h",unread:1},
  {order:"SP-1834",name:"Ryan Gallagher",subject:"Ready for Rev 5",preview:"Everything felt great on the last file.",time:"Yesterday",unread:0}
];

export const integrations = [
  {name:"Wix",status:"Ready",tone:"green",detail:"Orders, products, customers and payment state",last:"Demo mode"},
  {name:"Gmail",status:"Ready",tone:"green",detail:"Customer threads, intake emails and EcuTek alerts",last:"Demo mode"},
  {name:"MHD",status:"Planned",tone:"blue",detail:"Primary tuning workflow, logs and stock-file orchestration",last:"Deep integration next"},
  {name:"bootmod3",status:"Planned",tone:"blue",detail:"Tune-request, log and status ingestion",last:"Partner/API research"},
  {name:"EcuTek",status:"Planned",tone:"purple",detail:"Email alert matching and ECU Connect activity",last:"Email ingestion first"},
  {name:"Datazap",status:"Planned",tone:"purple",detail:"Shared log URLs and normalized log metadata",last:"Parser scaffold next"}
];

export const automationRules = [
  {name:"Request MHD stock file",trigger:"Paid order + MHD + stock file missing",action:"Email customer + portal task",runs:12,status:"Active"},
  {name:"Send logging parameter pack",trigger:"Stock file received + engine identified",action:"Attach versioned pack + mark setup ready",runs:9,status:"Active"},
  {name:"Route uploaded log",trigger:"New CSV / log event",action:"Attach to revision + move into Doug queue",runs:18,status:"Active"},
  {name:"Revision follow-up",trigger:"Revision published",action:"Send install/log instructions + start waiting state",runs:14,status:"Active"},
  {name:"Customer inactivity",trigger:"Waiting on customer > 48h",action:"Send reminder + leave audit event",runs:6,status:"Draft"}
];

export const dashboardStats = [
  {label:"New Orders",value:"3",sub:"Awaiting intake / review",tone:"amber"},
  {label:"Logs Waiting",value:"7",sub:"MHD / BM3 / EcuTek",tone:"green"},
  {label:"Revisions Due",value:"4",sub:"Needs Doug",tone:"red"},
  {label:"Ready to Deliver",value:"2",sub:"Customer-ready",tone:"purple"},
  {label:"Unread Messages",value:"6",sub:"Customer threads",tone:"blue"},
  {label:"Active Tunes",value:"18",sub:"Across 17 vehicles",tone:"white"},
  {label:"Waiting on Customer",value:"5",sub:"Info / logs / confirmation",tone:"amber"},
  {label:"Closed This Month",value:"11",sub:"Archived to vehicle history",tone:"green"}
];

export function projectPath(job) {
  if (!job) return "/";
  if (job.order === "SP-1846") return "/intake/SP-1846";
  if (job.order === "SP-1842") return "/project/SP-1842";
  return `/?project=${job.order}`;
}

export function deepPath(order, type = "project") {
  if (order === "SP-1842") {
    if (type === "log") return "/log-review/SP-1842";
    if (type === "revision") return "/revision/SP-1842";
    if (type === "portal") return "/portal/SP-1842";
    if (type === "workflow") return "/workflow/SP-1842";
    if (type === "closeout") return "/closeout/SP-1842";
    return "/project/SP-1842";
  }
  if (order === "SP-1846") return "/intake/SP-1846";
  return `/?project=${order}`;
}

export function findJob(order) {
  return jobs.find(job => job.order === order);
}
