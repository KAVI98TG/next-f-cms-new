import { useEffect, useState } from "react";
import { BadgeDollarSign, CircleDollarSign, CreditCard, RefreshCw, RotateCcw, WalletCards } from "lucide-react";
import { Button, Card, DataTable, ExportCsvButton, MetricCard, SectionHeader, StatePanel, type DataTableColumn } from "../../shared/components";
import { gamingDate, gamingLkr } from "../shared/format";
import { GamingStatus } from "../shared/GamingStatus";
import { loadGamingOperationsSnapshot, type LiveGamingOperationsSnapshot, type LiveGamingOrder, type LiveRefundRecord } from "../live-operations/operations";

const n=(value:unknown)=>{const out=Number(value);return Number.isFinite(out)?out:0;};
const providerLabel=(value?:string)=>!value?"Not assigned":value==="manual_bank"?"Manual bank":value==="ezycash"?"eZ Cash":value==="payhere"?"PayHere":value.replace(/_/g," ");

export function FinancePage(){
  const [snapshot,setSnapshot]=useState<LiveGamingOperationsSnapshot>();
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const load=async()=>{setLoading(true);setError("");try{setSnapshot(await loadGamingOperationsSnapshot());}catch(err){setError(err instanceof Error?err.message:"Gaming finance data could not be loaded.");}finally{setLoading(false);}};
  useEffect(()=>{void load();},[]);

  if(loading&&!snapshot)return <div className="page"><SectionHeader eyebrow="Gaming Store" title="Finance & Reconciliation" description="Loading the live Gaming finance ledger."/><StatePanel state="loading" title="Loading finance ledger" description="Loading payments, refunds and order economics."/></div>;
  if(error&&!snapshot)return <div className="page"><SectionHeader eyebrow="Gaming Store" title="Finance & Reconciliation" description="Live finance data is temporarily unavailable."/><StatePanel state="error" title="Finance ledger unavailable" description={error} action={<Button onClick={()=>void load()}><RefreshCw size={15}/>Retry</Button>}/></div>;
  if(!snapshot)return null;
  if(!snapshot.capabilities.finance)return <div className="page"><SectionHeader eyebrow="Gaming Store" title="Finance & Reconciliation" description="Live financial records are permission restricted."/><StatePanel state="empty" title="Finance permission required" description="Gaming finance permission is required to view payment reconciliation, refunds and margin data."/></div>;

  const completedRefunds=(orderId:string)=>snapshot.refunds.filter((refund)=>refund.orderId===orderId&&refund.status==="completed");
  const refundedAmount=(orderId:string)=>completedRefunds(orderId).reduce((sum,refund)=>sum+refund.amountLkr,0);
  const recoveries=(orderId:string)=>completedRefunds(orderId).reduce((total,refund)=>({supplier:total.supplier+n(refund.finance?.supplierRecoveryLkr),gateway:total.gateway+n(refund.finance?.gatewayFeeRecoveredLkr)}),{supplier:0,gateway:0});
  const orderMargin=(order:LiveGamingOrder)=>{const r=recoveries(order.orderId);return (order.payment.state==="verified"?order.amountLkr:0)-refundedAmount(order.orderId)-n(order.economics?.supplierCostLkr)+r.supplier-n(order.economics?.gatewayFeeLkr)+r.gateway;};

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

  return <div className="page">
    <SectionHeader eyebrow="Gaming Store" title="Finance & Reconciliation" description="Customer collections, refunds, supplier costs and recoveries." action={<ExportCsvButton filename="next-f-gaming-finance" rows={snapshot.orders} columns={[{header:"Order",value:(row)=>row.orderNumber},{header:"Customer",value:(row)=>row.customer.email},{header:"Product",value:(row)=>row.productName},{header:"Status",value:(row)=>row.status},{header:"Payment provider",value:(row)=>row.payment.providerKey},{header:"Collected LKR",value:(row)=>row.payment.state==="verified"?row.amountLkr:0},{header:"Refunded LKR",value:(row)=>refundedAmount(row.orderId)},{header:"Net customer revenue LKR",value:(row)=>(row.payment.state==="verified"?row.amountLkr:0)-refundedAmount(row.orderId)},{header:"Supplier cost LKR",value:(row)=>n(row.economics?.supplierCostLkr)},{header:"Supplier recovery LKR",value:(row)=>recoveries(row.orderId).supplier},{header:"Gateway fee LKR",value:(row)=>n(row.economics?.gatewayFeeLkr)},{header:"Gateway fee recovery LKR",value:(row)=>recoveries(row.orderId).gateway},{header:"Estimated margin LKR",value:(row)=>orderMargin(row)}]}/>}/>
    <div className="metric-grid">
      <MetricCard label="Gross collected" value={gamingLkr(snapshot.summary.grossCollectedLkr??0)} icon={CircleDollarSign}/>
      <MetricCard label="Completed refunds" value={gamingLkr(snapshot.summary.completedRefundsLkr??0)} icon={RotateCcw}/>
      <MetricCard label="Net sales" value={gamingLkr(snapshot.summary.netSalesLkr??0)} icon={WalletCards}/>
      <MetricCard label="Estimated margin" value={gamingLkr(snapshot.summary.estimatedMarginLkr??0)} icon={BadgeDollarSign}/>
    </div>
    <div className="compact-metrics">
      <MetricCard label="Supplier cost" value={gamingLkr(snapshot.summary.supplierCostLkr??0)} icon={WalletCards}/>
      <MetricCard label="Gateway fees" value={gamingLkr(snapshot.summary.gatewayFeesLkr??0)} icon={CreditCard}/>
    </div>
    <Card><div className="operation-section__head"><div><span>Order economics</span><h3>Commerce reconciliation</h3></div><BadgeDollarSign size={18}/></div><DataTable rows={snapshot.orders} columns={orderColumns} getKey={(order)=>order.orderId} empty="No Gaming orders have been recorded yet."/></Card>
    <Card><div className="operation-section__head"><div><span>Refund ledger</span><h3>Customer payouts & recoveries</h3></div><RotateCcw size={18}/></div><DataTable rows={snapshot.refunds} columns={refundColumns} getKey={(refund)=>refund.refundId} empty="No refund records have been created yet."/></Card>
    {error&&<Card className="architecture-callout"><strong>Last refresh warning</strong><p>{error}</p></Card>}
  </div>;
}
