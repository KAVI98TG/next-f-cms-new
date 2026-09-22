import { useEffect, useMemo, useState } from "react";
import { BadgeDollarSign, RefreshCw, ShieldCheck, WalletCards } from "lucide-react";
import { Badge, Button, Card, DataTable, FormField, MetricCard, SectionHeader, SelectInput, TextInput, type DataTableColumn } from "../../shared/components";
import { gamingStore, type GamingProduct } from "../data/gamingStore";
import { gamingLkr, gamingMoney } from "../shared/format";
import { useGamingStore } from "../shared/useGamingStore";
import { readRuntimeTruth } from "../../services/production";
import { flushDurableWrites } from "../../services/production/durableStorage";
import { useToast } from "../../shared/feedback/ToastProvider";
import { getFazerPricing, getFazerStatus, refreshFazerPricing, refreshFazerStatus, saveFazerPricing } from "../live/fazercardsControl";

const runtime=readRuntimeTruth();
const formatPercent=(value:number)=>`${Number.isInteger(value)?value:value.toFixed(1)}%`;

function previewPolicy(input:{
 supplierCostUsd:number;
 lkrPerUsd:number|null;
 markupPercent:number|null;
 gatewayFeePercent:number;
 minimumProfitLkr:number;
 fixedFeeLkr:number;
 roundToLkr:number;
}){
 const supplierCostUsd=Math.max(0,Number(input.supplierCostUsd)||0);
 const fx=Math.max(0,Number(input.lkrPerUsd)||0);
 const supplierCostLkr=supplierCostUsd*fx;
 const markupPercent=Math.max(0,Number(input.markupPercent)||0);
 const markupProfit=supplierCostLkr*markupPercent/100;
 const targetProfit=Math.max(markupProfit,Math.max(0,Number(input.minimumProfitLkr)||0));
 const fixedFee=Math.max(0,Number(input.fixedFeeLkr)||0);
 const gatewayPercent=Math.max(0,Math.min(50,Number(input.gatewayFeePercent)||0));
 const beforeGateway=supplierCostLkr+targetProfit+fixedFee;
 const grossedUp=beforeGateway/Math.max(.01,1-gatewayPercent/100);
 const roundTo=Math.max(1,Number(input.roundToLkr)||1);
 const retailLkr=Math.ceil(grossedUp/roundTo)*roundTo;
 const gatewayFeeLkr=retailLkr*gatewayPercent/100;
 const estimatedProfitLkr=Math.max(0,retailLkr-supplierCostLkr-gatewayFeeLkr-fixedFee);
 const marginPercent=retailLkr?estimatedProfitLkr/retailLkr*100:0;
 return {supplierCostUsd,supplierCostLkr,markupProfit,targetProfit,fixedFee,gatewayFeeLkr,retailLkr,estimatedProfitLkr,marginPercent};
}

