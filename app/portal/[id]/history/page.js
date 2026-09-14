import CustomerTuneHistoryClient from "./history-client";

export default async function CustomerTuneHistoryPage({params}){
  const {id}=await params;
  return <CustomerTuneHistoryClient projectNumber={id}/>;
}
