import { useEffect, useMemo, useState } from "react";
import { BadgeDollarSign, Calculator, CheckCircle2, CircleDollarSign, LockKeyhole, RefreshCw, ShieldCheck, TrendingUp, WalletCards } from "lucide-react";
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
 const save=async()=>{setBusy(true);try{const normalized=saveFazerPricing(draft);await flushDurableWrites();setDraft(normalized);notify({title:"Live Gaming pricing saved",description:draft.mode==="markup"?"Catalog cards now use this LKR retail policy from the already-synced supplier cost; no supplier API resync is required.":"Catalog cards will continue to show Check price while checkout applies this protected LKR policy server-side.",tone:"success"});}catch(error){notify({title:"Pricing save failed",description:error instanceof Error?error.message:"Unable to persist live pricing.",tone:"danger"});}finally{setBusy(false);}};
 const refresh=async()=>{if(dirty)return;setBusy(true);try{await Promise.all([refreshFazerPricing(),refreshFazerStatus()]);notify({title:"Live pricing refreshed",description:"Latest production D1 pricing and supplier status loaded.",tone:"success"});}catch(error){notify({title:"Refresh failed",description:error instanceof Error?error.message:"Unable to refresh live pricing.",tone:"danger"});}finally{setBusy(false);}};
 return <div className="page pricing-control-page">
  <SectionHeader eyebrow="Gaming Store" title="Pricing & Safeguards" description="Control FX, margin protection, fees and rounding from one D1-backed production pricing workspace." action={<Button onClick={refresh} disabled={busy||dirty} title={dirty?"Save or discard changes before refreshing the production policy.":"Reload production pricing and supplier status"}><RefreshCw size={14}/>Refresh policy</Button>}/>

  <div className="pricing-overview-grid">
   <MetricCard label="USD → LKR" value={draft.lkrPerUsd?String(draft.lkrPerUsd):"Not set"} detail="Operator-controlled conversion" icon={BadgeDollarSign}/>
   <MetricCard label="Pricing mode" value={draft.mode==="markup"?"Markup":"At checkout"} detail={draft.mode==="markup"?"LKR catalog prices visible":"Supplier quote mode"} icon={Calculator}/>
   <MetricCard label="Retail target" value={draft.markupPercent===null?"Not set":formatPercent(draft.markupPercent)} detail={`${gamingLkr(draft.minimumProfitLkr)} minimum profit`} icon={TrendingUp}/>
   <MetricCard label="Supplier" value={status.connected?"Connected":"Needs check"} detail={status.balance?`${status.balance.amount} ${status.balance.currency}`:"FazerCards production adapter"} icon={WalletCards}/>
  </div>

  <div className="pricing-control-grid">
   <Card className="pricing-policy-panel">
    <div className="operation-section__head"><div><span>Pricing policy</span><h3>Retail calculation</h3></div><div className="pricing-policy-state"><Badge tone={draft.mode==="markup"?"success":"info"}>{draft.mode==="markup"?"Markup pricing":"Checkout quote"}</Badge>{dirty?<Badge tone="warning">Unsaved</Badge>:<Badge tone="success">Saved</Badge>}</div></div>
    <p className="pricing-panel-copy">Configure how private supplier cost becomes a protected LKR customer price. Checkout always recalculates the policy server-side.</p>

    <section className="pricing-field-group">
     <div className="pricing-field-group__head"><span>Core pricing</span><small>FX and margin target</small></div>
     <div className="form-grid form-grid--two">
      <FormField label="Pricing mode" hint={draft.mode==="markup"?"Show calculated LKR prices in the storefront catalog.":"Show Check price in catalog and quote at checkout."}><SelectInput value={draft.mode} onChange={(e)=>setDraft({...draft,mode:e.target.value as typeof draft.mode})}><option value="markup">Markup — show LKR catalog prices</option><option value="supplier_quote">Supplier quote — price at checkout</option></SelectInput></FormField>
      <FormField label="USD to LKR" required hint="Conversion applied to USD-denominated supplier cost."><TextInput type="number" min="0" step="0.01" value={draft.lkrPerUsd??""} placeholder="e.g. 315" onChange={(e)=>setDraft({...draft,lkrPerUsd:e.target.value?Number(e.target.value):null})}/></FormField>
      <FormField label="Default markup %" required hint="Primary retail profit target before fee protection."><TextInput type="number" min="0" step="0.1" value={draft.markupPercent??""} placeholder="e.g. 10" onChange={(e)=>setDraft({...draft,markupPercent:e.target.value?Number(e.target.value):null})}/></FormField>
      <FormField label="Minimum profit LKR" hint="Absolute profit floor when percentage markup is too small."><TextInput type="number" min="0" value={draft.minimumProfitLkr} onChange={(e)=>setDraft({...draft,minimumProfitLkr:Number(e.target.value)})}/></FormField>
     </div>
    </section>

    <section className="pricing-field-group">
     <div className="pricing-field-group__head"><span>Fees & rounding</span><small>Customer-price safeguards</small></div>
     <div className="form-grid form-grid--3">
      <FormField label="Gateway fee %" hint="Gross-up protects the target after payment processing cost."><TextInput type="number" min="0" step="0.1" value={draft.gatewayFeePercent} onChange={(e)=>setDraft({...draft,gatewayFeePercent:Number(e.target.value)})}/></FormField>
      <FormField label="Fixed fee LKR" hint="Additional fixed transaction allowance."><TextInput type="number" min="0" value={draft.fixedFeeLkr} onChange={(e)=>setDraft({...draft,fixedFeeLkr:Number(e.target.value)})}/></FormField>
      <FormField label="Round to LKR" hint="Customer price rounds upward to this increment."><TextInput type="number" min="1" value={draft.roundToLkr} onChange={(e)=>setDraft({...draft,roundToLkr:Number(e.target.value)})}/></FormField>
     </div>
    </section>

    {!policyReady?<div className="pricing-policy-warning"><ShieldCheck size={16}/><span><strong>Pricing policy incomplete</strong><small>USD → LKR and Default markup % are required before supplier products can produce a protected customer quote.</small></span></div>:null}

    <div className="pricing-save-bar"><div>{dirty?<><strong>Unsaved pricing changes</strong><small>Review the live preview, then save the policy to production D1.</small></>:<><strong>Pricing policy saved</strong><small>The CMS and production D1 policy are currently aligned.</small></>}</div><div className="pricing-save-actions">{dirty?<Button onClick={()=>setDraft(pricing)} disabled={busy}>Discard</Button>:null}<Button variant="primary" disabled={busy||!policyReady||!dirty} onClick={save}>{busy?"Saving…":"Save pricing policy"}</Button></div></div>
   </Card>

   <Card className="pricing-preview-panel">
    <div className="operation-section__head"><div><span>Live simulator</span><h3>Customer price preview</h3></div><Calculator size={18}/></div>
    <p className="pricing-panel-copy">Use an example supplier cost to see how the current draft policy behaves before saving. Checkout remains authoritative.</p>
    <FormField label="Example supplier cost (USD)" hint="Simulation only — this value is never saved."><TextInput type="number" min="0" step="0.01" value={previewUsd} onChange={(e)=>setPreviewUsd(Number(e.target.value)||0)}/></FormField>
    <div className="pricing-preview-price"><span>{draft.mode==="markup"?"Customer catalog price":"Protected checkout estimate"}</span><strong>{policyReady?gamingLkr(preview.retailLkr):"—"}</strong><small>{draft.mode==="supplier_quote"?"Catalog display: Check price":"Catalog can display this calculated LKR price"}</small></div>
    <div className="pricing-preview-breakdown">
     <div><span>Supplier cost</span><strong>{gamingLkr(preview.supplierCostLkr)}</strong><small>${preview.supplierCostUsd.toFixed(2)} × {draft.lkrPerUsd??0}</small></div>
     <div><span>Protected profit target</span><strong>{gamingLkr(preview.targetProfit)}</strong><small>Higher of markup or minimum profit</small></div>
     <div><span>Gateway fee</span><strong>{gamingLkr(preview.gatewayFeeLkr)}</strong><small>{formatPercent(draft.gatewayFeePercent)} of retail</small></div>
     <div><span>Fixed fee</span><strong>{gamingLkr(preview.fixedFee)}</strong><small>Transaction allowance</small></div>
     <div><span>Estimated profit</span><strong>{gamingLkr(preview.estimatedProfitLkr)}</strong><small>{preview.marginPercent.toFixed(1)}% effective margin</small></div>
     <div><span>Rounding</span><strong>{gamingLkr(draft.roundToLkr)}</strong><small>Retail rounds upward</small></div>
    </div>
    <div className="pricing-preview-note"><ShieldCheck size={15}/><span>This simulator is for operator review. The Gaming API recalculates and protects the final checkout price server-side.</span></div>
   </Card>
  </div>

  <Card className="pricing-safeguards-panel">
   <div className="operation-section__head"><div><span>Production safeguards</span><h3>Pricing authority & security</h3></div><Badge tone="success">D1 backed</Badge></div>
   <div className="pricing-safeguard-grid">
    <div><span className="pricing-safeguard-icon"><CircleDollarSign size={17}/></span><span><strong>CMS pricing control plane</strong><small>FX, markup, fees, minimum profit and rounding are governed here.</small></span></div>
    <div><span className="pricing-safeguard-icon"><ShieldCheck size={17}/></span><span><strong>Server-side recalculation</strong><small>Checkout recalculates the protected retail price instead of trusting the browser.</small></span></div>
    <div><span className="pricing-safeguard-icon"><LockKeyhole size={17}/></span><span><strong>Supplier credentials stay private</strong><small>FazerCards API credentials remain encrypted Gaming Worker secrets.</small></span></div>
    <div><span className="pricing-safeguard-icon"><CheckCircle2 size={17}/></span><span><strong>No supplier resync required</strong><small>Markup pricing uses already-synced private supplier cost, so normal policy changes apply without catalog resync.</small></span></div>
   </div>
  </Card>
 </div>;
}

