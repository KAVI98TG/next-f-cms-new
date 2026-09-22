import { useRef, useState } from "react";
import { DatabaseBackup, Download, FileUp, ShieldCheck } from "lucide-react";
import { Badge, Button, Card, ConfirmDialog, SectionHeader } from "../../shared/components";
import { useToast } from "../../shared/feedback/ToastProvider";
import { platformStore } from "../services/platformStore";
import { exportDurableStorageRecords, importDurableStorageRecords, getDurableStateStatus } from "../../services/production/durableStorage";
import { readRuntimeTruth } from "../../services/production/runtime";

const runtime=readRuntimeTruth();

const PREFIX = "nextf.";
type ExportBundle = { schema: "nextf-cms-durable-backup"; version: string; exportedAt: string; records: Record<string,string> };
type PendingImport = { name:string; records:Record<string,string>; sourceVersion:string };

function collect(): ExportBundle {
  return { schema:"nextf-cms-durable-backup",version:"0.24.0",exportedAt:new Date().toISOString(),records:exportDurableStorageRecords(PREFIX) };
}

function parseBackup(raw:string, name:string): PendingImport {
  const parsed=JSON.parse(raw) as Partial<ExportBundle>;
  if(!["nextf-cms-durable-backup","nextf-cms-local-backup"].includes(String(parsed.schema))||!parsed.records||typeof parsed.records!=="object") throw new Error("Unsupported backup format.");
  const entries=Object.entries(parsed.records);
  if(!entries.length) throw new Error("The backup contains no CMS records.");
  if(entries.some(([key,value])=>!key.startsWith(PREFIX)||typeof value!=="string")) throw new Error("The backup contains invalid or non-CMS records.");
  return {name,records:Object.fromEntries(entries),sourceVersion:parsed.version??"unknown"};
}

export function DataManagementPage() {
  const inputRef = useRef<HTMLInputElement>(null); const {notify}=useToast();
  const [message, setMessage] = useState("CMS durable data is ready for export."); const [tone, setTone] = useState<"success"|"info"|"danger">("info"); const [pending,setPending]=useState<PendingImport|null>(null);
  const exportData = () => { const bundle=collect(); const blob=new Blob([JSON.stringify(bundle,null,2)],{type:"application/json"}); const url=URL.createObjectURL(blob); const link=document.createElement("a"); link.href=url; link.download=`next-f-cms-durable-backup-${new Date().toISOString().slice(0,10)}.json`; link.click(); URL.revokeObjectURL(url); platformStore.addAudit("Admin","CMS data exported","CMS backup","Platform",`${Object.keys(bundle.records).length} durable CMS records exported.`,"info"); setMessage(`Exported ${Object.keys(bundle.records).length} CMS records.`); setTone("success"); notify({title:"Backup exported",description:`${Object.keys(bundle.records).length} CMS records were bundled.`,tone:"success"}); };
  const inspectImport = async (file?: File) => { if(!file)return; try { const parsed=parseBackup(await file.text(),file.name); setPending(parsed); setMessage(`Validated ${Object.keys(parsed.records).length} records from ${file.name}. Confirmation required before restore.`); setTone("info"); } catch(error){ const detail=error instanceof Error ? error.message : "Import failed."; setMessage(detail); setTone("danger"); notify({title:"Backup rejected",description:detail,tone:"danger"}); } finally { if(inputRef.current) inputRef.current.value=""; } };
  const applyImport=()=>{if(!pending||runtime.mode==="production-api")return;importDurableStorageRecords(pending.records,PREFIX); platformStore.addAudit("Admin","CMS data imported",pending.name,"Platform",`${Object.keys(pending.records).length} records restored through the durable storage boundary from schema ${pending.sourceVersion}.`,"warning"); window.dispatchEvent(new CustomEvent("nextf:durable-state")); setMessage(`Imported ${Object.keys(pending.records).length} records from ${pending.name}.`); setTone("success"); notify({title:"CMS data restored",description:`${Object.keys(pending.records).length} records were applied.`,tone:"success"});};
  const recordCount=Object.keys(collect().records).length;
  return <div className="page"><SectionHeader eyebrow="Platform" title="Data management" description={runtime.mode==="production-api"?"Export production CMS data for controlled portability. Production recovery uses D1 Time Travel.":"Export and restore local CMS data."} />
    <div className="compact-metrics"><Card><span><DatabaseBackup size={17}/>CMS records</span><strong>{recordCount}</strong></Card><Card><span><ShieldCheck size={17}/>Format</span><strong>JSON</strong></Card><Card><span>Storage</span><strong>{getDurableStateStatus().mode === "production-api" ? "D1" : "Local"}</strong></Card><Card><span>Recovery</span><strong>{runtime.mode === "production-api" ? "D1 Time Travel" : "Local restore"}</strong></Card></div>
    <div className="dashboard-grid"><Card><SectionHeader title="Export application data" description="Create a portable JSON export of CMS durable data."/><Button variant="primary" onClick={exportData}><Download size={16}/>Export data</Button></Card><Card><SectionHeader title={runtime.mode==="production-api"?"Production import restricted":"Restore local snapshot"} description={runtime.mode==="production-api"?"Browser import is disabled in production. Use D1 Time Travel for recovery.":"Validate a CMS backup before overwriting matching local records."}/><input ref={inputRef} className="visually-hidden" type="file" accept="application/json,.json" onChange={(event)=>void inspectImport(event.target.files?.[0])}/><Button disabled={runtime.mode==="production-api"} onClick={()=>inputRef.current?.click()}><FileUp size={16}/>{runtime.mode==="production-api"?"Import disabled":"Import data"}</Button></Card></div>
    <Card className="architecture-callout"><div className="data-status"><Badge tone={tone}>{tone === "danger" ? "Import error" : tone === "success" ? "Complete" : "Ready"}</Badge><span>{message}</span></div><p>Exports are for data portability. Production recovery uses D1 Time Travel.</p></Card>
    <ConfirmDialog open={runtime.mode!=="production-api"&&!!pending} onClose={()=>setPending(null)} title="Restore CMS backup?" description={pending?`${pending.name} contains ${Object.keys(pending.records).length} NEXT F CMS records from schema ${pending.sourceVersion}. Matching durable records will be overwritten.`:""} confirmLabel="Restore backup" danger onConfirm={applyImport}/>
  </div>;
}
