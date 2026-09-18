import { useEffect, useMemo, useState } from 'react';
import { BadgeDollarSign, CalendarClock, CheckCircle2, CirclePercent, CopyPlus, Megaphone, Pause, Pencil, Play, Plus, RefreshCw, Search, ShieldCheck, Sparkles, Target, TicketPercent, X } from 'lucide-react';
import { Badge, Button, Card, FormField, Modal, SectionHeader, SelectInput, StatePanel, TextInput } from '../../shared/components';
import { useToast } from '../../shared/feedback/ToastProvider';
import { gamingDate, gamingLkr } from '../shared/format';
import { createGamingPromotion, loadGamingPromotionsSnapshot, updateGamingPromotion, type GamingPromotionCampaign, type GamingPromotionDraft, type GamingPromotionsSnapshot } from './promotions';

const emptyDraft=():GamingPromotionDraft=>({name:'',status:'draft',applicationMode:'coupon',code:'',discountType:'percent',discountValue:10,minSpendLkr:0,startAt:null,endAt:null,productIds:[],offerIds:[],maxRedemptions:null,perCustomerLimit:1,marginFloorLkr:0});
const csv=(value:string)=>value.split(',').map((item)=>item.trim()).filter(Boolean);
const localTime=(value?:string|null)=>value?new Date(value).toISOString().slice(0,16):'';
const now=()=>Date.now();
type CampaignView='all'|'active'|'scheduled'|'draft'|'paused'|'ended'|'archived';
type BuilderStep=0|1|2|3|4|5;
const STEP_LABELS=['Basics','Discount','Scope','Schedule','Limits & safety','Review'] as const;

function lifecycle(campaign:GamingPromotionCampaign):Exclude<CampaignView,'all'>{
  if(campaign.status==='archived')return 'archived';
  if(campaign.status==='draft')return 'draft';
  if(campaign.status==='paused')return 'paused';
  if(campaign.endAt&&new Date(campaign.endAt).getTime()<now())return 'ended';
  if(campaign.startAt&&new Date(campaign.startAt).getTime()>now())return 'scheduled';
  return 'active';
}
function campaignTone(status:Exclude<CampaignView,'all'>):'success'|'warning'|'neutral'|'info'|'danger'{
  if(status==='active')return 'success';
  if(status==='scheduled')return 'info';
  if(status==='paused')return 'warning';
  if(status==='ended'||status==='archived')return 'neutral';
  return 'info';
}
function toDraft(campaign:GamingPromotionCampaign):GamingPromotionDraft&{campaignId:string}{
  return {campaignId:campaign.campaignId,name:campaign.name,status:campaign.status,applicationMode:campaign.applicationMode,code:campaign.code||'',discountType:campaign.discountType,discountValue:campaign.discountValue,minSpendLkr:campaign.minSpendLkr,startAt:campaign.startAt||null,endAt:campaign.endAt||null,productIds:campaign.productIds,offerIds:campaign.offerIds,maxRedemptions:campaign.maxRedemptions??null,perCustomerLimit:campaign.perCustomerLimit??null,marginFloorLkr:campaign.marginFloorLkr};
}
function discountLabel(campaign:Pick<GamingPromotionDraft,'discountType'|'discountValue'>){return campaign.discountType==='percent'?`${campaign.discountValue}% off`:`${gamingLkr(campaign.discountValue)} off`;}
function scopeLabel(campaign:Pick<GamingPromotionDraft,'productIds'|'offerIds'>){
  if(!campaign.productIds.length&&!campaign.offerIds.length)return 'All eligible catalog items';
  const parts=[]; if(campaign.productIds.length)parts.push(`${campaign.productIds.length} product${campaign.productIds.length===1?'':'s'}`); if(campaign.offerIds.length)parts.push(`${campaign.offerIds.length} offer${campaign.offerIds.length===1?'':'s'}`); return parts.join(' · ');
}
function scheduleLabel(campaign:Pick<GamingPromotionDraft,'startAt'|'endAt'>){
  if(!campaign.startAt&&!campaign.endAt)return 'No schedule window';
  if(campaign.startAt&&campaign.endAt)return `${gamingDate(campaign.startAt)} → ${gamingDate(campaign.endAt)}`;
  if(campaign.startAt)return `Starts ${gamingDate(campaign.startAt)}`;
  return `Ends ${gamingDate(campaign.endAt||undefined)}`;
}

