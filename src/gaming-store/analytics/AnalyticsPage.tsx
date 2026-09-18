import { useEffect, useMemo, useState } from 'react';
import { Activity, BadgeDollarSign, ChartNoAxesCombined, CircleDollarSign, Clock3, Filter, MailCheck, MousePointerClick, PackageCheck, RefreshCw, Search, ShieldAlert, ShoppingBag, TrendingUp, type LucideIcon } from 'lucide-react';
import { Button, Card, DataTable, SectionHeader, StatePanel, type DataTableColumn } from '../../shared/components';
import { gamingLkr } from '../shared/format';
import { loadGamingAnalyticsSnapshot, type GamingAnalyticsAcquisition, type GamingAnalyticsDay, type GamingAnalyticsProduct, type GamingAnalyticsSnapshot, type GamingAnalyticsSupplier } from './analytics';

const rate=(value:number|null|undefined)=>value===null||value===undefined?'—':`${value}%`;
const minutes=(value:number|null)=>value===null?'—':value<60?`${Math.round(value)} min`:`${(value/60).toFixed(1)} h`;
const provider=(value:string)=>value==='fazercards'?'FazerCards':value==='unrouted'?'Unrouted':value.replaceAll('_',' ');
const shortDate=(value:string)=>new Date(`${value}T00:00:00`).toLocaleDateString('en-LK',{month:'short',day:'numeric'});

type TrendKey='productViews'|'checkoutStarted'|'ordersCreated'|'paymentVerified'|'fulfilled';
const trendSeries:Array<{key:TrendKey;label:string;className:string}>=[
  {key:'productViews',label:'Views',className:'is-views'},
  {key:'checkoutStarted',label:'Checkout',className:'is-checkout'},
  {key:'ordersCreated',label:'Orders',className:'is-orders'},
  {key:'paymentVerified',label:'Verified',className:'is-verified'},
  {key:'fulfilled',label:'Fulfilled',className:'is-fulfilled'},
];

function AnalyticsTrend({rows}:{rows:GamingAnalyticsDay[]}){
  const width=720,height=220,padX=16,padY=18;
  const max=Math.max(1,...rows.flatMap((row)=>trendSeries.map((series)=>row[series.key])));
  const point=(rowIndex:number,value:number)=>{
    const x=rows.length<=1?width/2:padX+(rowIndex/(rows.length-1))*(width-padX*2);
    const y=height-padY-(value/max)*(height-padY*2);
    return `${x},${y}`;
  };
  const labels=rows.length?[rows[0],rows[Math.floor((rows.length-1)/2)],rows[rows.length-1]]:[];
  return <div className="analytics-trend">
    <div className="analytics-trend__legend">{trendSeries.map((series)=><span key={series.key} className={series.className}><i/>{series.label}</span>)}</div>
    <div className="analytics-trend__chart" role="img" aria-label="Daily funnel activity trend">
      {rows.length?<svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
        <g className="analytics-trend__grid"><line x1={padX} y1={padY} x2={width-padX} y2={padY}/><line x1={padX} y1={height/2} x2={width-padX} y2={height/2}/><line x1={padX} y1={height-padY} x2={width-padX} y2={height-padY}/></g>
        {trendSeries.map((series)=><polyline key={series.key} className={`analytics-trend__line ${series.className}`} points={rows.map((row,index)=>point(index,row[series.key])).join(' ')}/>) }
      </svg>:<div className="analytics-trend__empty">No daily activity yet.</div>}
    </div>
    {labels.length?<div className="analytics-trend__axis">{labels.map((row,index)=><span key={`${row.date}-${index}`}>{shortDate(row.date)}</span>)}</div>:null}
  </div>;
}

function AnalyticsStat({label,value,detail,icon:Icon,tone='default'}:{label:string;value:string;detail:string;icon:LucideIcon;tone?:'default'|'accent'|'success'|'warning'}){
  return <div className={`analytics-stat analytics-stat--${tone}`}>
    <div className="analytics-stat__head"><span>{label}</span><Icon size={17}/></div>
    <strong>{value}</strong>
    <small>{detail}</small>
  </div>;
}