function LocalPricingPage(){
 const settings=useGamingStore(gamingStore.getSettings); const products=useGamingStore(gamingStore.getProducts); const sources=useGamingStore(gamingStore.getSupplierProducts); const [draft,setDraft]=useState(settings);
 const economics=(p:GamingProduct)=>{const s=sources.find((x)=>x.id===p.supplierProductId); const cost=s?(s.currency==="USD"?s.cost*settings.usdToLkr:s.cost):0; const fee=p.sellingPrice*settings.gatewayFeePercent/100; return {source:s,cost,fee,profit:p.sellingPrice-cost-fee,margin:p.sellingPrice?((p.sellingPrice-cost-fee)/p.sellingPrice)*100:0};};
 const cols:DataTableColumn<GamingProduct>[]=[{key:"product",header:"Product",render:(p)=><div className="entity-cell"><strong>{p.name}</strong><small>{economics(p).source&&gamingMoney(economics(p).source!.cost,economics(p).source!.currency)} supplier cost</small></div>},{key:"cost",header:"LKR cost",render:(p)=><strong>{gamingLkr(economics(p).cost)}</strong>},{key:"sell",header:"Selling",render:(p)=><div className="entity-cell"><strong>{gamingLkr(p.sellingPrice)}</strong><small>Suggested {gamingLkr(p.suggestedPrice)}</small></div>},{key:"profit",header:"Profit",render:(p)=><div className="entity-cell"><strong>{gamingLkr(economics(p).profit)}</strong><small>{economics(p).margin.toFixed(1)}% effective</small></div>},{key:"action",header:"",render:(p)=><Button disabled={p.sellingPrice===p.suggestedPrice} onClick={()=>gamingStore.updateProduct(p.id,{sellingPrice:p.suggestedPrice})}>Use suggested</Button>}];
 return <div className="page"><SectionHeader eyebrow="Gaming Store" title="Pricing & Safeguards" description="Local development pricing sandbox."/><div className="compact-metrics"><MetricCard label="USD → LKR" value={String(settings.usdToLkr)} detail="Local assumption" icon={BadgeDollarSign}/><MetricCard label="Default margin" value={`${settings.defaultMarginPercent}%`} detail="Pricing target" icon={ShieldCheck}/><MetricCard label="Minimum profit" value={gamingLkr(settings.minimumProfitLkr)} detail="Absolute safeguard" icon={ShieldCheck}/></div><Card className="operation-section"><div className="form-grid form-grid--4"><FormField label="USD to LKR"><TextInput type="number" value={draft.usdToLkr} onChange={(e)=>setDraft({...draft,usdToLkr:Number(e.target.value)})}/></FormField><FormField label="Gateway fee %"><TextInput type="number" value={draft.gatewayFeePercent} onChange={(e)=>setDraft({...draft,gatewayFeePercent:Number(e.target.value)})}/></FormField><FormField label="Default margin %"><TextInput type="number" value={draft.defaultMarginPercent} onChange={(e)=>setDraft({...draft,defaultMarginPercent:Number(e.target.value)})}/></FormField><FormField label="Minimum profit LKR"><TextInput type="number" value={draft.minimumProfitLkr} onChange={(e)=>setDraft({...draft,minimumProfitLkr:Number(e.target.value)})}/></FormField></div><div className="modal-actions"><Button onClick={()=>{gamingStore.saveSettings(draft);gamingStore.recalculatePrices();}} variant="primary">Save & recalculate</Button></div></Card><Card><DataTable rows={products} columns={cols} getKey={(p)=>p.id}/></Card></div>;
}

export function PricingPage(){return runtime.isProduction?<LivePricingPage/>:<LocalPricingPage/>;}