function LivePricingPage(){
 const pricing=useGamingStore(getFazerPricing); const status=useGamingStore(getFazerStatus); const {notify}=useToast();
 const [draft,setDraft]=useState(pricing); const [busy,setBusy]=useState(false); const [previewUsd,setPreviewUsd]=useState(10);
 useEffect(()=>setDraft(pricing),[pricing]);
 useEffect(()=>{void Promise.allSettled([refreshFazerPricing(),refreshFazerStatus()]);},[]);
 const dirty=useMemo(()=>JSON.stringify(draft)!==JSON.stringify(pricing),[draft,pricing]);
 const policyReady=Boolean(draft.lkrPerUsd&&draft.markupPercent!==null);
 const preview=useMemo(()=>previewPolicy({supplierCostUsd:previewUsd,...draft}),[draft,previewUsd]);
 useEffect(()=>{if(!dirty)return;const handler=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue="";};window.addEventListener("beforeunload",handler);return()=>window.removeEventListener("beforeunload",handler);},[dirty]);
 const save=async()=>{setBusy(true);try{const normalized=saveFazerPricing(draft);await flushDurableWrites();setDraft(normalized);notify({title:"Pricing saved",description:"The pricing policy is active.",tone:"success"});}catch(error){notify({title:"Pricing save failed",description:error instanceof Error?error.message:"Unable to persist live pricing.",tone:"danger"});}finally{setBusy(false);}};
 const refresh=async()=>{if(dirty)return;setBusy(true);try{await Promise.all([refreshFazerPricing(),refreshFazerStatus()]);notify({title:"Pricing refreshed",description:"Latest pricing and supplier status loaded.",tone:"success"});}catch(error){notify({title:"Refresh failed",description:error instanceof Error?error.message:"Unable to refresh live pricing.",tone:"danger"});}finally{setBusy(false);}};
 return <div className="page pricing-control-page">
  <SectionHeader eyebrow="Gaming Store" title="Pricing & Safeguards" description="Control FX, margins, fees and rounding." action={<Button onClick={refresh} disabled={busy||dirty} title={dirty?"Save or discard changes before refreshing the production policy.":"Reload production pricing and supplier status"}><RefreshCw size={14}/>Refresh policy</Button>}/>

  <div className="pricing-overview-grid">
   <MetricCard label="USD → LKR" value={draft.lkrPerUsd?String(draft.lkrPerUsd):"Not set"} icon={BadgeDollarSign}/>
   <MetricCard label="Supplier" value={status.connected?"Connected":"Needs check"} icon={WalletCards}/>
  </div>

  <div className="pricing-control-grid">
   <Card className="pricing-policy-panel">
    <div className="operation-section__head"><div><span>Pricing policy</span><h3>Retail calculation</h3></div><div className="pricing-policy-state"><Badge tone={draft.mode==="markup"?"success":"info"}>{draft.mode==="markup"?"Markup pricing":"Checkout quote"}</Badge>{dirty?<Badge tone="warning">Unsaved</Badge>:<Badge tone="success">Saved</Badge>}</div></div>
    <section className="pricing-field-group">
     <div className="pricing-field-group__head"><span>Core pricing</span></div>
     <div className="form-grid form-grid--two">
      <FormField label="Pricing mode"><SelectInput value={draft.mode} onChange={(e)=>setDraft({...draft,mode:e.target.value as typeof draft.mode})}><option value="markup">Markup — show LKR catalog prices</option><option value="supplier_quote">Supplier quote — price at checkout</option></SelectInput></FormField>
      <FormField label="USD to LKR" required><TextInput type="number" min="0" step="0.01" value={draft.lkrPerUsd??""} placeholder="e.g. 315" onChange={(e)=>setDraft({...draft,lkrPerUsd:e.target.value?Number(e.target.value):null})}/></FormField>
      <FormField label="Default markup %" required><TextInput type="number" min="0" step="0.1" value={draft.markupPercent??""} placeholder="e.g. 10" onChange={(e)=>setDraft({...draft,markupPercent:e.target.value?Number(e.target.value):null})}/></FormField>
      <FormField label="Minimum profit LKR"><TextInput type="number" min="0" value={draft.minimumProfitLkr} onChange={(e)=>setDraft({...draft,minimumProfitLkr:Number(e.target.value)})}/></FormField>
     </div>
    </section>

    <section className="pricing-field-group">
     <div className="pricing-field-group__head"><span>Fees & rounding</span></div>
     <div className="form-grid form-grid--3">
      <FormField label="Gateway fee %"><TextInput type="number" min="0" step="0.1" value={draft.gatewayFeePercent} onChange={(e)=>setDraft({...draft,gatewayFeePercent:Number(e.target.value)})}/></FormField>
      <FormField label="Fixed fee LKR"><TextInput type="number" min="0" value={draft.fixedFeeLkr} onChange={(e)=>setDraft({...draft,fixedFeeLkr:Number(e.target.value)})}/></FormField>
      <FormField label="Round to LKR"><TextInput type="number" min="1" value={draft.roundToLkr} onChange={(e)=>setDraft({...draft,roundToLkr:Number(e.target.value)})}/></FormField>
     </div>
    </section>

    {!policyReady?<div className="pricing-policy-warning"><ShieldCheck size={16}/><span><strong>Pricing policy incomplete</strong><small>USD → LKR and Default markup % are required before supplier products can produce a protected customer quote.</small></span></div>:null}

    <div className="pricing-save-bar"><div className="pricing-save-actions">{dirty?<Button onClick={()=>setDraft(pricing)} disabled={busy}>Discard</Button>:null}<Button variant="primary" disabled={busy||!policyReady||!dirty} onClick={save}>{busy?"Saving…":"Save pricing policy"}</Button></div></div>
   </Card>

   <Card className="pricing-preview-panel">
    <div className="operation-section__head"><div><span>Live simulator</span><h3>Customer price preview</h3></div><Badge tone="neutral">Preview only</Badge></div>
    <FormField label="Example supplier cost (USD)"><TextInput type="number" min="0" step="0.01" value={previewUsd} onChange={(e)=>setPreviewUsd(Number(e.target.value)||0)}/></FormField>
    <div className="pricing-preview-price"><span>{draft.mode==="markup"?"Customer catalog price":"Checkout estimate"}</span><strong>{policyReady?gamingLkr(preview.retailLkr):"—"}</strong></div>
    <div className="pricing-preview-breakdown">
     <div><span>Supplier cost</span><strong>{gamingLkr(preview.supplierCostLkr)}</strong></div>
     <div><span>Profit target</span><strong>{gamingLkr(preview.targetProfit)}</strong></div>
     <div><span>Gateway fee</span><strong>{gamingLkr(preview.gatewayFeeLkr)}</strong></div>
     <div><span>Fixed fee</span><strong>{gamingLkr(preview.fixedFee)}</strong></div>
     <div><span>Estimated profit</span><strong>{gamingLkr(preview.estimatedProfitLkr)}</strong></div>
     <div><span>Rounding</span><strong>{gamingLkr(draft.roundToLkr)}</strong></div>
    </div>
   </Card>
  </div>

 </div>;
}

