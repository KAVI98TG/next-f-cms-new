import { useState } from "react";
import { Settings2, ShieldCheck } from "lucide-react";
import { Button, Card, FormField, SectionHeader, TextInput, Toggle } from "../../shared/components";
import { gamingStore } from "../data/gamingStore";
import { useGamingStore } from "../shared/useGamingStore";

export function GamingSettingsPage(){
 const settings=useGamingStore(gamingStore.getSettings); const [draft,setDraft]=useState(settings);
 return <div className="page"><SectionHeader eyebrow="Gaming Store" title="Operational Settings" description="Fulfillment safeguards and operational thresholds."/><Card className="operation-section"><div className="operation-section__head"><div><span>Fulfillment policy</span><h3>Operational safeguards</h3></div><ShieldCheck size={18}/></div><div className="settings-list"><div className="settings-row"><span><strong>Auto-pause unavailable products</strong></span><Toggle checked={draft.autoPauseUnavailableProducts} onChange={(value)=>setDraft({...draft,autoPauseUnavailableProducts:value})}/></div><div className="settings-row"><span><strong>Require account validation where supported</strong></span><Toggle checked={draft.requireValidationWhenSupported} onChange={(value)=>setDraft({...draft,requireValidationWhenSupported:value})}/></div></div><div className="form-grid"><FormField label="Low supplier balance warning (USD)"><TextInput type="number" value={draft.lowSupplierBalanceUsd} onChange={(e)=>setDraft({...draft,lowSupplierBalanceUsd:Number(e.target.value)})}/></FormField></div><div className="modal-actions"><Button variant="primary" onClick={()=>gamingStore.saveSettings(draft)}><Settings2 size={14}/> Save settings</Button></div></Card></div>;
}
