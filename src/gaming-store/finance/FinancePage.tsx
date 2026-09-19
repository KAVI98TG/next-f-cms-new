import { useEffect, useState } from "react";
import { ArrowRight, BadgeDollarSign, CircleDollarSign, CreditCard, Inbox, RefreshCw, RotateCcw, WalletCards } from "lucide-react";
import { Badge, Button, Card, DataTable, ExportCsvButton, SectionHeader, StatePanel, type DataTableColumn } from "../../shared/components";
import { gamingDate, gamingLkr } from "../shared/format";
import { GamingStatus } from "../shared/GamingStatus";
import { loadGamingOperationsSnapshot, type LiveGamingOperationsSnapshot, type LiveGamingOrder, type LiveRefundRecord } from "../live-operations/operations";

const n=(value:unknown)=>{const out=Number(value);return Number.isFinite(out)?out:0;};
const providerLabel=(value?:string)=>!value?"Not assigned":value==="manual_bank"?"Manual bank":value==="ezycash"?"eZ Cash":value==="payhere"?"PayHere":value.replace(/_/g," ");

type LedgerView="orders"|"refunds";

export function FinancePage(){
  const [snapshot,setSnapshot]=useState<LiveGamingOperationsSnapshot>();
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [ledgerView,setLedgerView]=useState<LedgerView>("orders");
  const load=async()=>{setLoading(true);setError("");try{setSnapshot(await loadGamingOperationsSnapshot());}catch(err){setError(err instanceof Error?err.message:"Gaming finance data could not be loaded.");}finally{setLoading(false);}};
  useEffect(()=>{void load();},[]);

  if(loading&&!snapshot)return <div className="page finance-page"><SectionHeader eyebrow="Gaming Store" title="Finance & Reconciliation" description="Loading the live Gaming finance ledger."/><StatePanel state="loading" title="Loading finance ledger" description="Reading verified customer payments, refund records and checkout-time economics from the shared commerce store."/></div>;
  if(error&&!snapshot)return <div className="page finance-page"><SectionHeader eyebrow="Gaming Store" title="Finance & Reconciliation" description="Live finance data is temporarily unavailable."/><StatePanel state="error" title="Finance ledger unavailable" description={error} action={<Button onClick={()=>void load()}><RefreshCw size={15}/>Retry</Button>}/></div>;
  if(!snapshot)return null;
  if(!snapshot.capabilities.finance)return <div className="page finance-page"><SectionHeader eyebrow="Gaming Store" title="Finance & Reconciliation" description="Live financial records are permission restricted."/><StatePanel state="empty" title="Finance permission required" description="Gaming finance permission is required to view payment reconciliation, refunds and margin data."/></div>;

  const completedRefunds=(orderId:string)=>snapshot.refunds.filter((refund)=>refund.orderId===orderId&&refund.status==="completed");
  const refundedAmount=(orderId:string)=>completedRefunds(orderId).reduce((sum,refund)=>sum+refund.amountLkr,0);
  const recoveries=(orderId:string)=>completedRefunds(orderId).reduce((total,refund)=>({supplier:total.supplier+n(refund.finance?.supplierRecoveryLkr),gateway:total.gateway+n(refund.finance?.gatewayFeeRecoveredLkr)}),{supplier:0,gateway:0});
  const orderMargin=(order:LiveGamingOrder)=>{const r=recoveries(order.orderId);return (order.payment.state==="verified"?order.amountLkr:0)-refundedAmount(order.orderId)-n(order.economics?.supplierCostLkr)+r.supplier-n(order.economics?.gatewayFeeLkr)+r.gateway;};

  const completedRefundCount=snapshot.refunds.filter((refund)=>refund.status==="completed").length;
  const pendingRefundCount=snapshot.refunds.filter((refund)=>["requested","approved","sent"].includes(refund.status)).length;
  const totalRecoveries=n(snapshot.summary.supplierRecoveriesLkr)+n(snapshot.summary.gatewayFeeRecoveriesLkr);
  const netOperatingCost=n(snapshot.summary.supplierCostLkr)+n(snapshot.summary.gatewayFeesLkr)-totalRecoveries;
  const netSales=n(snapshot.summary.netSalesLkr);
  const marginRate=netSales>0?(n(snapshot.summary.estimatedMarginLkr)/netSales)*100:null;

  const orderColumns:DataTableColumn<LiveGamingOrder>[]=[
    {key:"order",header:"Order",render:(order)=><div className="entity-cell"><strong>{order.orderNumber}</strong><small>{order.customer.email} · {order.productName}</small></div>},
    {key:"collected",header:"Collected",render:(order)=><strong>{order.payment.state==="verified"?gamingLkr(order.amountLkr):"—"}</strong>},
    {key:"refunds",header:"Refunded",render:(order)=><strong>{refundedAmount(order.orderId)?gamingLkr(refundedAmount(order.orderId)):"—"}</strong>},
    {key:"supplier",header:"Supplier cost",render:(order)=><span>{n(order.economics?.supplierCostLkr)?gamingLkr(n(order.economics?.supplierCostLkr)):"—"}</span>},
    {key:"fees",header:"Gateway fee",render:(order)=><span>{n(order.economics?.gatewayFeeLkr)?gamingLkr(n(order.economics?.gatewayFeeLkr)):"—"}</span>},
    {key:"margin",header:"Estimated margin",render:(order)=><strong>{gamingLkr(orderMargin(order))}</strong>},
    {key:"status",header:"State",render:(order)=><GamingStatus value={order.status}/>},
  ];
  const refundColumns:DataTableColumn<LiveRefundRecord>[]=[
    {key:"refund",header:"Refund",render:(refund)=><div className="entity-cell"><strong>{refund.orderNumber}</strong><small>{refund.refundId}</small></div>},
    {key:"provider",header:"Payment provider",render:(refund)=><div className="entity-cell"><strong>{providerLabel(refund.paymentProviderKey)}</strong><small>{refund.paymentMethodLabel}</small></div>},
    {key:"amount",header:"Customer refund",render:(refund)=><strong>{gamingLkr(refund.amountLkr)}</strong>},
    {key:"recoveries",header:"Recoveries",render:(refund)=><span className="muted-cell">Supplier {gamingLkr(n(refund.finance?.supplierRecoveryLkr))} · Fee {gamingLkr(n(refund.finance?.gatewayFeeRecoveredLkr))}</span>},
    {key:"reference",header:"Payout reference",render:(refund)=><span className="muted-cell">{refund.payout?.providerReference??"—"}</span>},
    {key:"status",header:"State",render:(refund)=><GamingStatus value={refund.status}/>},
    {key:"time",header:"Updated",render:(refund)=><span className="muted-cell">{gamingDate(refund.updatedAt)}</span>},
  ];

  const exportColumns=[
    {header:"Order",value:(row:LiveGamingOrder)=>row.orderNumber},
    {header:"Customer",value:(row:LiveGamingOrder)=>row.customer.email},
    {header:"Product",value:(row:LiveGamingOrder)=>row.productName},
    {header:"Status",value:(row:LiveGamingOrder)=>row.status},
    {header:"Payment provider",value:(row:LiveGamingOrder)=>row.payment.providerKey},
    {header:"Collected LKR",value:(row:LiveGamingOrder)=>row.payment.state==="verified"?row.amountLkr:0},
    {header:"Refunded LKR",value:(row:LiveGamingOrder)=>refundedAmount(row.orderId)},
    {header:"Net customer revenue LKR",value:(row:LiveGamingOrder)=>(row.payment.state==="verified"?row.amountLkr:0)-refundedAmount(row.orderId)},
    {header:"Supplier cost LKR",value:(row:LiveGamingOrder)=>n(row.economics?.supplierCostLkr)},
    {header:"Supplier recovery LKR",value:(row:LiveGamingOrder)=>recoveries(row.orderId).supplier},
    {header:"Gateway fee LKR",value:(row:LiveGamingOrder)=>n(row.economics?.gatewayFeeLkr)},
    {header:"Gateway fee recovery LKR",value:(row:LiveGamingOrder)=>recoveries(row.orderId).gateway},
    {header:"Estimated margin LKR",value:(row:LiveGamingOrder)=>orderMargin(row)},
  ];

  return <div className="page finance-page">
    <SectionHeader eyebrow="Gaming Store · Finance" title="Finance & Reconciliation" description="Follow the money from verified customer collections through refunds, costs, recoveries and margin." action={<div className="finance-header-actions"><Button onClick={()=>void load()} disabled={loading}><RefreshCw size={15} className={loading?"is-spinning":""}/>{loading?"Refreshing":"Refresh"}</Button><ExportCsvButton filename="next-f-gaming-finance" rows={snapshot.orders} columns={exportColumns}/></div>}/>

    <div className="finance-overview-grid">
      <Card className="finance-flow-card">
        <div className="operation-section__head">
          <div><span>Money flow</span><h3>Current commerce position</h3></div>
          <Badge tone="info">Live ledger</Badge>
        </div>
        <div className="finance-flow">
          <div className="finance-flow__node">
            <span>Gross collected</span>
            <strong>{gamingLkr(snapshot.summary.grossCollectedLkr??0)}</strong>
            <small>Verified payments</small>
          </div>
          <ArrowRight className="finance-flow__arrow" size={18}/>
          <div className="finance-flow__node">
            <span>Net sales</span>
            <strong>{gamingLkr(snapshot.summary.netSalesLkr??0)}</strong>
            <small>{gamingLkr(snapshot.summary.completedRefundsLkr??0)} refunded</small>
          </div>
          <ArrowRight className="finance-flow__arrow" size={18}/>
          <div className="finance-flow__node">
            <span>Net operating cost</span>
            <strong>{gamingLkr(netOperatingCost)}</strong>
            <small>{gamingLkr(totalRecoveries)} recovered</small>
          </div>
          <ArrowRight className="finance-flow__arrow" size={18}/>
          <div className="finance-flow__node finance-flow__node--result">
            <span>Estimated margin</span>
            <strong>{gamingLkr(snapshot.summary.estimatedMarginLkr??0)}</strong>
            <small>{marginRate===null?"Margin rate available after sales":`${marginRate.toFixed(1)}% of net sales`}</small>
          </div>
        </div>
        <div className="finance-cost-breakdown">
          <span><WalletCards size={14}/>Supplier cost <strong>{gamingLkr(snapshot.summary.supplierCostLkr??0)}</strong></span>
          <span><CreditCard size={14}/>Gateway fees <strong>{gamingLkr(snapshot.summary.gatewayFeesLkr??0)}</strong></span>
          <span><RotateCcw size={14}/>Recoveries <strong>{gamingLkr(totalRecoveries)}</strong></span>
        </div>
      </Card>

      <Card className="finance-snapshot-card">
        <div className="operation-section__head"><div><span>Reconciliation</span><h3>Ledger snapshot</h3></div><BadgeDollarSign size={18}/></div>
        <div className="finance-snapshot-grid">
          <div><span>Orders recorded</span><strong>{snapshot.orders.length}</strong><small>Commerce ledger rows</small></div>
          <div><span>Completed refunds</span><strong>{completedRefundCount}</strong><small>{gamingLkr(snapshot.summary.completedRefundsLkr??0)}</small></div>
          <div><span>Pending refunds</span><strong>{pendingRefundCount}</strong><small>{gamingLkr(snapshot.summary.pendingRefundsLkr??0)}</small></div>
          <div><span>Total recoveries</span><strong>{gamingLkr(totalRecoveries)}</strong><small>Supplier + gateway</small></div>
        </div>
      </Card>
    </div>

    <Card className="finance-ledger-card">
      <div className="finance-ledger-head">
        <div>
          <span className="finance-kicker">Ledger workspace</span>
          <h3>{ledgerView==="orders"?"Order economics":"Refunds & recoveries"}</h3>
          <p>{ledgerView==="orders"?"Reconcile what was collected against supplier cost, gateway fees and resulting margin.":"Track customer payouts, provider references and any supplier or gateway recovery."}</p>
        </div>
        <div className="finance-ledger-tabs" role="tablist" aria-label="Finance ledger view">
          <button type="button" role="tab" aria-selected={ledgerView==="orders"} className={ledgerView==="orders"?"is-active":""} onClick={()=>setLedgerView("orders")}><CircleDollarSign size={14}/>Orders <span>{snapshot.orders.length}</span></button>
          <button type="button" role="tab" aria-selected={ledgerView==="refunds"} className={ledgerView==="refunds"?"is-active":""} onClick={()=>setLedgerView("refunds")}><RotateCcw size={14}/>Refunds <span>{snapshot.refunds.length}</span></button>
        </div>
      </div>

      {ledgerView==="orders"?(snapshot.orders.length?<div className="finance-table"><DataTable rows={snapshot.orders} columns={orderColumns} getKey={(order)=>order.orderId}/></div>:<div className="finance-ledger-empty"><span className="finance-ledger-empty__icon"><Inbox size={20}/></span><div><strong>No order economics yet</strong><p>Verified Gaming orders will appear here automatically with their checkout-time cost, fee and margin snapshot.</p></div></div>):(snapshot.refunds.length?<div className="finance-table"><DataTable rows={snapshot.refunds} columns={refundColumns} getKey={(refund)=>refund.refundId}/></div>:<div className="finance-ledger-empty"><span className="finance-ledger-empty__icon"><RotateCcw size={20}/></span><div><strong>No refund activity yet</strong><p>Refund requests and completed payouts will appear here with provider references and recovery values.</p></div></div>)}
    </Card>

    {error&&<Card className="architecture-callout"><strong>Last refresh warning</strong><p>{error}</p></Card>}
  </div>;
}