function LocalPricingPage(){
 const settings=useGamingStore(gamingStore.getSettings); const products=useGamingStore(gamingStore.getProducts); const sources=useGamingStore(gamingStore.getSupplierProducts); const [draft,setDraft]=useState(settings);
 const economics=(p:GamingProduct)=>{const s=sources.find((x)=>x.id===p.supplierProductId); const cost=s?(s.currency==="USD"?s.cost*settings.usdToLkr:s.cost):0; const fee=p.sellingPrice*settings.gatewayFeePercent/100; return {source:s,cost,fee,profit:p.sellingPrice-cost-fee,margin:p.sellingPrice?((p.sellingPrice-cost-fee)/p.sellingPrice)*100:0};};
 const cols:DataTableColumn<GamingProduct>[]=[{key:"product",header:"Product",render:(p)=><div className="entity-cell"><strong>{p.name}</strong><small>{economics(p).source&&gamingMoney(economics(p).source!.cost,economics(p).source!.currency)} supplier cost</small></div>},{key:"cost",header:"LKR cost",render:(p)=><strong>{gamingLkr(economics(p).cost)}</strong>},{key:"sell",header:"Selling",render:(p)=><div className="entity-cell"><strong>{gamingLkr(p.sellingPrice)}</strong><small>Suggested {gamingLkr(p.suggestedPrice)}</small></div>},{key:"profit",header:"Profit",render:(p)=><div className="entity-cell"><strong>{gamingLkr(economics(p).profit)}</strong><small>{economics(p).margin.toFixed(1)}% effective</small></div>},{key:"action",header:"",width:"120px",render:(p)=><Button disabled={p.sellingPrice===p.suggestedPrice} onClick={()=>gamingStore.updateProduct(p.id,{sellingPrice:p.suggestedPrice})}>Use suggested</Button>}];
 return <div className="page"><SectionHeader eyebrow="Gaming Store" title="Pricing & Safeguards" description="Local pricing controls."/><div className="compact-metrics"><MetricCard label="USD → LKR" value={String(settings.usdToLkr)} icon={BadgeDollarSign}/><MetricCard label="Default margin" value={`${settings.defaultMarginPercent}%`} icon={ShieldCheck}/><MetricCard label="Minimum profit" value={gamingLkr(settings.minimumProfitLkr)} icon={ShieldCheck}/></div><Card className="operation-section"><div className="form-grid form-grid--4"><FormField label="USD to LKR"><TextInput type="number" value={draft.usdToLkr} onChange={(e)=>setDraft({...draft,usdToLkr:Number(e.target.value)})}/></FormField><FormField label="Gateway fee %"><TextInput type="number" value={draft.gatewayFeePercent} onChange={(e)=>setDraft({...draft,gatewayFeePercent:Number(e.target.value)})}/></FormField><FormField label="Default margin %"><TextInput type="number" value={draft.defaultMarginPercent} onChange={(e)=>setDraft({...draft,defaultMarginPercent:Number(e.target.value)})}/></FormField><FormField label="Minimum profit LKR"><TextInput type="number" value={draft.minimumProfitLkr} onChange={(e)=>setDraft({...draft,minimumProfitLkr:Number(e.target.value)})}/></FormField></div><div className="modal-actions"><Button onClick={()=>{gamingStore.saveSettings(draft);gamingStore.recalculatePrices();}} variant="primary">Save & recalculate</Button></div></Card><Card><DataTable rows={products} columns={cols} getKey={(p)=>p.id}/></Card></div>;
}

export function PricingPage(){return runtime.isProduction?<LivePricingPage/>:<LocalPricingPage/>;}
