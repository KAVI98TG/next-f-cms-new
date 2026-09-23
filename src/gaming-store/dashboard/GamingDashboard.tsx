import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BellRing,
  CheckCircle2,
  CircleDollarSign,
  Gauge,
  LifeBuoy,
  Megaphone,
  PackageCheck,
  RefreshCw,
  ShieldAlert,
  ShoppingBag,
  Store,
  TrendingUp,
  WalletCards,
  type LucideIcon,
} from 'lucide-react';
import { Badge, Button, Card, SectionHeader, StatePanel } from '../../shared/components';
import { readRuntimeTruth } from '../../services/production';
import { gamingStore, orderReconciliation } from '../data/gamingStore';
import { loadGamingAnalyticsSnapshot, type GamingAnalyticsSnapshot } from '../analytics/analytics';
import { getFazerStatus } from '../live/fazercardsControl';
import { loadGamingOperationsSnapshot, type LiveGamingEvent, type LiveGamingOperationsSnapshot } from '../live-operations/operations';
import { gamingDate, gamingLkr, gamingMoney } from '../shared/format';
import { GamingStatus } from '../shared/GamingStatus';
import { useGamingStore } from '../shared/useGamingStore';

const runtime=readRuntimeTruth();
const pct=(value:number|null|undefined)=>value===null||value===undefined?'—':`${value}%`;

type DashboardTone='default'|'accent'|'success'|'warning'|'danger';
type DashboardActivity={key:string;title:string;detail:string;outcome:string;count:number;createdAt:string};

function DashboardMetric({label,value,icon:Icon,tone='default'}:{label:string;value:string;icon:LucideIcon;tone?:DashboardTone}){
  return <div className={`commerce-dashboard-metric commerce-dashboard-metric--${tone}`}>
    <div className="commerce-dashboard-metric__head"><span>{label}</span><Icon size={16}/></div>
    <strong>{value}</strong>
  </div>;
}

function actionLabel(event:LiveGamingEvent){
  const normalized=event.eventType.replaceAll('_',' ').trim().toLowerCase();
  return normalized.replace(/\b\w/g,(char)=>char.toUpperCase());
}

function activityGroups(events:LiveGamingEvent[]):DashboardActivity[]{
  const groups:DashboardActivity[]=[];
  const aggregate=new Map<string,DashboardActivity>();
  for(const event of events.slice(0,30)){
    const normalized=event.eventType.toLowerCase();
    const aggregateKey=normalized.includes('analytics')&&normalized.includes('product')?'analytics-product-view':normalized.includes('supplier')?'supplier-event':undefined;
    if(aggregateKey){
      const existing=aggregate.get(aggregateKey);
      if(existing){existing.count+=1;continue;}
      const item:DashboardActivity={
        key:aggregateKey,
        title:aggregateKey==='analytics-product-view'?'Product views recorded':'Supplier activity recorded',
        detail:aggregateKey==='analytics-product-view'?'Customer browsing activity from the storefront.':'Supplier health, preview or sync activity.',
        outcome:event.outcome,
        count:1,
        createdAt:event.createdAt,
      };
      aggregate.set(aggregateKey,item);groups.push(item);continue;
    }
    groups.push({key:event.id,title:actionLabel(event),detail:`${event.orderId||event.targetId} · ${gamingDate(event.createdAt)}`,outcome:event.outcome,count:1,createdAt:event.createdAt});
    if(groups.length>=10)break;
  }
  return groups.slice(0,8);
}

function QuickAction({label,detail,path,icon:Icon}:{label:string;detail:string;path:string;icon:LucideIcon}){
  return <button className="commerce-dashboard-action" type="button" onClick={()=>window.location.assign(path)}>
    <span className="commerce-dashboard-action__icon"><Icon size={16}/></span>
    <span><strong>{label}</strong><small>{detail}</small></span>
    <ArrowRight size={15}/>
  </button>;
}