export function GamingAnalyticsPage(){
  const [days,setDays]=useState<7|30|90>(30); const [snapshot,setSnapshot]=useState<GamingAnalyticsSnapshot>(); const [loading,setLoading]=useState(true); const [error,setError]=useState('');
  const load=async(nextDays=days)=>{setLoading(true);setError('');try{setSnapshot(await loadGamingAnalyticsSnapshot(nextDays));}catch(err){setError(err instanceof Error?err.message:'Gaming analytics could not be loaded.');}finally{setLoading(false);}};
  useEffect(()=>{void load(days);},[days]);
  const funnelMax=useMemo(()=>Math.max(1,...(snapshot?.funnel.stages.map((stage)=>stage.count)??[1])),[snapshot]);
  if(loading&&!snapshot)return <div className="page"><SectionHeader eyebrow="Gaming Store · P4" title="Commerce Analytics" description="Loading event-derived funnel and operational performance."/><StatePanel state="loading" title="Loading analytics" description="Reading canonical Gaming commerce events and operational records from the shared D1 store."/></div>;
  if(error&&!snapshot)return <div className="page"><SectionHeader eyebrow="Gaming Store · P4" title="Commerce Analytics" description="Commerce analytics are temporarily unavailable."/><StatePanel state="error" title="Analytics unavailable" description={error} action={<Button onClick={()=>void load()}><RefreshCw size={15}/>Retry</Button>}/></div>;
  if(!snapshot)return null;
  const productColumns:DataTableColumn<GamingAnalyticsProduct>[]=[
    {key:'product',header:'Product',render:(row)=><div className="entity-cell"><strong>{row.productName}</strong><small>{row.productId}</small></div>},
    {key:'views',header:'Views',render:(row)=><strong>{row.views}</strong>},{key:'checkout',header:'Checkout',render:(row)=><span>{row.checkoutStarted}</span>},{key:'orders',header:'Orders',render:(row)=><span>{row.orders}</span>},{key:'paid',header:'Paid',render:(row)=><span>{row.paidOrders}</span>},{key:'fulfilled',header:'Fulfilled',render:(row)=><span>{row.fulfilledOrders}</span>},{key:'conversion',header:'View → order',render:(row)=><div className="analytics-conversion-cell"><strong>{rate(row.viewToOrderRate)}</strong><span><i style={{width:`${Math.max(0,Math.min(100,row.viewToOrderRate??0))}%`}}/></span></div>},
    ...(snapshot.capabilities.finance?[{key:'revenue',header:'Collected',render:(row:GamingAnalyticsProduct)=><strong>{gamingLkr(row.grossCollectedLkr??0)}</strong>},{key:'margin',header:'Est. margin',render:(row:GamingAnalyticsProduct)=><strong>{gamingLkr(row.estimatedMarginLkr??0)}</strong>}]:[]),
  ];
  const supplierColumns:DataTableColumn<GamingAnalyticsSupplier>[]=[{key:'supplier',header:'Supplier route',render:(row)=><strong>{provider(row.providerKey)}</strong>},{key:'orders',header:'Orders',render:(row)=><span>{row.orders}</span>},{key:'complete',header:'Completed',render:(row)=><span>{row.completed}</span>},{key:'failed',header:'Failed',render:(row)=><span>{row.failed}</span>},{key:'success',header:'Resolved success',render:(row)=><div className="analytics-conversion-cell"><strong>{rate(row.successRate)}</strong><span><i style={{width:`${Math.max(0,Math.min(100,row.successRate??0))}%`}}/></span></div>},...(snapshot.capabilities.finance?[{key:'value',header:'Paid value',render:(row:GamingAnalyticsSupplier)=><strong>{gamingLkr(row.paidValueLkr??0)}</strong>},{key:'margin',header:'Est. margin',render:(row:GamingAnalyticsSupplier)=><strong>{gamingLkr(row.estimatedMarginLkr??0)}</strong>}]:[])];
  const acquisitionColumns:DataTableColumn<GamingAnalyticsAcquisition>[]=[
    {key:'source',header:'Acquisition',render:(row)=><div className="entity-cell"><strong>{row.source==='direct'?'Direct / unknown':row.source}</strong><small>{row.medium}{row.campaign!=='—'?` · ${row.campaign}`:''}</small></div>},
    {key:'orders',header:'Orders',render:(row)=><strong>{row.orders}</strong>},
    {key:'verified',header:'Paid',render:(row)=><span>{row.verifiedOrders}</span>},
    {key:'fulfilled',header:'Fulfilled',render:(row)=><span>{row.fulfilledOrders}</span>},
    {key:'paidRate',header:'Order → paid',render:(row)=><div className="analytics-conversion-cell"><strong>{rate(row.paidRate)}</strong><span><i style={{width:`${Math.max(0,Math.min(100,row.paidRate??0))}%`}}/></span></div>},
    ...(snapshot.capabilities.finance?[{key:'value',header:'Collected',render:(row:GamingAnalyticsAcquisition)=><strong>{gamingLkr(row.grossCollectedLkr??0)}</strong>},{key:'margin',header:'Est. margin',render:(row:GamingAnalyticsAcquisition)=><strong>{gamingLkr(row.estimatedMarginLkr??0)}</strong>}]:[]),
  ];
  const fulfilledConversion=snapshot.funnel.stages.find((stage)=>stage.key==='fulfilled')?.conversionFromPrevious;
  const topProduct=[...snapshot.products].sort((a,b)=>b.views-a.views)[0];
  return <div className="page gaming-analytics-page">
    <SectionHeader eyebrow="Gaming Store · P4" title="Commerce Analytics" description="Understand demand, conversion, delivery health and commercial performance from the canonical Gaming event stream." action={<div className="analytics-window" aria-label="Analytics window">{([7,30,90] as const).map((value)=><Button key={value} variant={days===value?'primary':'secondary'} onClick={()=>setDays(value)}>{value}d</Button>)}</div>}/>

    <div className="analytics-kpi-strip">
      <AnalyticsStat label="Orders" value={String(snapshot.business.orders)} detail={`${snapshot.business.verifiedOrders} payment verified`} icon={ShoppingBag} tone="accent"/>
      <AnalyticsStat label="View → order" value={rate(snapshot.funnel.overallViewToOrderRate)} detail={snapshot.dataQuality.earlyFunnelInstrumented?'Instrumented conversion':'Awaiting funnel coverage'} icon={TrendingUp}/>
      <AnalyticsStat label="Paid → fulfilled" value={rate(fulfilledConversion)} detail={`${snapshot.business.fulfilledOrders} fulfilled`} icon={PackageCheck} tone="success"/>
      {snapshot.capabilities.finance?<AnalyticsStat label="Net sales" value={gamingLkr(snapshot.business.netSalesLkr??0)} detail={`${gamingLkr(snapshot.business.estimatedMarginLkr??0)} est. margin`} icon={CircleDollarSign} tone="success"/>:<AnalyticsStat label="Refund rate" value={rate(snapshot.business.refundRate)} detail={`${snapshot.business.refundedOrders} refunded orders`} icon={RefreshCw} tone="warning"/>}
    </div>

    <Card className="analytics-tracking-panel">
      <div className="operation-section__head"><div><span>First-party measurement</span><h3>Tracking health</h3></div><Activity size={18}/></div>
      <div className="analytics-tracking-health">
        <div className={`analytics-tracking-state is-${snapshot.tracking.status}`}><span>{snapshot.tracking.status==='active'?'Active':snapshot.tracking.status==='quiet'?'Quiet':'Awaiting data'}</span><strong>{snapshot.tracking.lastEventAt?new Date(snapshot.tracking.lastEventAt).toLocaleString('en-LK'):'No storefront event yet'}</strong><small>{snapshot.tracking.eventCount} privacy-safe storefront events in this window</small></div>
        <AnalyticsStat label="Page views" value={String(snapshot.tracking.pageViews)} detail="First-party SPA navigation" icon={MousePointerClick}/>
        <AnalyticsStat label="Searches" value={String(snapshot.tracking.searches)} detail={`${snapshot.tracking.filterUses} filter interactions`} icon={Search}/>
        <AnalyticsStat label="Offer selections" value={String(snapshot.tracking.offerSelections)} detail={`${snapshot.tracking.supportOpens} support opens`} icon={Filter}/>
      </div>
      <div className="analytics-landing-row"><span>Top pages</span>{snapshot.tracking.landingPages.length?snapshot.tracking.landingPages.slice(0,5).map((row)=><span key={row.path}><strong>{row.path}</strong><small>{row.views} views</small></span>):<small>No page-view activity recorded yet.</small>}</div>
    </Card>

    <div className="analytics-insight-grid">
      <Card className="analytics-panel analytics-panel--funnel">
        <div className="operation-section__head"><div><span>Customer journey</span><h3>Funnel performance</h3></div><ChartNoAxesCombined size={18}/></div>
        <div className="analytics-funnel analytics-funnel--steps">{snapshot.funnel.stages.map((stage,index)=><div className="analytics-funnel__row" key={stage.key}>
          <span className="analytics-funnel__index">{String(index+1).padStart(2,'0')}</span>
          <div className="analytics-funnel__label"><strong>{stage.label}</strong><small>{stage.conversionFromPrevious===null?'Starting stage':`${rate(stage.conversionFromPrevious)} from previous`}</small></div>
          <div className="analytics-funnel__bar"><span style={{width:`${Math.max(2,stage.count/funnelMax*100)}%`}}/></div>
          <strong className="analytics-funnel__count">{stage.count}</strong>
        </div>)}</div>
        <p className="analytics-coverage-note"><span>{snapshot.dataQuality.earlyFunnelInstrumented?'Live funnel coverage':'Partial funnel coverage'}</span>{snapshot.dataQuality.coverageNote}{snapshot.dataQuality.coverageStart?` Coverage starts ${new Date(snapshot.dataQuality.coverageStart).toLocaleString('en-LK')}.`:''}</p>
      </Card>

      <Card className="analytics-panel analytics-panel--trend">
        <div className="operation-section__head"><div><span>Activity</span><h3>Daily commerce pulse</h3></div><TrendingUp size={18}/></div>
        <AnalyticsTrend rows={snapshot.daily}/>
        <div className="analytics-trend-summary">
          <div><span>Most viewed</span><strong>{topProduct?.productName??'No activity yet'}</strong><small>{topProduct?`${topProduct.views} views in this window`:'Product activity will appear here.'}</small></div>
          <div><span>View → fulfilled</span><strong>{rate(snapshot.funnel.overallViewToFulfilledRate)}</strong><small>End-to-end funnel conversion</small></div>
        </div>
      </Card>
    </div>

    <Card className="analytics-health-panel">
      <div className="operation-section__head"><div><span>Operations</span><h3>Commerce health</h3></div><ShieldAlert size={18}/></div>
      <div className="analytics-health-grid">
        <AnalyticsStat label="Risk holds" value={String(snapshot.business.riskHeld)} detail={`${rate(snapshot.business.riskHoldRate)} of assessed orders`} icon={ShieldAlert}/>
        <AnalyticsStat label="Notification delivery" value={rate(snapshot.business.notificationDeliveryRate)} detail={`${snapshot.business.notificationAttention} need attention`} icon={MailCheck}/>
        <AnalyticsStat label="Payment verification" value={minutes(snapshot.business.avgPaymentVerificationMinutes)} detail="Average order → verified" icon={Clock3}/>
        <AnalyticsStat label="Fulfillment" value={minutes(snapshot.business.avgFulfillmentMinutesFromPayment)} detail="Average verified → delivered" icon={PackageCheck}/>
        {snapshot.capabilities.finance?<AnalyticsStat label="Completed refunds" value={gamingLkr(snapshot.business.refundsLkr??0)} detail={`${rate(snapshot.business.refundRate)} refund rate`} icon={RefreshCw}/>:null}
        {snapshot.capabilities.finance?<AnalyticsStat label="Estimated margin" value={gamingLkr(snapshot.business.estimatedMarginLkr??0)} detail="Selected-window cohort economics" icon={BadgeDollarSign} tone="success"/>:null}
      </div>
    </Card>

    <Card className="analytics-table-card analytics-acquisition-card"><div className="operation-section__head"><div><span>Acquisition</span><h3>Campaign & source performance</h3><p>Attribution is snapshotted server-side with the order; GTM is not required as the measurement source of truth.</p></div><MousePointerClick size={18}/></div><DataTable rows={snapshot.acquisition} columns={acquisitionColumns} getKey={(row)=>`${row.source}:${row.medium}:${row.campaign}`} empty="No attributed orders have been recorded in this window."/></Card>
    <Card className="analytics-table-card"><div className="operation-section__head"><div><span>Products</span><h3>Product performance</h3></div><TrendingUp size={18}/></div><DataTable rows={snapshot.products} columns={productColumns} getKey={(row)=>row.productId} empty="No product activity has been recorded in this window."/></Card>
    <Card className="analytics-table-card"><div className="operation-section__head"><div><span>Routing</span><h3>Supplier performance</h3></div><PackageCheck size={18}/></div><DataTable rows={snapshot.suppliers} columns={supplierColumns} getKey={(row)=>row.providerKey} empty="No supplier-routed orders have been recorded in this window."/></Card>
    {error?<Card className="architecture-callout"><strong>Last refresh warning</strong><p>{error}</p></Card>:null}
  </div>;
}
