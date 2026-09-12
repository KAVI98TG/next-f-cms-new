import { AlertTriangle, CircleDollarSign, PackageCheck, ShoppingBag, WalletCards } from "lucide-react";
import { Card, MetricCard, SectionHeader } from "../../shared/components";
import { gamingStore, orderReconciliation } from "../data/gamingStore";
import { gamingLkr, gamingMoney } from "../shared/format";
import { GamingStatus } from "../shared/GamingStatus";
import { useGamingStore } from "../shared/useGamingStore";

export function GamingDashboard() {
  const orders = useGamingStore(gamingStore.getOrders);
  const suppliers = useGamingStore(gamingStore.getSuppliers);
  const products = useGamingStore(gamingStore.getProducts);
  const activity = useGamingStore(gamingStore.getActivity);
  const settings = useGamingStore(gamingStore.getSettings);
  const gross = orders.filter((o) => o.customerPaid && o.status !== "refunded").reduce((sum, o) => sum + o.sellingPrice, 0);
  const profit = orders.filter((o) => o.customerPaid && o.status !== "refunded").reduce((sum, o) => sum + o.profit, 0);
  const completed = orders.filter((o) => o.status === "completed").length;
  const primary = suppliers.find((s) => s.enabled) ?? suppliers[0];
  const attention = [
    ...orders.filter((o) => ["failed","refund_pending"].includes(o.status) || orderReconciliation(o) === "payment_only").map((o) => ({ title: o.number, detail: o.failureReason || `Order is ${o.status.replace(/_/g," ")}`, status: o.status })),
    ...suppliers.filter((s) => s.currency === "USD" && s.balance < settings.lowSupplierBalanceUsd).map((s) => ({ title: `${s.name} balance low`, detail: gamingMoney(s.balance, s.currency), status: "degraded" })),
  ].slice(0, 5);
  return <div className="page">
    <SectionHeader eyebrow="Gaming Store" title="Reseller operations" description="Supplier-powered top-ups and digital goods with pricing safeguards, fulfillment tracking and reconciliation." />
    <div className="metric-grid">
      <MetricCard label="Orders" value={String(orders.length)} detail={`${completed} completed`} icon={ShoppingBag} />
      <MetricCard label="Gross sales" value={gamingLkr(gross)} detail="Paid local orders" icon={CircleDollarSign} />
      <MetricCard label="Gross profit" value={gamingLkr(profit)} detail="After supplier + gateway cost" icon={PackageCheck} />
      <MetricCard label="Supplier balance" value={primary ? gamingMoney(primary.balance, primary.currency) : "-"} detail={primary?.name ?? "No supplier"} icon={WalletCards} />
    </div>
    <div className="gaming-dashboard-grid">
      <Card><div className="operation-section__head"><div><span>Attention</span><h3>Operational exceptions</h3></div><AlertTriangle size={18}/></div>{attention.length ? <div className="gaming-attention">{attention.map((item)=><div key={item.title}><span><strong>{item.title}</strong><small>{item.detail}</small></span><GamingStatus value={item.status}/></div>)}</div> : <p className="empty-copy">No order or supplier exceptions need attention.</p>}</Card>
      <Card><div className="operation-section__head"><div><span>Live state</span><h3>Store readiness</h3></div><PackageCheck size={18}/></div><div className="gaming-readiness"><div><span>Mapped products</span><strong>{products.length}</strong></div><div><span>Sellable now</span><strong>{products.filter((p)=>p.enabled&&p.availability==="available").length}</strong></div><div><span>Connected suppliers</span><strong>{suppliers.filter((s)=>s.status==="connected"&&s.enabled).length}</strong></div><div><span>Reconciled orders</span><strong>{orders.filter((o)=>orderReconciliation(o)==="reconciled").length}</strong></div></div></Card>
    </div>
    <Card><div className="operation-section__head"><div><span>Recent activity</span><h3>Gaming Store events</h3></div></div><div className="gaming-activity">{activity.slice(0,8).map((item)=><div key={item.id}><GamingStatus value={item.tone === "success" ? "completed" : item.tone === "warning" ? "degraded" : "processing"}/><span><strong>{item.title}</strong><small>{item.detail}</small></span></div>)}</div></Card>
  </div>;
}
