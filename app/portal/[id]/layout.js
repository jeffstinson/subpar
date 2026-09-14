import PortalHistoryShortcut from "./portal-history-shortcut";

export default async function PortalProjectLayout({children,params}){
  const {id}=await params;
  return <>{children}<PortalHistoryShortcut projectNumber={id}/></>;
}