export function PromotionsPage(){
  const {notify}=useToast();
  const [snapshot,setSnapshot]=useState<GamingPromotionsSnapshot>();
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [draft,setDraft]=useState<GamingPromotionDraft>(emptyDraft());
  const [open,setOpen]=useState(false);
  const [busy,setBusy]=useState(false);
  const [busyCampaign,setBusyCampaign]=useState<string>();
  const [step,setStep]=useState<BuilderStep>(0);
  const [view,setView]=useState<CampaignView>('all');
  const [query,setQuery]=useState('');

  const load=async()=>{setLoading(true);setError('');try{setSnapshot(await loadGamingPromotionsSnapshot());}catch(err){setError(err instanceof Error?err.message:'Promotions could not be loaded.');}finally{setLoading(false);}};
  useEffect(()=>{void load();},[]);
  const editing=Boolean(draft.campaignId);
  const openCreate=()=>{setDraft(emptyDraft());setStep(0);setOpen(true);};
  const startEdit=(campaign:GamingPromotionCampaign)=>{setDraft(toDraft(campaign));setStep(0);setOpen(true);};
  const duplicate=(campaign:GamingPromotionCampaign)=>{const source=toDraft(campaign);setDraft({...source,campaignId:undefined,name:`${campaign.name} copy`,status:'draft',code:source.applicationMode==='coupon'?`${source.code||'PROMO'}COPY`:''});setStep(0);setOpen(true);};

  const validateStep=(target:BuilderStep)=>{
    if(target===0){if(!draft.name.trim()){notify({title:'Campaign name required',tone:'danger'});return false;}if(draft.applicationMode==='coupon'&&!draft.code?.trim()){notify({title:'Coupon code required',tone:'danger'});return false;}}
    if(target===1){if(!Number.isFinite(draft.discountValue)||draft.discountValue<=0){notify({title:'Discount value must be greater than zero',tone:'danger'});return false;}if(draft.discountType==='percent'&&draft.discountValue>100){notify({title:'Percentage discount cannot exceed 100%',tone:'danger'});return false;}}
    if(target===3&&draft.startAt&&draft.endAt&&new Date(draft.endAt).getTime()<=new Date(draft.startAt).getTime()){notify({title:'Campaign end must be after the start time',tone:'danger'});return false;}
    if(target===4){if(draft.minSpendLkr<0||draft.marginFloorLkr<0){notify({title:'Spend and margin safeguards cannot be negative',tone:'danger'});return false;}if(draft.maxRedemptions!==null&&draft.maxRedemptions!==undefined&&draft.maxRedemptions<1){notify({title:'Maximum redemptions must be at least 1',tone:'danger'});return false;}if(draft.perCustomerLimit!==null&&draft.perCustomerLimit!==undefined&&draft.perCustomerLimit<1){notify({title:'Per-customer limit must be at least 1',tone:'danger'});return false;}}
    return true;
  };
  const nextStep=()=>{if(!validateStep(step))return;setStep((value)=>Math.min(5,value+1) as BuilderStep);};
  const save=async()=>{for(const target of [0,1,3,4] as BuilderStep[])if(!validateStep(target))return;setBusy(true);try{editing?await updateGamingPromotion(draft as GamingPromotionDraft&{campaignId:string}):await createGamingPromotion(draft);notify({title:editing?'Campaign updated':'Campaign created',description:'Gaming API campaign rules are now stored in the shared commerce state.',tone:'success'});setOpen(false);setDraft(emptyDraft());setStep(0);await load();}catch(err){notify({title:'Campaign save failed',description:err instanceof Error?err.message:'Unable to save campaign.',tone:'danger'});}finally{setBusy(false);}};
  const quickStatus=async(campaign:GamingPromotionCampaign,status:GamingPromotionCampaign['status'])=>{if(!snapshot?.capabilities.manage)return;setBusyCampaign(campaign.campaignId);try{await updateGamingPromotion({...toDraft(campaign),status});notify({title:status==='paused'?'Campaign paused':'Campaign activated',description:status==='active'&&campaign.startAt&&new Date(campaign.startAt).getTime()>now()?'The campaign is scheduled and will become eligible at its configured start time.':'The campaign status was updated.',tone:'success'});await load();}catch(err){notify({title:'Campaign status update failed',description:err instanceof Error?err.message:'Unable to update campaign.',tone:'danger'});}finally{setBusyCampaign(undefined);}};

  const campaigns=snapshot?.campaigns??[];
  const summary=useMemo(()=>{
    const counts={active:0,scheduled:0,draft:0,paused:0,ended:0,archived:0};
    for(const campaign of campaigns)counts[lifecycle(campaign)]++;
    return counts;
  },[campaigns]);
  const filtered=useMemo(()=>{const q=query.trim().toLowerCase();return campaigns.filter((campaign)=>(view==='all'||lifecycle(campaign)===view)&&(!q||`${campaign.name} ${campaign.code??''} ${campaign.campaignId} ${campaign.applicationMode}`.toLowerCase().includes(q))).sort((a,b)=>{const order:Record<Exclude<CampaignView,'all'>,number>={active:0,scheduled:1,draft:2,paused:3,ended:4,archived:5};const diff=order[lifecycle(a)]-order[lifecycle(b)];return diff||new Date(b.updatedAt).getTime()-new Date(a.updatedAt).getTime();});},[campaigns,query,view]);

  if(loading&&!snapshot)return <div className="page"><SectionHeader eyebrow="Gaming Store · P4" title="Promotions & Campaigns" description="Loading canonical promotion rules."/><StatePanel state="loading" title="Loading campaigns" description="Reading campaign state and redemption usage from shared D1."/></div>;
  if(error&&!snapshot)return <div className="page"><SectionHeader eyebrow="Gaming Store · P4" title="Promotions & Campaigns" description="Campaign control is temporarily unavailable."/><StatePanel state="error" title="Promotions unavailable" description={error} action={<Button onClick={()=>void load()}><RefreshCw size={15}/>Retry</Button>}/></div>;
  if(!snapshot)return null;

  const footer=<>{step>0?<Button disabled={busy} onClick={()=>setStep((value)=>Math.max(0,value-1) as BuilderStep)}>Back</Button>:<Button disabled={busy} onClick={()=>{setOpen(false);setDraft(emptyDraft());}}>Cancel</Button>}<span className="promotion-builder-footer__spacer"/>{step<5?<Button variant="primary" disabled={busy} onClick={nextStep}>Continue</Button>:<Button variant="primary" disabled={busy||!snapshot.capabilities.manage} onClick={()=>void save()}>{busy?'Saving…':editing?'Save campaign':'Create campaign'}</Button>}</>;

  return <div className="page promotions-control-page">
    <SectionHeader eyebrow="Gaming Store · P4" title="Promotions & Campaigns" description="Create, schedule and operate protected coupons and automatic discounts without bypassing pricing safeguards." action={<div className="table-actions"><Button onClick={()=>void load()}><RefreshCw size={15}/>Refresh</Button><Button variant="primary" disabled={!snapshot.capabilities.manage} onClick={openCreate}><Plus size={15}/>Create campaign</Button></div>}/>

    <div className="promotion-overview-grid">
      <button className={`promotion-overview-card ${view==='active'?'is-active':''}`} onClick={()=>setView('active')}><span><Sparkles size={15}/>Active</span><strong>{summary.active}</strong><small>Eligible now</small></button>
      <button className={`promotion-overview-card ${view==='scheduled'?'is-active':''}`} onClick={()=>setView('scheduled')}><span><CalendarClock size={15}/>Scheduled</span><strong>{summary.scheduled}</strong><small>Starts later</small></button>
      <button className={`promotion-overview-card ${view==='draft'?'is-active':''}`} onClick={()=>setView('draft')}><span><Pencil size={15}/>Draft</span><strong>{summary.draft}</strong><small>Not customer-visible</small></button>
      <button className="promotion-overview-card" onClick={()=>setView('all')}><span><RefreshCw size={15}/>Redemptions</span><strong>{snapshot.summary.redemptions}</strong><small>Snapshotted orders</small></button>
      <div className="promotion-overview-card promotion-overview-card--value"><span><BadgeDollarSign size={15}/>Discount granted</span><strong>{gamingLkr(snapshot.summary.discountGrantedLkr)}</strong><small>Immutable order snapshots</small></div>
    </div>

    <Card className="promotion-workspace">
      <div className="promotion-workspace__header">
        <div><span>Campaign workspace</span><h3>Marketing campaigns</h3><p>Coupons and automatic discounts with schedule, catalog scope, usage limits and protected margin floors.</p></div>
        <Badge tone={snapshot.capabilities.manage?'success':'neutral'}>{snapshot.capabilities.manage?'Management ready':'Read only'}</Badge>
      </div>
      <div className="promotion-view-tabs">
        {([['all','All',campaigns.length],['active','Active',summary.active],['scheduled','Scheduled',summary.scheduled],['draft','Draft',summary.draft],['paused','Paused',summary.paused],['ended','Ended',summary.ended],['archived','Archived',summary.archived]] as const).map(([key,label,count])=><button key={key} className={view===key?'is-active':''} onClick={()=>setView(key)}>{label}<b>{count}</b></button>)}
      </div>
      <div className="promotion-toolbar">
        <label className="promotion-search"><Search size={15}/><input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Search campaign name, coupon code or ID…"/>{query&&<button type="button" aria-label="Clear search" onClick={()=>setQuery('')}><X size={13}/></button>}</label>
        <span>{filtered.length} campaign{filtered.length===1?'':'s'} in this view</span>
      </div>

      {filtered.length?<div className="promotion-card-grid">{filtered.map((campaign)=>{const state=lifecycle(campaign);const usagePct=campaign.maxRedemptions?Math.min(100,(campaign.redemptionCount/campaign.maxRedemptions)*100):0;const discountRatio=campaign.discountedSalesLkr>0?(campaign.discountGrantedLkr/campaign.discountedSalesLkr)*100:0;return <article className="promotion-campaign-card" key={campaign.campaignId}>
        <header><div className="promotion-campaign-card__identity"><span className={`promotion-campaign-card__type is-${campaign.applicationMode}`}>{campaign.applicationMode==='coupon'?<TicketPercent size={16}/>:<Sparkles size={16}/>}</span><div><strong>{campaign.name}</strong><small>{campaign.applicationMode==='coupon'?(campaign.code||'Coupon code'):'Automatic discount'} · {campaign.campaignId}</small></div></div><Badge tone={campaignTone(state)}>{state}</Badge></header>
        <div className="promotion-campaign-card__offer"><strong>{discountLabel(campaign)}</strong><span>{campaign.minSpendLkr?`Min spend ${gamingLkr(campaign.minSpendLkr)}`:'No minimum spend'}</span></div>
        <div className="promotion-campaign-card__facts"><div><Target size={13}/><span><small>Scope</small><strong>{scopeLabel(campaign)}</strong></span></div><div><CalendarClock size={13}/><span><small>Schedule</small><strong>{scheduleLabel(campaign)}</strong></span></div><div><ShieldCheck size={13}/><span><small>Margin floor</small><strong>{gamingLkr(campaign.marginFloorLkr)}</strong></span></div></div>
        <div className="promotion-campaign-card__usage"><div><span>Redemptions</span><strong>{campaign.redemptionCount}{campaign.maxRedemptions?` / ${campaign.maxRedemptions}`:' · unlimited'}</strong></div>{campaign.maxRedemptions?<div className="promotion-usage-track"><i style={{width:`${usagePct}%`}}/></div>:null}<div className="promotion-performance-row"><span><small>Discount granted</small><strong>{gamingLkr(campaign.discountGrantedLkr)}</strong></span><span><small>Discounted sales</small><strong>{gamingLkr(campaign.discountedSalesLkr)}</strong></span><span><small>Discount / sales</small><strong>{campaign.discountedSalesLkr?`${discountRatio.toFixed(1)}%`:'—'}</strong></span></div></div>
        <footer><Button onClick={()=>startEdit(campaign)} disabled={!snapshot.capabilities.manage||busyCampaign===campaign.campaignId}><Pencil size={13}/>Edit</Button><Button onClick={()=>duplicate(campaign)} disabled={!snapshot.capabilities.manage||busyCampaign===campaign.campaignId}><CopyPlus size={13}/>Duplicate</Button>{state==='active'||state==='scheduled'?<Button onClick={()=>void quickStatus(campaign,'paused')} disabled={!snapshot.capabilities.manage||busyCampaign===campaign.campaignId}><Pause size={13}/>Pause</Button>:state==='draft'||state==='paused'?<Button variant="primary" onClick={()=>void quickStatus(campaign,'active')} disabled={!snapshot.capabilities.manage||busyCampaign===campaign.campaignId}><Play size={13}/>Activate</Button>:null}</footer>
      </article>;})}</div>:<div className="promotion-empty-state"><span className="promotion-empty-state__icon"><Megaphone size={24}/></span><div><strong>{campaigns.length?'No campaigns match this view':'Create your first campaign'}</strong><p>{campaigns.length?'Change the campaign status filter or search term to find another campaign.':'Launch a coupon or automatic discount with schedules, redemption limits and server-enforced margin protection.'}</p></div>{campaigns.length?<Button onClick={()=>{setView('all');setQuery('');}}>Show all campaigns</Button>:<Button variant="primary" disabled={!snapshot.capabilities.manage} onClick={openCreate}><Plus size={14}/>Create campaign</Button>}</div>}
    </Card>

    <Card className="promotion-safety-panel"><span className="promotion-safety-panel__icon"><ShieldCheck size={18}/></span><div><span>Pricing safety</span><strong>Discounts cannot bypass margin protection</strong><p>The Gaming API calculates every discount after the live base price, caps it to the stricter global minimum-profit safeguard and campaign Margin floor, then rechecks eligibility at checkout before attaching the immutable discount snapshot to the order.</p></div><Badge tone="success">Server enforced</Badge></Card>

    <Modal open={open} onClose={()=>{if(!busy){setOpen(false);setDraft(emptyDraft());setStep(0);}}} title={editing?'Edit campaign':'Create campaign'} description="Build a protected campaign step by step. Changes affect new quotes only; existing orders keep their original discount snapshot." className="modal--wide promotion-builder-modal" footer={<div className="promotion-builder-footer">{footer}</div>}>
      <div className="promotion-builder">
        <nav className="promotion-builder-steps" aria-label="Campaign builder steps">{STEP_LABELS.map((label,index)=><button type="button" key={label} className={`${step===index?'is-active':''} ${step>index?'is-complete':''}`} onClick={()=>{if(index<=step)setStep(index as BuilderStep);}}><span>{step>index?<CheckCircle2 size={14}/>:index+1}</span><strong>{label}</strong></button>)}</nav>
        <div className="promotion-builder-content">
          {step===0&&<section className="promotion-builder-section"><div className="promotion-builder-section__head"><span>01 · Basics</span><h4>Name the campaign and choose how customers receive the discount.</h4></div><div className="form-grid form-grid--two"><FormField label="Campaign name" required><TextInput value={draft.name} onChange={(e)=>setDraft({...draft,name:e.target.value})} placeholder="Weekend Top-Up Sale"/></FormField><FormField label="Status"><SelectInput value={draft.status} onChange={(e)=>setDraft({...draft,status:e.target.value as GamingPromotionDraft['status']})}><option value="draft">Draft</option><option value="active">Active</option><option value="paused">Paused</option><option value="archived">Archived</option></SelectInput></FormField><FormField label="Application"><SelectInput value={draft.applicationMode} onChange={(e)=>setDraft({...draft,applicationMode:e.target.value as GamingPromotionDraft['applicationMode'],code:e.target.value==='automatic'?'':draft.code})}><option value="coupon">Coupon code</option><option value="automatic">Automatic campaign</option></SelectInput></FormField>{draft.applicationMode==='coupon'?<FormField label="Coupon code" required hint="Customers enter this code at checkout."><TextInput value={draft.code||''} onChange={(e)=>setDraft({...draft,code:e.target.value.toUpperCase().replace(/\s+/g,'')})} placeholder="SAVE10"/></FormField>:<FormField label="Automatic campaign" hint="The best eligible automatic discount is selected at quote time."><TextInput disabled value="No coupon code required"/></FormField>}</div></section>}
          {step===1&&<section className="promotion-builder-section"><div className="promotion-builder-section__head"><span>02 · Discount</span><h4>Define the customer offer and minimum basket requirement.</h4></div><div className="promotion-discount-choice"><button type="button" className={draft.discountType==='percent'?'is-active':''} onClick={()=>setDraft({...draft,discountType:'percent'})}><CirclePercent size={18}/><span><strong>Percentage</strong><small>Reduce the eligible price by a percentage.</small></span></button><button type="button" className={draft.discountType==='fixed_lkr'?'is-active':''} onClick={()=>setDraft({...draft,discountType:'fixed_lkr'})}><BadgeDollarSign size={18}/><span><strong>Fixed LKR</strong><small>Subtract a fixed LKR amount.</small></span></button></div><div className="form-grid form-grid--two"><FormField label={draft.discountType==='percent'?'Discount %':'Discount LKR'} required><TextInput type="number" min="0.01" max={draft.discountType==='percent'?100:undefined} step="0.01" value={draft.discountValue} onChange={(e)=>setDraft({...draft,discountValue:Number(e.target.value)})}/></FormField><FormField label="Minimum spend LKR" hint="0 means there is no minimum basket requirement."><TextInput type="number" min="0" step="0.01" value={draft.minSpendLkr} onChange={(e)=>setDraft({...draft,minSpendLkr:Number(e.target.value)})}/></FormField></div><div className="promotion-builder-preview"><span>Customer offer</span><strong>{discountLabel(draft)}</strong><small>{draft.minSpendLkr?`Available on eligible baskets from ${gamingLkr(draft.minSpendLkr)}.`:'No minimum spend requirement.'}</small></div></section>}
          {step===2&&<section className="promotion-builder-section"><div className="promotion-builder-section__head"><span>03 · Scope</span><h4>Choose which canonical products or offers are eligible.</h4></div><div className="promotion-scope-state"><Target size={18}/><div><strong>{scopeLabel(draft)}</strong><small>Blank product and offer lists mean the campaign applies to all otherwise eligible catalog items.</small></div></div><div className="form-grid form-grid--two"><FormField label="Product IDs" hint="Comma-separated canonical product IDs. Blank means all products."><TextInput value={draft.productIds.join(', ')} onChange={(e)=>setDraft({...draft,productIds:csv(e.target.value)})} placeholder="nfp_..., nfp_..."/></FormField><FormField label="Offer IDs" hint="Comma-separated canonical offer IDs. Blank means all offers."><TextInput value={draft.offerIds.join(', ')} onChange={(e)=>setDraft({...draft,offerIds:csv(e.target.value)})} placeholder="offer_..., offer_..."/></FormField></div></section>}
          {step===3&&<section className="promotion-builder-section"><div className="promotion-builder-section__head"><span>04 · Schedule</span><h4>Control when an active campaign becomes eligible.</h4></div><div className="form-grid form-grid--two"><FormField label="Starts at" hint="Blank means eligible immediately when status is Active."><TextInput type="datetime-local" value={localTime(draft.startAt)} onChange={(e)=>setDraft({...draft,startAt:e.target.value?new Date(e.target.value).toISOString():null})}/></FormField><FormField label="Ends at" hint="Blank means the campaign has no scheduled end."><TextInput type="datetime-local" value={localTime(draft.endAt)} onChange={(e)=>setDraft({...draft,endAt:e.target.value?new Date(e.target.value).toISOString():null})}/></FormField></div><div className="promotion-builder-preview"><span>Schedule</span><strong>{scheduleLabel(draft)}</strong><small>An Active campaign with a future start time appears as Scheduled in the campaign workspace.</small></div></section>}
          {step===4&&<section className="promotion-builder-section"><div className="promotion-builder-section__head"><span>05 · Limits & safety</span><h4>Protect campaign usage and the minimum profit floor.</h4></div><div className="form-grid form-grid--two"><FormField label="Maximum redemptions" hint="Blank means unlimited campaign-wide redemptions."><TextInput type="number" min="1" value={draft.maxRedemptions??''} onChange={(e)=>setDraft({...draft,maxRedemptions:e.target.value?Number(e.target.value):null})}/></FormField><FormField label="Per-customer limit" hint="Validated against the checkout receipt email."><TextInput type="number" min="1" value={draft.perCustomerLimit??''} onChange={(e)=>setDraft({...draft,perCustomerLimit:e.target.value?Number(e.target.value):null})}/></FormField><FormField label="Campaign Margin floor LKR" hint="The global pricing safeguard still applies when it is stricter."><TextInput type="number" min="0" step="0.01" value={draft.marginFloorLkr} onChange={(e)=>setDraft({...draft,marginFloorLkr:Number(e.target.value)})}/></FormField></div><div className="promotion-margin-guard"><ShieldCheck size={18}/><div><strong>Server-enforced protection</strong><small>Checkout will cap the discount so neither this campaign floor nor the stricter global minimum-profit safeguard can be bypassed.</small></div></div></section>}
          {step===5&&<section className="promotion-builder-section"><div className="promotion-builder-section__head"><span>06 · Review</span><h4>Review the campaign before storing it in canonical commerce state.</h4></div><div className="promotion-review-hero"><span className={`promotion-campaign-card__type is-${draft.applicationMode}`}>{draft.applicationMode==='coupon'?<TicketPercent size={20}/>:<Sparkles size={20}/>}</span><div><strong>{draft.name||'Untitled campaign'}</strong><small>{draft.applicationMode==='coupon'?(draft.code||'Coupon code required'):'Automatic campaign'}</small></div><Badge tone={draft.status==='active'?'success':draft.status==='paused'?'warning':draft.status==='archived'?'neutral':'info'}>{draft.status}</Badge></div><div className="promotion-review-grid"><div><span>Discount</span><strong>{discountLabel(draft)}</strong><small>{draft.minSpendLkr?`Min ${gamingLkr(draft.minSpendLkr)}`:'No minimum spend'}</small></div><div><span>Scope</span><strong>{scopeLabel(draft)}</strong><small>{draft.productIds.length+draft.offerIds.length?`${draft.productIds.length} product IDs · ${draft.offerIds.length} offer IDs`:'Catalog-wide eligibility'}</small></div><div><span>Schedule</span><strong>{scheduleLabel(draft)}</strong><small>Eligibility is rechecked at quote and checkout.</small></div><div><span>Usage</span><strong>{draft.maxRedemptions?`${draft.maxRedemptions} max`:'Unlimited total'}</strong><small>{draft.perCustomerLimit?`${draft.perCustomerLimit} per customer`:'No per-customer cap'}</small></div><div><span>Margin floor</span><strong>{gamingLkr(draft.marginFloorLkr)}</strong><small>Global safeguard may be stricter.</small></div></div></section>}
        </div>
      </div>
    </Modal>
  </div>;
}
