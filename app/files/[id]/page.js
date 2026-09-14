import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FolderLock } from "lucide-react";
import { getProjectById } from "../../server/repository";
import FileManager from "./file-manager";
import styles from "./files.module.css";

export default async function FilesPage({params}){
  const {id}=await params;
  const project=await getProjectById(id);
  if(!project) notFound();
  return <main className={styles.page}>
    <header className={styles.topbar}><Link href={project.projectNumber==="SP-1842"?`/project/${project.projectNumber}`:"/"} className={styles.back}><ArrowLeft size={15}/> Project</Link><div className={styles.brand}><img src="/subpar-logo.png" alt="Subpar Tuning"/><div><b>SUBPAR OS</b><span>PRIVATE FILE MANAGER</span></div></div><div className={styles.project}><FolderLock size={14}/>{project.projectNumber}</div></header>
    <section className={styles.hero}><div><span>SECURE PROJECT STORAGE</span><h1>{project.customer?.name} · {project.vehicle?.model}</h1><p>Stock files, tune revisions, datalogs, parameter packs and customer uploads remain private and tied to the project history.</p></div><div><b>{project.files?.length||0}</b><span>REGISTERED FILES</span></div></section>
    <FileManager project={project}/>
  </main>;
}
