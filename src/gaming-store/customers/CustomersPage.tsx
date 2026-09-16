import { useEffect, useMemo, useState } from 'react';
import { CircleDollarSign, MailCheck, RefreshCw, Repeat2, UsersRound } from 'lucide-react';
import { Badge, Button, Card, DataTable, Drawer, KeyValueList, MetricCard, PageToolbar, SectionHeader, SelectInput, StatePanel, type DataTableColumn } from '../../shared/components';
import { gamingDate, gamingLkr } from '../shared/format';
import { loadGamingCustomersSnapshot, type GamingCustomer360, type GamingCustomersSnapshot } from './customers';

const lifecycleLabel=(value:string)=>value.replaceAll('_',' ').replace(/\b\w/g,(m)=>m.toUpperCase());
const lifecycleTone=(value:string)=>value==='repeat'?'success':value==='dormant'?'warning':value==='prospect'?'neutral':'info';

export function CustomersPage(){
  const [snapshot,setSnapshot]=useState<GamingCustomersSnapshot>();
  const [loading,setLoading]=useState(true);const [error,setError]=useState('');const [query,setQuery]=useState('');
  const [accountType,setAccountType]=useState<'all'|'google'|'guest'>('all');const [lifecycle,setLifecycle]=useState('all');const [marketing,setMarketing]=useState<'all'|'subscribed'|'not_subscribed'>('all');
  const [selectedId,setSelectedId]=useState<string>();
  const load=async()=>{setLoading(true);setError('');try{setSnapshot(await loadGamingCustomersSnapshot());}catch(err){setError(err instanceof Error?err.message:'Customers could not be loaded.');}finally{setLoading(false);}};
  useEffect(()=>{void load();},[]);
  const rows=useMemo(()=>{const needle=query.trim().toLowerCase();return(snapshot?.customers??[]).filter((customer)=>{
    if(accountType!=='all'&&customer.accountType!==accountType)return false;
    if(lifecycle!=='all'&&customer.lifecycle!==lifecycle)return false;
    if(marketing!=='all'&&customer.marketing.status!==marketing)return false;
    if(!needle)return true;
    return `${customer.name} ${customer.email} ${customer.phone??''} ${customer.gamerTag??''} ${customer.favoriteProduct??''}`.toLowerCase().includes(needle);
  });},[snapshot,query,accountType,lifecycle,marketing]);
  const selected=snapshot?.customers.find((row)=>row.customerId===selectedId);
  const columns:DataTableColumn<GamingCustomer360>[]=[
    {key:'customer',header:'Customer',render:(row)=><div className="entity-cell"><strong>{row.name}</strong><small>{row.email}{row.gamerTag?` · ${row.gamerTag}`:''}</small></div>},
    {key:'type',header:'Account',render:(row)=><Badge tone={row.accountType==='google'?'success':'neutral'}>{row.accountType==='google'?'Google':'Guest'}</Badge>},
    {key:'orders',header:'Orders',render:(row)=><div className="entity-cell"><strong>{row.orders}</strong><small>{row.verifiedOrders} paid · {row.fulfilledOrders} fulfilled</small></div>},
    {key:'spend',header:'Net spend',render:(row)=><div className="entity-cell"><strong>{gamingLkr(row.netSpendLkr)}</strong><small>{row.refundedLkr?`${gamingLkr(row.refundedLkr)} refunded`:`Avg ${gamingLkr(row.averageOrderValueLkr)}`}</small></div>},
    {key:'last',header:'Last purchase',render:(row)=><span>{row.lastPurchaseAt?gamingDate(row.lastPurchaseAt):'—'}</span>},
    {key:'marketing',header:'Marketing',render:(row)=><Badge tone={row.marketing.email?'success':'neutral'}>{row.marketing.email?'Subscribed':'No consent'}</Badge>},
    {key:'lifecycle',header:'Lifecycle',render:(row)=><Badge tone={lifecycleTone(row.lifecycle) as any}>{lifecycleLabel(row.lifecycle)}</Badge>},
    {key:'action',header:'',width:'80px',render:(row)=><Button onClick={()=>setSelectedId(row.customerId)}>View</Button>},
  ];
  if(loading&&!snapshot)return <div className="page"><SectionHeader eyebrow="Gaming Store" title="Customers" description="Loading canonical customer profiles and purchase history."/><StatePanel state="loading" title="Loading customers" description="Reading authenticated accounts and commerce history from production D1."/></div>;
  if(error&&!snapshot)return <div className="page"><SectionHeader eyebrow="Gaming Store" title="Customers" description="Canonical customer profiles, purchase history and marketing consent."/><StatePanel state="error" title="Customers unavailable" description={error} action={<Button onClick={()=>void load()}>Retry</Button>}/></div>;
  const summary=snapshot?.summary??{customers:0,signedIn:0,guests:0,repeat:0,marketingSubscribed:0,orders:0,netSalesLkr:0};
  return <div className="page">
    <SectionHeader eyebrow="Gaming Store" title="Customers" description="Customer 360 built from verified Google accounts, guest purchases, canonical orders and explicit marketing consent." action={<Button onClick={()=>void load()} disabled={loading}><RefreshCw size={14}/>Refresh</Button>}/>
    <div className="compact-metrics"><MetricCard label="Customers" value={String(summary.customers)} detail={`${summary.signedIn} signed in · ${summary.guests} guest`} icon={UsersRound}/><MetricCard label="Repeat customers" value={String(summary.repeat)} detail="2+ verified purchases" icon={Repeat2}/><MetricCard label="Marketing subscribed" value={String(summary.marketingSubscribed)} detail="Explicit account opt-in" icon={MailCheck}/><MetricCard label="Net customer spend" value={gamingLkr(summary.netSalesLkr)} detail={`${summary.orders} recorded orders`} icon={CircleDollarSign}/></div>
    <Card><PageToolbar query={query} onQueryChange={setQuery} placeholder="Search name, email, gamer tag or favorite product…"><SelectInput value={accountType} onChange={(event)=>setAccountType(event.target.value as typeof accountType)}><option value="all">All accounts</option><option value="google">Google accounts</option><option value="guest">Guests</option></SelectInput><SelectInput value={lifecycle} onChange={(event)=>setLifecycle(event.target.value)}><option value="all">All lifecycle</option><option value="prospect">Prospects</option><option value="new">New</option><option value="active">Active</option><option value="repeat">Repeat</option><option value="dormant">Dormant</option></SelectInput><SelectInput value={marketing} onChange={(event)=>setMarketing(event.target.value as typeof marketing)}><option value="all">All marketing</option><option value="subscribed">Subscribed</option><option value="not_subscribed">No consent</option></SelectInput></PageToolbar><DataTable rows={rows} columns={columns} getKey={(row)=>row.customerId} empty="No canonical customers match these filters."/></Card>
    <Drawer open={Boolean(selected)} onClose={()=>setSelectedId(undefined)} title={selected?.name??'Customer'} description={selected?.email}>{selected&&<>
      <div className="record-detail-section"><h4>Customer profile</h4><KeyValueList items={[{label:'Account',value:selected.accountType==='google'?'Google verified':'Guest purchase profile'},{label:'Lifecycle',value:lifecycleLabel(selected.lifecycle)},{label:'Country',value:selected.country||'—'},{label:'Phone',value:selected.phone||'—'},{label:'Gamer tag',value:selected.gamerTag||'—'},{label:'Joined',value:selected.createdAt?gamingDate(selected.createdAt):'—'},{label:'Last login',value:selected.lastLoginAt?gamingDate(selected.lastLoginAt):'—'}]}/></div>
      <div className="record-detail-section"><h4>Commerce</h4><KeyValueList items={[{label:'Orders',value:String(selected.orders)},{label:'Verified purchases',value:String(selected.verifiedOrders)},{label:'Fulfilled',value:String(selected.fulfilledOrders)},{label:'Net spend',value:gamingLkr(selected.netSpendLkr)},{label:'Refunded',value:gamingLkr(selected.refundedLkr)},{label:'Average order',value:gamingLkr(selected.averageOrderValueLkr)},{label:'Favorite product',value:selected.favoriteProduct||'—'},{label:'Promotion uses',value:String(selected.promotionUses)}]}/></div>
      <div className="record-detail-section"><h4>Marketing consent</h4><KeyValueList items={[{label:'Email marketing',value:selected.marketing.email?'Subscribed':'No consent'},{label:'Source',value:selected.marketing.source.replaceAll('_',' ')},{label:'Consented',value:selected.marketing.consentedAt?gamingDate(selected.marketing.consentedAt):'—'},{label:'Unsubscribed',value:selected.marketing.unsubscribedAt?gamingDate(selected.marketing.unsubscribedAt):'—'}]}/><p className="security-note">Transactional order, payment, delivery, refund and support messages remain separate from promotional marketing consent.</p></div>
      <div className="record-detail-section"><h4>Operational context</h4><KeyValueList items={[{label:'Support cases',value:String(selected.supportCases)},{label:'Open support cases',value:String(selected.openSupportCases)},{label:'Risk',value:selected.risk?`${selected.risk.level} · ${selected.risk.score}/100 · ${selected.risk.state}`:'No assessment'}]}/></div>
      <div className="record-detail-section"><h4>Order history</h4>{selected.orderHistory.length?<div className="gaming-activity">{selected.orderHistory.map((order)=><div key={order.orderId}><span><strong>{order.orderNumber} · {order.productName||order.offerName}</strong><small>{gamingDate(order.createdAt)} · {order.paymentState} · {order.status}{order.promotionName?` · ${order.promotionName}`:''}</small></span><strong>{gamingLkr(order.amountLkr)}</strong></div>)}</div>:<p className="empty-copy">No orders recorded.</p>}</div>
    </>}</Drawer>
  </div>;
}
