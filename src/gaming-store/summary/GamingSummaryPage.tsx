import { useEffect, useState } from "react";
import { ArrowUpRight, RefreshCw, Store } from "lucide-react";
import { Badge, Button, Card, SectionHeader, StatePanel } from "../../shared/components";
import { ProductionBackendClient } from "../../services/production/httpClient";
import { readProductionRuntimeConfig } from "../../services/production/runtime";

type GamingSummary={
  generatedAt:string;
  store:"gaming";
  orders:{total:number;completed:number;paymentReview:number;fulfillmentAttention:number};
  finance:{netSalesLkr:number;grossCollectedLkr:number;completedRefundsLkr:number;estimatedMarginLkr:number};
  support:{open:number;inProgress:number;urgent:number;slaBreached:number};
  suppliers:{fazercards:{connected:boolean;lastHealthAt:string|null}};
  promotions:{active:number;total:number};
  analytics:{orders:number;verifiedOrders:number;fulfilledOrders:number};
};
type SummaryResponse={summary:GamingSummary|null;adminUrl:string;controlPlane:string};

const runtime=readProductionRuntimeConfig();
const client=runtime.mode==="production-api"?new ProductionBackendClient(runtime.apiBaseUrl):undefined;
const number=(value:unknown)=>Number.isFinite(Number(value))?Number(value):0;
const money=(value:unknown)=>new Intl.NumberFormat("en-LK",{style:"currency",currency:"LKR",maximumFractionDigits:0}).format(number(value));

export function GamingSummaryPage(){
  const [data,setData]=useState<SummaryResponse>();
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const load=async()=>{
    setLoading(true);setError("");
    try{
      if(!client){setData({summary:null,adminUrl:"https://gaming.nextf.lk/admin",controlPlane:"gaming-admin"});return;}
      const result=await client.execute<SummaryResponse>({operation:"staff.gaming.summary.get",kind:"query",input:{}});
      if(!result.ok)throw new Error(result.problem.detail);
      setData(result.data);
    }catch(err){setError(err instanceof Error?err.message:"Gaming summary could not be loaded.");}
    finally{setLoading(false);}
  };
  useEffect(()=>{void load();},[]);
  if(loading&&!data)return <div className="page"><SectionHeader eyebrow="Gaming" title="Gaming summary" description="Loading the read-only Gaming business summary."/><StatePanel state="loading" title="Loading Gaming summary" description="Reading the latest summary sent by Gaming Admin."/></div>;
  if(error&&!data)return <div className="page"><SectionHeader eyebrow="Gaming" title="Gaming summary" description="Read-only company visibility. Gaming operations live in Gaming Admin."/><StatePanel state="error" title="Summary unavailable" description={error} action={<Button onClick={()=>void load()}>Retry</Button>}/></div>;
  const summary=data?.summary;
  return <div className="page">
    <SectionHeader
      eyebrow="Gaming · Read only"
      title="Gaming summary"
      description="Company-level Gaming visibility only. Operational controls are owned by Gaming Admin."
      action={<div style={{display:"flex",gap:8}}><Button variant="secondary" onClick={()=>void load()} disabled={loading}><RefreshCw size={14}/>Refresh</Button><Button onClick={()=>window.open(data?.adminUrl||"https://gaming.nextf.lk/admin","_blank","noopener,noreferrer")}><Store size={14}/>Open Gaming Admin <ArrowUpRight size={13}/></Button></div>}
    />
    {!summary?<StatePanel state="empty" title="No Gaming summary received yet" description="Gaming Admin will publish the first company summary after its new control plane is deployed."/>:<>
      <div className="stat-grid">
        <Card><span className="eyebrow">Orders</span><h2>{number(summary.orders?.total)}</h2><small>{number(summary.orders?.completed)} completed</small></Card>
        <Card><span className="eyebrow">Net sales</span><h2>{money(summary.finance?.netSalesLkr)}</h2><small>{money(summary.finance?.estimatedMarginLkr)} estimated margin</small></Card>
        <Card><span className="eyebrow">Needs attention</span><h2>{number(summary.orders?.paymentReview)+number(summary.orders?.fulfillmentAttention)}</h2><small>Payments + fulfillment</small></Card>
        <Card><span className="eyebrow">Support</span><h2>{number(summary.support?.open)+number(summary.support?.inProgress)}</h2><small>{number(summary.support?.urgent)} urgent</small></Card>
      </div>
      <div className="grid-2">
        <Card>
          <div className="section-heading"><div><span>Supplier health</span><h3>FazerCards</h3></div><Badge tone={summary.suppliers?.fazercards?.connected?"success":"warning"}>{summary.suppliers?.fazercards?.connected?"Connected":"Check required"}</Badge></div>
          <p className="muted">CMS receives health visibility only. Supplier credentials, balance, sync and routing stay in Gaming Admin.</p>
          <small>{summary.suppliers.fazercards.lastHealthAt ? `Last health check ${new Date(summary.suppliers.fazercards.lastHealthAt).toLocaleString()}` : "No supplier health timestamp received"}</small>
        </Card>
        <Card>
          <div className="section-heading"><div><span>Control plane</span><h3>Gaming-owned</h3></div><Badge tone="success">Moved</Badge></div>
          <p className="muted">All Gaming write operations now belong to <strong>gaming.nextf.lk/admin</strong>. CMS accepts only the bounded summary payload shown on this page.</p>
          <small>Summary generated {new Date(summary.generatedAt).toLocaleString()}</small>
        </Card>
      </div>
    </>}
  </div>;
}