function LiveGamingDashboard(){
  const supplier=useGamingStore(getFazerStatus);
  const [operations,setOperations]=useState<LiveGamingOperationsSnapshot>();
  const [analytics,setAnalytics]=useState<GamingAnalyticsSnapshot>();
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const load=async()=>{setLoading(true);setError('');try{const [ops,stats]=await Promise.all([loadGamingOperationsSnapshot(),loadGamingAnalyticsSnapshot(30)]);setOperations(ops);setAnalytics(stats);}catch(err){setError(err instanceof Error?err.message:'Gaming dashboard could not be loaded.');}finally{setLoading(false);}};
  useEffect(()=>{void load();},[]);
  const activity=useMemo(()=>activityGroups(operations?.events??[]),[operations]);
  if(loading&&!operations)return <div className="page"><SectionHeader eyebrow="Gaming Store" title="Commerce dashboard" description="Loading commerce overview."/><StatePanel state="loading" title="Loading Gaming Store" description="Reading live orders, analytics and supplier health."/></div>;
  if(error&&!operations)return <div className="page"><SectionHeader eyebrow="Gaming Store" title="Commerce dashboard" description="Commerce overview."/><StatePanel state="error" title="Dashboard unavailable" description={error} action={<Button onClick={()=>void load()}>Retry</Button>}/></div>;
  const ops=operations!;
  const summary=ops.summary;
  const stats=analytics?.business;
  const attention=[
    ...ops.paymentProofs.filter((row)=>row.status==='pending').map((row)=>({title:`${row.orderNumber} payment review`,detail:`${row.paymentMethodLabel} · ${row.reference}`,tone:'warning' as const})),
    ...ops.fulfillmentJobs.filter((row)=>['retry','blocked','failed'].includes(row.state)).map((row)=>({title:`Fulfillment ${row.state}`,detail:`${row.orderId}${row.lastError?` · ${row.lastError}`:''}`,tone:row.state==='failed'?'danger' as const:'warning' as const})),
    ...ops.riskAssessments.filter((row)=>row.state==='held'||row.requiresReview).map((row)=>({title:`${row.orderNumber} risk ${row.level}`,detail:`${row.score}/100 · ${row.state}`,tone:row.level==='critical'?'danger' as const:'warning' as const})),
    ...ops.notifications.filter((row)=>['retry','blocked','failed'].includes(row.state)).map((row)=>({title:`Notification ${row.state}`,detail:`${row.orderNumber} · ${row.templateKey}`,tone:row.state==='failed'?'danger' as const:'warning' as const})),
  ].slice(0,5);
  const attentionCount=summary.paymentReview+(summary.riskHeld??0)+summary.refundPending+summary.notificationAttention+summary.fulfillmentAttention;
  const funnelKeys=['product_view','checkout_started','order_created','payment_verified','fulfilled'];
  const funnel=(analytics?.funnel.stages??[]).filter((stage)=>funnelKeys.includes(stage.key));
  const funnelMax=Math.max(1,...funnel.map((stage)=>stage.count));
  const viewToOrder=analytics?.funnel.overallViewToOrderRate;
  const paidToFulfilled=analytics?.funnel.stages.find((stage)=>stage.key==='fulfilled')?.conversionFromPrevious;
  const readiness=[
    {label:'Supplier',value:supplier.connected?'Connected':'Check required',detail:supplier.connected?undefined:supplier.lastError||'Health not confirmed',tone:supplier.connected?'success':'warning'},
    {label:'Payment review',value:String(summary.paymentReview),tone:summary.paymentReview?'warning':'success'},
    {label:'Fulfillment',value:String(summary.fulfillmentAttention),tone:summary.fulfillmentAttention?'warning':'success'},
    {label:'Risk holds',value:String(summary.riskHeld??0),tone:(summary.riskHeld??0)?'warning':'success'},
    {label:'Notifications',value:String(summary.notificationAttention),tone:summary.notificationAttention?'warning':'success'},
  ];
  return <div className="page commerce-dashboard-page">
    <SectionHeader eyebrow="Gaming Store · Production" title="Commerce dashboard" description="Revenue, conversion, delivery health and items needing attention." action={<Button onClick={()=>void load()} disabled={loading}><RefreshCw size={14}/>Refresh</Button>}/>

    <div className="commerce-dashboard-kpis">
      <DashboardMetric label="Orders" value={String(summary.totalOrders)} icon={ShoppingBag} tone="accent"/>
      <DashboardMetric label={ops.capabilities.finance?'Net sales':'Verified orders'} value={ops.capabilities.finance?gamingLkr(summary.netSalesLkr??0):String(stats?.verifiedOrders??ops.orders.filter((row)=>row.payment.state==='verified').length)} icon={CircleDollarSign} tone="success"/>
      <DashboardMetric label="Fulfilled" value={String(stats?.fulfilledOrders??summary.completed)} icon={PackageCheck}/>
      <DashboardMetric label="Conversion" value={pct(viewToOrder)} icon={TrendingUp}/>
      <DashboardMetric label="Needs attention" value={String(attentionCount)} icon={AlertTriangle} tone={attentionCount?'warning':'success'}/>
    </div>

    <div className="commerce-dashboard-primary">
      <Card className="commerce-dashboard-panel commerce-dashboard-panel--attention">
        <div className="operation-section__head"><div><span>Needs attention</span><h3>Operational exceptions</h3></div>{attentionCount?<AlertTriangle size={18}/>:<CheckCircle2 size={18}/>}</div>
        {attention.length?<div className="commerce-dashboard-attention-list">{attention.map((item,index)=><div key={`${item.title}-${index}`}><span><strong>{item.title}</strong><small>{item.detail}</small></span><Badge tone={item.tone}>Review</Badge></div>)}</div>:<div className="commerce-dashboard-all-clear"><CheckCircle2 size={22}/><div><strong>All clear</strong></div></div>}
        <Button className="commerce-dashboard-panel-action" variant="secondary" onClick={()=>window.location.assign('/gaming-store/live-operations')}>Open Live Operations <ArrowRight size={14}/></Button>
      </Card>

      <Card className="commerce-dashboard-panel">
        <div className="operation-section__head"><div><span>Operational readiness</span><h3>Commerce health</h3></div><Gauge size={18}/></div>
        <div className="commerce-dashboard-readiness">{readiness.map((item)=><div key={item.label}><span className={`commerce-dashboard-readiness__dot is-${item.tone}`}/><span><strong>{item.label}</strong>{item.detail?<small>{item.detail}</small>:null}</span><b>{item.value}</b></div>)}</div>
        {supplier.balance?<div className="commerce-dashboard-balance"><span>Supplier balance</span><strong>{supplier.balance.amount} {supplier.balance.currency}</strong></div>:null}
      </Card>
    </div>

    <Card className="commerce-dashboard-funnel-card">
      <div className="operation-section__head"><div><span>Customer journey · 30 days</span><h3>Conversion snapshot</h3></div><TrendingUp size={18}/></div>
      {funnel.length?<div className="commerce-dashboard-funnel">{funnel.map((stage,index)=><div className="commerce-dashboard-funnel__step" key={stage.key}>
        <div className="commerce-dashboard-funnel__head"><span>{String(index+1).padStart(2,'0')}</span><strong>{stage.label}</strong><b>{stage.count}</b></div>
        <div className="commerce-dashboard-funnel__track"><i style={{width:`${Math.max(stage.count?5:0,stage.count/funnelMax*100)}%`}}/></div>
        {stage.conversionFromPrevious!==null?<small>{pct(stage.conversionFromPrevious)} from previous</small>:null}
      </div>)}</div>:<p className="empty-copy">Customer funnel activity will appear here as customers browse and order.</p>}
    </Card>

    <div className="commerce-dashboard-secondary">
      <Card className="commerce-dashboard-panel commerce-dashboard-panel--activity">
        <div className="operation-section__head"><div><span>Activity feed</span><h3>Latest commerce events</h3></div><Activity size={18}/></div>
        {activity.length?<div className="commerce-dashboard-activity">{activity.map((item)=><div key={item.key}><GamingStatus value={item.outcome}/><span><strong>{item.title}{item.count>1?` · ${item.count} events`:''}</strong><small>{item.detail}{item.count>1?` · Latest ${gamingDate(item.createdAt)}`:''}</small></span></div>)}</div>:<p className="empty-copy">No commerce events recorded yet.</p>}
      </Card>

      <Card className="commerce-dashboard-panel commerce-dashboard-panel--actions">
        <div className="operation-section__head"><div><span>Quick actions</span><h3>Go where work is happening</h3></div><Store size={18}/></div>
        <div className="commerce-dashboard-actions">
          <QuickAction label="Live Operations" detail="Payments, fulfillment, risk and refunds" path="/gaming-store/live-operations" icon={Activity}/>
          <QuickAction label="Analytics" detail="Funnel and commercial performance" path="/gaming-store/analytics" icon={TrendingUp}/>
          <QuickAction label="Support" detail="Cases, disputes and customer replies" path="/gaming-store/support" icon={LifeBuoy}/>
          <QuickAction label="Promotions" detail="Campaigns, coupons and redemptions" path="/gaming-store/promotions" icon={Megaphone}/>
          <QuickAction label="Suppliers" detail="FazerCards health, preview and sync" path="/gaming-store/suppliers" icon={WalletCards}/>
        </div>
        {error?<div className="commerce-dashboard-warning"><ShieldAlert size={15}/><span>Last refresh warning: {error}</span></div>:null}
      </Card>
    </div>
  </div>;
}

