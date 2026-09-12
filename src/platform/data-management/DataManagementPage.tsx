import { useRef, useState } from "react";
import { DatabaseBackup, Download, FileUp, ShieldCheck } from "lucide-react";
import { Badge, Button, Card, ConfirmDialog, SectionHeader } from "../../shared/components";
import { useToast } from "../../shared/feedback/ToastProvider";
import { platformStore } from "../services/platformStore";

const PREFIX = "nextf.";
type ExportBundle = { schema: "nextf-cms-local-backup"; version: string; exportedAt: string; records: Record<string,string> };
type PendingImport = { name:string; records:Record<string,string>; sourceVersion:string };

function collect(): ExportBundle {
  const records: Record<string,string> = {};
  for (let i=0;i<window.localStorage.length;i+=1) { const key=window.localStorage.key(i); if (key?.startsWith(PREFIX)) records[key]=window.localStorage.getItem(key) ?? ""; }
  return { schema:"nextf-cms-local-backup",version:"0.8.0",exportedAt:new Date().toISOString(),records };
}

function parseBackup(raw:string, name:string): PendingImport {
  const parsed=JSON.parse(raw) as Partial<ExportBundle>;
  if(parsed.schema!=="nextf-cms-local-backup"||!parsed.records||typeof parsed.records!=="object") throw new Error("Unsupported backup format.");
  const entries=Object.entries(parsed.records);
  if(!entries.length) throw new Error("The backup contains no CMS records.");
  if(entries.some(([key,value])=>!key.startsWith(PREFIX)||typeof value!=="string")) throw new Error("The backup contains invalid or non-CMS records.");
  return {name,records:Object.fromEntries(entries),sourceVersion:parsed.version??"unknown"};
}

export function DataManagementPage() {
  const inputRef = useRef<HTMLInputElement>(null); const {notify}=useToast();
  const [message, setMessage] = useState("Local data is ready for export."); const [tone, setTone] = useState<"success"|"info"|"danger">("info"); const [pending,setPending]=useState<PendingImport|null>(null);
  const exportData = () => { const bundle=collect(); const blob=new Blob([JSON.stringify(bundle,null,2)],{type:"application/json"}); const url=URL.createObjectURL(blob); const link=document.createElement("a"); link.href=url; link.download=`next-f-cms-local-backup-${new Date().toISOString().slice(0,10)}.json`; link.click(); URL.revokeObjectURL(url); platformStore.addAudit("Admin","Local data exported","CMS backup","Platform",`${Object.keys(bundle.records).length} local storage records exported.`,"info"); setMessage(`Exported ${Object.keys(bundle.records).length} CMS records.`); setTone("success"); notify({title:"Backup exported",description:`${Object.keys(bundle.records).length} local CMS records were bundled.`,tone:"success"}); };
  const inspectImport = async (file?: File) => { if(!file)return; try { const parsed=parseBackup(await file.text(),file.name); setPending(parsed); setMessage(`Validated ${Object.keys(parsed.records).length} records from ${file.name}. Confirmation required before restore.`); setTone("info"); } catch(error){ const detail=error instanceof Error ? error.message : "Import failed."; setMessage(detail); setTone("danger"); notify({title:"Backup rejected",description:detail,tone:"danger"}); } finally { if(inputRef.current) inputRef.current.value=""; } };
  const applyImport=()=>{if(!pending)return;Object.entries(pending.records).forEach(([key,value])=>window.localStorage.setItem(key,value)); platformStore.addAudit("Admin","Local data imported",pending.name,"Platform",`${Object.keys(pending.records).length} records restored into local development from schema ${pending.sourceVersion}.`,"warning"); window.dispatchEvent(new StorageEvent("storage")); setMessage(`Imported ${Object.keys(pending.records).length} records from ${pending.name}.`); setTone("success"); notify({title:"Local data restored",description:`${Object.keys(pending.records).length} records were applied.`,tone:"success"});};
  const recordCount=Object.keys(collect().records).length;
  return <div className="page"><SectionHeader eyebrow="Platform" title="Local data management" description="Export and restore the complete browser-persistent CMS development dataset before production infrastructure is introduced." />
    <div className="compact-metrics"><Card><span><DatabaseBackup size={17}/>Local records</span><strong>{recordCount}</strong></Card><Card><span><ShieldCheck size={17}/>Format</span><strong>JSON</strong></Card><Card><span>Schema</span><strong>V0.8</strong></Card><Card><span>Infrastructure</span><strong>Local</strong></Card></div>
    <div className="dashboard-grid"><Card><SectionHeader title="Export snapshot" description="Creates one portable JSON bundle containing only NEXT F CMS local-development keys."/><Button variant="primary" onClick={exportData}><Download size={16}/>Export local backup</Button></Card><Card><SectionHeader title="Restore snapshot" description="Validates an exported local backup first, then asks for confirmation before overwriting matching CMS keys."/><input ref={inputRef} className="visually-hidden" type="file" accept="application/json,.json" onChange={(event)=>void inspectImport(event.target.files?.[0])}/><Button onClick={()=>inputRef.current?.click()}><FileUp size={16}/>Import backup</Button></Card></div>
    <Card className="architecture-callout"><div className="data-status"><Badge tone={tone}>{tone === "danger" ? "Import error" : tone === "success" ? "Complete" : "Ready"}</Badge><span>{message}</span></div><p>This is a development continuity tool, not the final production backup system. D1/R2 backup and disaster-recovery policies belong to the later infrastructure phase.</p></Card>
    <ConfirmDialog open={!!pending} onClose={()=>setPending(null)} title="Restore local CMS backup?" description={pending?`${pending.name} contains ${Object.keys(pending.records).length} NEXT F CMS records from schema ${pending.sourceVersion}. Matching local records will be overwritten.`:""} confirmLabel="Restore backup" danger onConfirm={applyImport}/>
  </div>;
}
