import { useEffect, useMemo, useState } from 'react';
import { Activity, Boxes, CheckCircle2, Eye, PlugZap, RefreshCw, Save, ShieldCheck, SlidersHorizontal, WalletCards } from 'lucide-react';
import { Badge, Button, Card, FormField, MetricCard, SectionHeader, TextInput, Toggle } from '../../shared/components';
import { useToast } from '../../shared/feedback/ToastProvider';
import { flushDurableWrites } from '../../services/production/durableStorage';
import { gamingDate } from '../shared/format';
import { GamingKindBadge } from '../shared/GamingKindBadge';
import { useGamingStore } from '../shared/useGamingStore';
import { getFazerConfig, getFazerStatus, queueFazerCommand, refreshFazerConfig, refreshFazerStatus, saveFazerConfig, type FazerCatalogKind } from '../live/fazercardsControl';

const KIND_LABELS:Array<[FazerCatalogKind,string]>=[['topup','Top-ups'],['gift_card','Gift cards'],['game_key','Game keys'],['manual_service','Manual services']];

export function SuppliersPage(){
  const config=useGamingStore(getFazerConfig);const status=useGamingStore(getFazerStatus);const {notify}=useToast();
  const [draft,setDraft]=useState(config);const [busy,setBusy]=useState(false);const [pending,setPending]=useState<string|undefined>();
  useEffect(()=>setDraft(config),[config]);
  useEffect(()=>{void Promise.allSettled([refreshFazerConfig(),refreshFazerStatus()]);},[]);
  const dirty=useMemo(()=>JSON.stringify(draft)!==JSON.stringify(config),[draft,config]);
  useEffect(()=>{if(!dirty)return;const handler=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};window.addEventListener('beforeunload',handler);return()=>window.removeEventListener('beforeunload',handler);},[dirty]);
  const save=async()=>{setBusy(true);try{saveFazerConfig(draft);await flushDurableWrites();notify({title:'FazerCards settings saved',description:'Production supplier configuration is stored in D1. Credentials remain Worker secrets.',tone:'success'});}catch(error){notify({title:'Supplier settings failed',description:error instanceof Error?error.message:'Unable to save supplier configuration.',tone:'danger'});}finally{setBusy(false);}};
  const refresh=async()=>{setBusy(true);try{await refreshFazerStatus();notify({title:'Supplier status refreshed',description:'Latest production Worker health and supplier status loaded.',tone:'success'});}catch(error){notify({title:'Refresh failed',description:error instanceof Error?error.message:'Unable to refresh supplier state.',tone:'danger'});}finally{setBusy(false);}};
  const waitForCommand=async(id:string)=>{for(let attempt=0;attempt<15;attempt+=1){await new Promise((resolve)=>setTimeout(resolve,5000));try{const next=await refreshFazerStatus();if(next.lastProcessedCommandId===id){setPending(undefined);if(next.lastError)notify({title:'FazerCards operation failed',description:next.lastError,tone:'danger'});else notify({title:'FazerCards operation completed',description:'The Gaming Worker processed the CMS request.',tone:'success'});return;}}catch{/* continue */}}setPending(undefined);notify({title:'Operation still queued',description:'The Worker runs every minute. Refresh shortly to load the result.',tone:'info'});};
  const run=async(action:'health'|'preview'|'sync')=>{setBusy(true);try{const cmd=queueFazerCommand(action,action==='health'?undefined:draft.catalogKinds);await flushDurableWrites();setPending(cmd.id);notify({title:action==='health'?'Health check queued':action==='preview'?'Catalog preview queued':'Catalog sync queued',description:'The production Gaming Worker will process this request within about one minute.',tone:'info'});void waitForCommand(cmd.id);}catch(error){notify({title:'Supplier command failed',description:error instanceof Error?error.message:'Unable to queue supplier operation.',tone:'danger'});}finally{setBusy(false);}};
  const toggleKind=(kind:FazerCatalogKind,enabled:boolean)=>setDraft({...draft,catalogKinds:enabled?[...new Set([...draft.catalogKinds,kind])]:draft.catalogKinds.filter((item)=>item!==kind)});
  const summary=status.lastSync;const preview=status.lastPreview;
  const selectedKindCount=draft.catalogKinds.length;
  return <div className="page supplier-control-page">
    <SectionHeader eyebrow="Gaming Store" title="Suppliers" description="Monitor provider health, control runtime publishing and run catalog synchronization from one canonical supplier workspace." action={<Button onClick={refresh} disabled={busy}><RefreshCw size={14}/>Refresh status</Button>}/>

    <div className="supplier-health-strip">
      <MetricCard label="FazerCards" value={status.connected?'Connected':'Needs check'} detail={status.account?.plan?`${status.account.plan} plan`:'Production adapter'} icon={PlugZap}/>
      <MetricCard label="Supplier balance" value={status.balance?`${status.balance.amount} ${status.balance.currency}`:'—'} detail={status.lastHealthAt?`Checked ${gamingDate(status.lastHealthAt)}`:'Run health check'} icon={WalletCards}/>
      <MetricCard label="Last health check" value={status.lastHealthAt?gamingDate(status.lastHealthAt):'Not checked'} detail={status.connected?'Provider connection healthy':'Health status needs confirmation'} icon={Activity}/>
      <MetricCard label="Last catalog sync" value={summary?String(summary.productsWritten):'—'} detail={summary?`${summary.offersWritten} offers · ${gamingDate(summary.completedAt)}`:'No CMS-visible sync result yet'} icon={Boxes}/>
    </div>

    {status.lastError?<Card className="supplier-alert-card"><div><span className="supplier-alert-card__icon"><Activity size={18}/></span><div><strong>Last supplier operation failed</strong><p>{status.lastError}</p></div></div><Badge tone="danger">Attention</Badge></Card>:null}

    <div className="supplier-control-grid">
      <Card className="supplier-panel supplier-runtime-panel">
        <div className="operation-section__head"><div><span>Runtime & publishing</span><h3>Production behavior</h3></div><div className="supplier-panel-status"><Badge tone={draft.enabled?'success':'neutral'}>{draft.enabled?'Enabled':'Disabled'}</Badge>{dirty?<Badge tone="warning">Unsaved</Badge>:<Badge tone="success">Saved</Badge>}</div></div>
        <p className="supplier-panel-copy">These settings control how FazerCards participates in live catalog and fulfillment. Credentials remain server-side.</p>
        <div className="form-grid form-grid--two supplier-runtime-fields"><FormField label="Base API URL" hint="Non-secret provider endpoint used by the Gaming Worker."><TextInput value={draft.baseUrl} onChange={(event)=>setDraft({...draft,baseUrl:event.target.value})}/></FormField><FormField label="Maximum categories per sync" hint="Safety cap for each catalog synchronization run."><TextInput type="number" min="1" max="200" value={draft.maxCategoriesPerSync} onChange={(event)=>setDraft({...draft,maxCategoriesPerSync:Number(event.target.value)})}/></FormField></div>
        <div className="supplier-toggle-grid">
          <div className="supplier-toggle-card"><div><span className="supplier-toggle-card__icon"><PlugZap size={16}/></span><span><strong>Supplier runtime</strong><small>Allow FazerCards catalog and fulfillment operations.</small></span></div><Toggle checked={draft.enabled} onChange={(enabled)=>setDraft({...draft,enabled})}/></div>
          <div className="supplier-toggle-card"><div><span className="supplier-toggle-card__icon"><Boxes size={16}/></span><span><strong>Auto-publish products</strong><small>Make synchronized NEXT F products public when available.</small></span></div><Toggle checked={draft.autoPublishProducts} onChange={(autoPublishProducts)=>setDraft({...draft,autoPublishProducts})}/></div>
          <div className="supplier-toggle-card"><div><span className="supplier-toggle-card__icon"><SlidersHorizontal size={16}/></span><span><strong>Auto-publish offers</strong><small>Allow available supplier offers to become sellable immediately.</small></span></div><Toggle checked={draft.autoPublishOffers} onChange={(autoPublishOffers)=>setDraft({...draft,autoPublishOffers})}/></div>
        </div>
        <div className="supplier-save-bar"><div>{dirty?<><strong>Unsaved changes</strong><small>Save before leaving to apply these runtime settings.</small></>:<><strong>Configuration saved</strong><small>Production D1 matches the current form.</small></>}</div><Button variant="primary" onClick={save} disabled={busy||!dirty||!draft.catalogKinds.length}><Save size={14}/>{busy?'Saving…':'Save changes'}</Button></div>
      </Card>

      <Card className="supplier-panel supplier-sync-panel">
        <div className="operation-section__head"><div><span>Catalog synchronization</span><h3>Choose what FazerCards may import</h3></div><Badge tone={selectedKindCount?'info':'warning'}>{selectedKindCount} selected</Badge></div>
        <p className="supplier-panel-copy">Select the supplier families that belong in the NEXT F catalog. Preview first when you want to inspect the incoming scope without writing it.</p>
        <div className="supplier-kind-grid">{KIND_LABELS.map(([kind,label])=>{const active=draft.catalogKinds.includes(kind);return <button type="button" key={kind} className={`supplier-kind-tile ${active?'is-active':''}`} aria-pressed={active} onClick={()=>toggleKind(kind,!active)}><span className="supplier-kind-tile__check">{active?<CheckCircle2 size={16}/>:null}</span><span><strong>{label}</strong><GamingKindBadge kind={kind}/></span></button>;})}</div>
        <div className="supplier-sync-summary">
          <div><span>Last preview</span><strong>{preview?`${preview.productsWritten} products`:'Not run'}</strong><small>{preview?`${preview.offersWritten} offers · ${gamingDate(preview.completedAt)}`:'Preview before syncing if the supplier scope changed.'}</small></div>
          <div><span>Last sync</span><strong>{summary?`${summary.productsWritten} products`:'Not run'}</strong><small>{summary?`${summary.offersWritten} offers · ${gamingDate(summary.completedAt)}`:'No completed synchronization is visible yet.'}</small></div>
        </div>
        <div className="supplier-command-grid">
          <Button onClick={()=>run('health')} disabled={busy||!!pending}><Activity size={14}/>Health check</Button>
          <Button onClick={()=>run('preview')} disabled={busy||!!pending||dirty||!selectedKindCount}><Eye size={14}/>Preview catalog</Button>
          <Button variant="primary" onClick={()=>run('sync')} disabled={busy||!!pending||dirty||!selectedKindCount}><RefreshCw size={14}/>Sync catalog</Button>
        </div>
        {dirty?<p className="supplier-command-note">Save configuration changes before previewing or syncing the supplier catalog.</p>:null}{pending?<div className="supplier-pending-state"><RefreshCw size={15}/><div><strong>Worker request queued</strong><small>This page is polling automatically. The scheduled processor runs once per minute.</small></div></div>:null}
      </Card>
    </div>

    <div className="supplier-safeguards-grid">
      <Card className="supplier-safeguard"><ShieldCheck size={18}/><div><span>Canonical supplier architecture</span><strong>No placeholder provider registry</strong><p>Future suppliers appear only after a real server adapter, credentials boundary, health state and canonical routing integration exist.</p></div><Badge tone="info">Canonical only</Badge></Card>
      <Card className="supplier-safeguard"><ShieldCheck size={18}/><div><span>Secret boundary</span><strong>API key stays out of the CMS browser</strong><p><code>FAZERCARDS_API_KEY</code> remains a <code>nextf-gaming-api</code> Worker secret. CMS stores only non-secret settings and audited commands.</p></div><Badge tone="success">Server-side only</Badge></Card>
    </div>
  </div>;
}