function LocalGamingDashboard(){
  const orders=useGamingStore(gamingStore.getOrders);const suppliers=useGamingStore(gamingStore.getSuppliers);const products=useGamingStore(gamingStore.getProducts);const activity=useGamingStore(gamingStore.getActivity);const settings=useGamingStore(gamingStore.getSettings);
  const gross=orders.filter((o)=>o.customerPaid&&o.status!=='refunded').reduce((sum,o)=>sum+o.sellingPrice,0);const profit=orders.filter((o)=>o.customerPaid&&o.status!=='refunded').reduce((sum,o)=>sum+o.profit,0);const completed=orders.filter((o)=>o.status==='completed').length;const primary=suppliers.find((s)=>s.enabled)??suppliers[0];
  const attention=[...orders.filter((o)=>['failed','refund_pending'].includes(o.status)||orderReconciliation(o)==='payment_only').map((o)=>({title:o.number,detail:o.failureReason||`Order is ${o.status.replace(/_/g,' ')}`,status:o.status})),...suppliers.filter((s)=>s.currency==='USD'&&s.balance<settings.lowSupplierBalanceUsd).map((s)=>({title:`${s.name} balance low`,detail:gamingMoney(s.balance,s.currency),status:'degraded'}))].slice(0,5);
  return <div className="page"><SectionHeader eyebrow="Gaming Store · Local" title="Reseller operations" description="Local operations."/><div className="metric-grid"><DashboardMetric label="Orders" value={String(orders.length)} icon={ShoppingBag}/><DashboardMetric label="Gross sales" value={gamingLkr(gross)} icon={CircleDollarSign}/><DashboardMetric label="Gross profit" value={gamingLkr(profit)} icon={PackageCheck}/><DashboardMetric label="Supplier balance" value={primary?gamingMoney(primary.balance,primary.currency):'-'} icon={WalletCards}/></div><div className="gaming-dashboard-grid"><Card><div className="operation-section__head"><div><span>Attention</span><h3>Operational exceptions</h3></div><AlertTriangle size={18}/></div>{attention.length?<div className="gaming-attention">{attention.map((item)=><div key={item.title}><span><strong>{item.title}</strong><small>{item.detail}</small></span><GamingStatus value={item.status}/></div>)}</div>:<p className="empty-copy">No exceptions.</p>}</Card><Card><div className="operation-section__head"><div><span>Local state</span><h3>Store readiness</h3></div><PackageCheck size={18}/></div><div className="gaming-readiness"><div><span>Mapped products</span><strong>{products.length}</strong></div><div><span>Sellable now</span><strong>{products.filter((p)=>p.enabled&&p.availability==='available').length}</strong></div><div><span>Connected suppliers</span><strong>{suppliers.filter((s)=>s.status==='connected'&&s.enabled).length}</strong></div><div><span>Reconciled orders</span><strong>{orders.filter((o)=>orderReconciliation(o)==='reconciled').length}</strong></div></div></Card></div><Card><div className="operation-section__head"><div><span>Recent activity</span><h3>Gaming Store events</h3></div></div><div className="gaming-activity">{activity.slice(0,8).map((item)=><div key={item.id}><GamingStatus value={item.tone==='success'?'completed':item.tone==='warning'?'degraded':'processing'}/><span><strong>{item.title}</strong><small>{item.detail}</small></span></div>)}</div></Card></div>;
}

export function GamingDashboard(){return runtime.isProduction?<LiveGamingDashboard/>:<LocalGamingDashboard/>;}
