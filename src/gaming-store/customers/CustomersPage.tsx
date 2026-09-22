import { useEffect, useMemo, useState } from 'react';
import { BadgeCheck, CircleDollarSign, MailCheck, RefreshCw, Repeat2, ShoppingBag, UserRound, UsersRound, type LucideIcon } from 'lucide-react';
import { Badge, Button, Card, DataTable, Drawer, KeyValueList, PageToolbar, SectionHeader, SelectInput, StatePanel, type DataTableColumn } from '../../shared/components';
import { gamingDate, gamingLkr } from '../shared/format';
import { loadGamingCustomersSnapshot, type GamingCustomer360, type GamingCustomersSnapshot } from './customers';

const lifecycleLabel=(value:string)=>value.replaceAll('_',' ').replace(/\b\w/g,(m)=>m.toUpperCase());
const lifecycleTone=(value:string)=>value==='repeat'?'success':value==='dormant'?'warning':value==='prospect'?'neutral':'info';
const percent=(value:number,total:number)=>total?`${Math.round(value/total*100)}%`:'0%';

function safeAvatarUrl(value?:string){
  if(!value)return undefined;
  try{const url=new URL(value);return url.protocol==='https:'?url.toString():undefined;}catch{return undefined;}
}
function customerInitials(customer:Pick<GamingCustomer360,'name'|'email'>){
  const parts=customer.name.trim().split(/\s+/).filter(Boolean);
  if(parts.length>=2)return `${parts[0][0]}${parts.at(-1)?.[0]??''}`.toUpperCase();
  if(parts[0])return parts[0].slice(0,2).toUpperCase();
  return customer.email.slice(0,2).toUpperCase();
}
function CustomerAvatar({customer,size='sm'}:{customer:Pick<GamingCustomer360,'name'|'email'|'avatarUrl'>;size?:'sm'|'lg'}){
  const [failed,setFailed]=useState(false);
  const src=safeAvatarUrl(customer.avatarUrl);
  useEffect(()=>setFailed(false),[customer.avatarUrl]);
  return <span className={`customer-avatar customer-avatar--${size}`} aria-hidden="true">{src&&!failed?<img src={src} alt="" referrerPolicy="no-referrer" onError={()=>setFailed(true)}/>:<span>{customerInitials(customer)}</span>}</span>;
}

function CustomerMetric({label,value,icon:Icon,active,onClick}:{label:string;value:string;icon:LucideIcon;active?:boolean;onClick?:()=>void}){
  const content=<><div className="customer360-metric__top"><span>{label}</span><span className="customer360-metric__icon"><Icon size={16}/></span></div><strong>{value}</strong></>;
  return onClick?<button type="button" className={`customer360-metric${active?' is-active':''}`} onClick={onClick}>{content}</button>:<div className="customer360-metric">{content}</div>;
}

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
    {key:'customer',header:'Customer',render:(row)=><div className="customer-identity-cell"><CustomerAvatar customer={row}/><span><strong>{row.name}</strong><small>{row.email}{row.gamerTag?` · ${row.gamerTag}`:''}</small></span></div>},
    {key:'type',header:'Account',width:'125px',render:(row)=><Badge tone={row.accountType==='google'?'success':'neutral'}>{row.accountType==='google'?'Google verified':'Guest'}</Badge>},
    {key:'orders',header:'Orders',width:'125px',render:(row)=><div className="entity-cell"><strong>{row.orders}</strong><small>{row.verifiedOrders} paid · {row.fulfilledOrders} fulfilled</small></div>},
    {key:'spend',header:'Net spend',width:'145px',render:(row)=><div className="entity-cell"><strong>{gamingLkr(row.netSpendLkr)}</strong><small>{row.refundedLkr?`${gamingLkr(row.refundedLkr)} refunded`:`Avg ${gamingLkr(row.averageOrderValueLkr)}`}</small></div>},
    {key:'last',header:'Last purchase',width:'135px',render:(row)=><span className="customer360-muted-value">{row.lastPurchaseAt?gamingDate(row.lastPurchaseAt):'—'}</span>},
    {key:'marketing',header:'Marketing',width:'120px',render:(row)=><Badge tone={row.marketing.email?'success':'neutral'}>{row.marketing.email?'Subscribed':'No consent'}</Badge>},
    {key:'lifecycle',header:'Lifecycle',width:'105px',render:(row)=><Badge tone={lifecycleTone(row.lifecycle) as any}>{lifecycleLabel(row.lifecycle)}</Badge>},
    {key:'action',header:'',width:'80px',render:(row)=><Button onClick={()=>setSelectedId(row.customerId)}>View</Button>},
  ];
  if(loading&&!snapshot)return <div className="page"><SectionHeader eyebrow="Gaming Store" title="Customers" description="Loading customer profiles and purchase history."/><StatePanel state="loading" title="Loading customers" description="Loading customer accounts and purchase history."/></div>;
  if(error&&!snapshot)return <div className="page"><SectionHeader eyebrow="Gaming Store" title="Customers" description="Customer profiles, purchase history and marketing consent."/><StatePanel state="error" title="Customers unavailable" description={error} action={<Button onClick={()=>void load()}>Retry</Button>}/></div>;
  const summary=snapshot?.summary??{customers:0,signedIn:0,guests:0,repeat:0,marketingSubscribed:0,orders:0,netSalesLkr:0};
  return <div className="page customer360-page">
    <SectionHeader eyebrow="Gaming Store" title="Customers" description="Customer profiles, purchase history and marketing consent." action={<Button onClick={()=>void load()} disabled={loading}><RefreshCw size={14}/>Refresh</Button>}/>
    <div className="customer360-metrics">
      <CustomerMetric label="Customers" value={String(summary.customers)} icon={UsersRound} active={accountType==='all'&&lifecycle==='all'&&marketing==='all'} onClick={()=>{setAccountType('all');setLifecycle('all');setMarketing('all');}}/>
      <CustomerMetric label="Repeat customers" value={String(summary.repeat)} icon={Repeat2} active={lifecycle==='repeat'} onClick={()=>setLifecycle(lifecycle==='repeat'?'all':'repeat')}/>
      <CustomerMetric label="Marketing subscribed" value={String(summary.marketingSubscribed)} icon={MailCheck} active={marketing==='subscribed'} onClick={()=>setMarketing(marketing==='subscribed'?'all':'subscribed')}/>
      <CustomerMetric label="Net customer spend" value={gamingLkr(summary.netSalesLkr)} icon={CircleDollarSign}/>
    </div>
    <Card className="customer360-workspace">
      <div className="customer360-workspace__head"><div><span>Customer directory</span><h3>Profiles & commerce context</h3></div><small>{rows.length.toLocaleString()} of {summary.customers.toLocaleString()} customers</small></div>
      <PageToolbar query={query} onQueryChange={setQuery} placeholder="Search name, email, gamer tag or favorite product…"><SelectInput value={accountType} onChange={(event)=>setAccountType(event.target.value as typeof accountType)}><option value="all">All accounts</option><option value="google">Google accounts</option><option value="guest">Guests</option></SelectInput><SelectInput value={lifecycle} onChange={(event)=>setLifecycle(event.target.value)}><option value="all">All lifecycle</option><option value="prospect">Prospects</option><option value="new">New</option><option value="active">Active</option><option value="repeat">Repeat</option><option value="dormant">Dormant</option></SelectInput><SelectInput value={marketing} onChange={(event)=>setMarketing(event.target.value as typeof marketing)}><option value="all">All marketing</option><option value="subscribed">Subscribed</option><option value="not_subscribed">No consent</option></SelectInput></PageToolbar>
      <DataTable rows={rows} columns={columns} getKey={(row)=>row.customerId} empty="No customers match these filters."/>
    </Card>
    <Drawer className="customer360-drawer" open={Boolean(selected)} onClose={()=>setSelectedId(undefined)} title="Customer 360" description={selected?.customerId}>{selected&&<>
      <div className="customer360-profile-hero">
        <CustomerAvatar customer={selected} size="lg"/>
        <div className="customer360-profile-hero__identity"><span>Customer profile</span><h3>{selected.name}</h3><p>{selected.email}</p><div className="customer360-profile-badges"><Badge tone={selected.accountType==='google'?'success':'neutral'}>{selected.accountType==='google'?<><BadgeCheck size={12}/> Google verified</>:'Guest profile'}</Badge><Badge tone={lifecycleTone(selected.lifecycle) as any}>{lifecycleLabel(selected.lifecycle)}</Badge><Badge tone={selected.marketing.email?'success':'neutral'}>{selected.marketing.email?'Marketing subscribed':'No marketing consent'}</Badge></div></div>
      </div>
      <div className="customer360-summary-grid">
        <div><span><ShoppingBag size={14}/>Orders</span><strong>{selected.orders}</strong><small>{selected.verifiedOrders} verified · {selected.fulfilledOrders} fulfilled</small></div>
        <div><span><CircleDollarSign size={14}/>Net spend</span><strong>{gamingLkr(selected.netSpendLkr)}</strong><small>{gamingLkr(selected.refundedLkr)} refunded</small></div>
        <div><span><RefreshCw size={14}/>Last purchase</span><strong>{selected.lastPurchaseAt?gamingDate(selected.lastPurchaseAt):'—'}</strong><small>{selected.favoriteProduct||'No purchase history'}</small></div>
        <div><span><UserRound size={14}/>Average order</span><strong>{gamingLkr(selected.averageOrderValueLkr)}</strong><small>{selected.promotionUses} promotion use{selected.promotionUses===1?'':'s'}</small></div>
      </div>
      <div className="customer360-detail-grid">
        <div className="record-detail-section customer360-detail-card"><div className="customer360-section-heading"><span>Identity</span><h4>Profile & account</h4></div><KeyValueList items={[{label:'Account',value:selected.accountType==='google'?'Google verified':'Guest purchase profile'},{label:'Country',value:selected.country||'—'},{label:'Phone',value:selected.phone||'—'},{label:'Gamer tag',value:selected.gamerTag||'—'},{label:'Joined',value:selected.createdAt?gamingDate(selected.createdAt):'—'},{label:'Last login',value:selected.lastLoginAt?gamingDate(selected.lastLoginAt):'—'}]}/></div>
        <div className="record-detail-section customer360-detail-card"><div className="customer360-section-heading"><span>Marketing</span><h4>Consent status</h4></div><KeyValueList items={[{label:'Email marketing',value:selected.marketing.email?'Subscribed':'No consent'},{label:'Source',value:selected.marketing.source.replaceAll('_',' ')},{label:'Consented',value:selected.marketing.consentedAt?gamingDate(selected.marketing.consentedAt):'—'},{label:'Unsubscribed',value:selected.marketing.unsubscribedAt?gamingDate(selected.marketing.unsubscribedAt):'—'}]}/><p className="security-note">Transactional order, payment, delivery, refund and support messages remain separate from promotional marketing consent.</p></div>
      </div>
      <div className="record-detail-section customer360-detail-card"><div className="customer360-section-heading"><span>Operations</span><h4>Support & risk context</h4></div><KeyValueList items={[{label:'Support cases',value:String(selected.supportCases)},{label:'Open support cases',value:String(selected.openSupportCases)},{label:'Risk',value:selected.risk?`${selected.risk.level} · ${selected.risk.score}/100 · ${selected.risk.state}`:'No assessment'},{label:'Gross spend',value:gamingLkr(selected.grossSpendLkr)},{label:'Net spend',value:gamingLkr(selected.netSpendLkr)},{label:'Favorite product',value:selected.favoriteProduct||'—'}]}/></div>
      <div className="record-detail-section customer360-detail-card customer360-order-history"><div className="customer360-section-heading"><span>Commerce</span><h4>Order history</h4></div>{selected.orderHistory.length?<div className="customer360-orders">{selected.orderHistory.map((order)=><div key={order.orderId}><span><strong>{order.orderNumber} · {order.productName||order.offerName}</strong><small>{gamingDate(order.createdAt)} · {order.paymentState} · {order.status}{order.promotionName?` · ${order.promotionName}`:''}</small></span><strong>{gamingLkr(order.amountLkr)}</strong></div>)}</div>:<div className="customer360-empty-orders"><ShoppingBag size={18}/><span><strong>No orders recorded</strong><small>No Gaming order history yet.</small></span></div>}</div>
    </>}</Drawer>
  </div>;
}
