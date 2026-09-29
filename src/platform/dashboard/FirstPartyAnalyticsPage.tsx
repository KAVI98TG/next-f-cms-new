import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { Activity, CheckCircle2, Clock3, Eye, FilePenLine, MousePointerClick, RefreshCw, Send, ShieldCheck, TriangleAlert } from "lucide-react";
import { Button, Card, DataTable, SectionHeader, StatePanel, type DataTableColumn } from "../../shared/components";
import { loadFirstPartyAnalytics, loadTrackingProperties, type TrackingDimension, type TrackingHealth, type TrackingProperty, type TrackingReport } from "./firstPartyAnalytics";

const trackedEvents=[
  {key:"page.viewed",label:"Page views",shortLabel:"Views",className:"is-views",icon:Eye},
  {key:"cta.clicked",label:"CTA clicks",shortLabel:"CTA",className:"is-cta",icon:MousePointerClick},
  {key:"form.started",label:"Form starts",shortLabel:"Starts",className:"is-starts",icon:FilePenLine},
  {key:"form.submitted",label:"Form submissions",shortLabel:"Submitted",className:"is-submitted",icon:Send},
] as const;
type TrackedEventKey=(typeof trackedEvents)[number]["key"];
type AnalyticsDay={date:string}&Record<TrackedEventKey,number>;

const eventLabel=(key:string)=>key.split(".").map((part)=>part.charAt(0).toUpperCase()+part.slice(1)).join(" ");
const formatNumber=(value:number)=>new Intl.NumberFormat("en-LK").format(value);
const formatDate=(value:string)=>new Date(`${value}T00:00:00Z`).toLocaleDateString("en-LK",{month:"short",day:"numeric",timeZone:"UTC"});
const formatDateTime=(value?:string|null)=>value?new Date(value).toLocaleString("en-LK",{dateStyle:"medium",timeStyle:"short"}):"No data yet";
const ratio=(value:number,total:number)=>total>0?`${(value/total*100).toFixed(value===total?0:1)}%`:"Not available";

function AnalyticsKpi({label,value,detail,icon:Icon,tone="default"}:{label:string;value:number;detail:string;icon:ComponentType<{size?:number}>;tone?:"default"|"accent"|"success"|"warning"}){
  return <div className={`analytics-stat analytics-stat--${tone}`}><div className="analytics-stat__head"><span>{label}</span><Icon size={17}/></div><strong>{formatNumber(value)}</strong><small className="analytics-stat__detail">{detail}</small></div>;
}

function buildDailySeries(dimensions:TrackingDimension[],days:number):AnalyticsDay[]{
  const byDate=new Map<string,AnalyticsDay>();
  const today=new Date();today.setUTCHours(0,0,0,0);
  for(let offset=days-1;offset>=0;offset--){const date=new Date(today);date.setUTCDate(today.getUTCDate()-offset);const key=date.toISOString().slice(0,10);byDate.set(key,{date:key,"page.viewed":0,"cta.clicked":0,"form.started":0,"form.submitted":0});}
  for(const row of dimensions){if(!trackedEvents.some((event)=>event.key===row.eventKey))continue;const day=byDate.get(row.hourStart.slice(0,10));if(day)day[row.eventKey as TrackedEventKey]+=row.value;}
  return [...byDate.values()];
}

function AnalyticsTrend({rows}:{rows:AnalyticsDay[]}){
  const width=760,height=236,padX=18,padY=20;
  const max=Math.max(1,...rows.flatMap((row)=>trackedEvents.map((event)=>row[event.key])));
  const point=(index:number,value:number)=>`${rows.length<=1?width/2:padX+(index/(rows.length-1))*(width-padX*2)},${height-padY-(value/max)*(height-padY*2)}`;
  const labelIndexes=[0,Math.floor((rows.length-1)/2),rows.length-1].filter((value,index,array)=>value>=0&&array.indexOf(value)===index);
  const hasActivity=rows.some((row)=>trackedEvents.some((event)=>row[event.key]>0));
  return <div className="analytics-trend analytics-trend--platform"><div className="analytics-trend__legend">{trackedEvents.map((event)=><span key={event.key} className={event.className}><i/>{event.shortLabel}</span>)}</div><div className="analytics-trend__chart" role="img" aria-label="Daily first-party analytics event trend">{hasActivity?<svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true"><g className="analytics-trend__grid"><line x1={padX} y1={padY} x2={width-padX} y2={padY}/><line x1={padX} y1={height/2} x2={width-padX} y2={height/2}/><line x1={padX} y1={height-padY} x2={width-padX} y2={height-padY}/></g>{trackedEvents.map((event)=><polyline key={event.key} className={`analytics-trend__line ${event.className}`} points={rows.map((row,index)=>point(index,row[event.key])).join(" ")}/>)}</svg>:<div className="analytics-trend__empty"><Activity size={20}/><span>Consented event activity will appear here.</span></div>}</div><div className="analytics-trend__axis">{labelIndexes.map((index)=><span key={rows[index].date}>{formatDate(rows[index].date)}</span>)}</div></div>;
}

export function FirstPartyAnalyticsPage(){
  const [days,setDays]=useState<7|30|90>(30);const [report,setReport]=useState<TrackingReport>();const [health,setHealth]=useState<TrackingHealth>();const [loading,setLoading]=useState(true);const [error,setError]=useState("");
  const requestSequence=useRef(0);
  const [properties,setProperties]=useState<TrackingProperty[]>([]);const [propertyId,setPropertyId]=useState("");const [environment,setEnvironment]=useState("production");const [propertiesLoaded,setPropertiesLoaded]=useState(false);
  const property=properties.find((item)=>item.propertyId===propertyId);
  useEffect(()=>{let active=true;void loadTrackingProperties().then((result)=>{if(!active)return;setProperties(result.properties);const first=result.properties.find((item)=>item.status==="active"&&item.environmentBindings.some((binding)=>binding.status==="active"&&binding.reportingEnabled));if(first){setPropertyId(first.propertyId);setEnvironment(first.environmentBindings.find((binding)=>binding.status==="active"&&binding.reportingEnabled)?.environment||"production");}}).catch((value)=>{if(active)setError(value instanceof Error?value.message:"Properties could not be loaded.");}).finally(()=>{if(active)setPropertiesLoaded(true);});return()=>{active=false;};},[]);
  const load=async()=>{if(!property)return;const sequence=++requestSequence.current;setLoading(true);setError("");try{const result=await loadFirstPartyAnalytics(days,property.siteRef,environment);if(sequence===requestSequence.current){setReport(result.report);setHealth(result.health);}}catch(value){if(sequence===requestSequence.current)setError(value instanceof Error?value.message:"Analytics could not be loaded.");}finally{if(sequence===requestSequence.current)setLoading(false);}};
  useEffect(()=>{if(property)void load();},[days,propertyId,environment]);
  const rows=useMemo(()=>report?.dimensions.slice().reverse().slice(0,100)??[],[report]);
  const totals=useMemo(()=>Object.fromEntries(trackedEvents.map((event)=>[event.key,report?.metrics.find((metric)=>metric.eventKey===event.key)?.value??0])) as Record<TrackedEventKey,number>,[report]);
  const daily=useMemo(()=>buildDailySeries(report?.dimensions??[],days),[report,days]);
  const totalEvents=Object.values(totals).reduce((sum,value)=>sum+value,0);const maxEvent=Math.max(1,...Object.values(totals));
  if(!propertiesLoaded)return <div className="page"><SectionHeader eyebrow="Platform" title="First-party analytics" description="Loading authorized Sites."/><StatePanel state="loading" title="Loading properties" description="Resolving your authorized analytics properties."/></div>;
  if(!property)return <div className="page"><SectionHeader eyebrow="Platform" title="First-party analytics" description="Site-scoped analytics properties."/><StatePanel state={error?"error":"empty"} title={error?"Properties unavailable":"No active analytics property"} description={error||"A validated Site Manifest must be provisioned before its analytics appear here."}/></div>;
  if(loading&&!report)return <div className="page"><SectionHeader eyebrow="Platform" title="First-party analytics" description={`Loading analytics for ${property.siteName}.`}/><StatePanel state="loading" title="Loading analytics" description="Reading aggregate reports and tracking health."/></div>;
  if(error&&!report)return <div className="page"><SectionHeader eyebrow="Platform" title="First-party analytics" description="The reporting surface is temporarily unavailable."/><StatePanel state="error" title="Analytics unavailable" description={error} action={<Button onClick={()=>void load()}><RefreshCw size={15}/>Retry</Button>}/></div>;
  const columns:DataTableColumn<TrackingDimension>[]=[{key:"time",header:"Hour",render:(row)=><span>{new Date(row.hourStart).toLocaleString("en-LK")}</span>},{key:"event",header:"Event",render:(row)=><strong>{eventLabel(row.eventKey)}</strong>},{key:"count",header:"Events",render:(row)=><strong>{formatNumber(row.value)}</strong>}];
  const acceptedRate=health?.receivedCount?health.acceptedCount/health.receivedCount*100:0;
  const funnel=[{key:"page.viewed",label:"Page viewed",value:totals["page.viewed"]},{key:"cta.clicked",label:"CTA clicked",value:totals["cta.clicked"]},{key:"form.started",label:"Form started",value:totals["form.started"]},{key:"form.submitted",label:"Form submitted",value:totals["form.submitted"]}] as const;
  return <div className="page gaming-analytics-page platform-analytics-page">
    <SectionHeader eyebrow="Platform / Analytics" title="First-party analytics" description={`Consented website activity and tracking quality for ${property.siteName}.`} action={<div className="platform-analytics-actions"><label className="platform-analytics-scope">Site <select aria-label="Analytics site" value={propertyId} onChange={(event)=>{const next=properties.find((item)=>item.propertyId===event.target.value);requestSequence.current++;setReport(undefined);setHealth(undefined);setPropertyId(event.target.value);setEnvironment(next?.environmentBindings.find((binding)=>binding.status==="active"&&binding.reportingEnabled)?.environment||"production");}}>{properties.filter((item)=>item.status==="active").map((item)=><option key={item.propertyId} value={item.propertyId}>{item.siteName}</option>)}</select></label><label className="platform-analytics-scope">Environment <select aria-label="Analytics environment" value={environment} onChange={(event)=>{requestSequence.current++;setReport(undefined);setHealth(undefined);setEnvironment(event.target.value);}}>{property.environmentBindings.filter((binding)=>binding.status==="active"&&binding.reportingEnabled).map((binding)=><option key={binding.bindingId} value={binding.environment}>{binding.environment}</option>)}</select></label><div className="analytics-window" aria-label="Analytics window">{([7,30,90] as const).map((value)=><Button key={value} variant={days===value?"primary":"secondary"} onClick={()=>setDays(value)}>{value}d</Button>)}</div><Button variant="secondary" onClick={()=>void load()} disabled={loading} aria-label="Refresh analytics"><RefreshCw size={15}/>{loading?"Refreshing":"Refresh"}</Button></div>}/>

    <div className="platform-analytics-meta"><span>{formatDateTime(report?.periodStart)} - {formatDateTime(report?.periodEnd)}</span><span>Updated {formatDateTime(report?.generatedAt)}</span><span>Aggregated event counts · no raw form data</span></div>

    <div className="analytics-kpi-strip">
      <AnalyticsKpi label="Page views" value={totals["page.viewed"]} detail={`${days}-day consented activity`} icon={Eye} tone="accent"/>
      <AnalyticsKpi label="CTA clicks" value={totals["cta.clicked"]} detail={`${ratio(totals["cta.clicked"],totals["page.viewed"])} of page-view events`} icon={MousePointerClick}/>
      <AnalyticsKpi label="Form starts" value={totals["form.started"]} detail={`${ratio(totals["form.started"],totals["cta.clicked"])} of CTA-click events`} icon={FilePenLine} tone="warning"/>
      <AnalyticsKpi label="Submissions" value={totals["form.submitted"]} detail={`${ratio(totals["form.submitted"],totals["form.started"])} of form-start events`} icon={Send} tone="success"/>
    </div>

    <div className="platform-analytics-primary">
      <Card className="analytics-panel platform-analytics-trend"><div className="operation-section__head"><div><span>Activity trend</span><h3>Events over time</h3><p>Daily aggregate counts for the selected reporting window.</p></div><Activity size={18}/></div><AnalyticsTrend rows={daily}/></Card>
      <Card className="analytics-panel platform-analytics-funnel"><div className="operation-section__head"><div><span>Journey signals</span><h3>Event progression</h3><p>Event ratios show interaction volume, not unique-user conversion.</p></div><MousePointerClick size={18}/></div><div className="analytics-funnel analytics-funnel--steps">{funnel.map((step,index)=>{const previous=index?funnel[index-1].value:step.value;return <div className="analytics-funnel__row" key={step.key}><span className="analytics-funnel__index">{String(index+1).padStart(2,"0")}</span><div className="analytics-funnel__label"><strong>{step.label}</strong><small>{index?`${ratio(step.value,previous)} from previous event`:"Entry signal"}</small></div><div className="analytics-funnel__bar"><span style={{width:`${step.value?Math.max(3,step.value/Math.max(1,funnel[0].value)*100):0}%`}}/></div><strong className="analytics-funnel__count">{formatNumber(step.value)}</strong></div>;})}</div><p className="analytics-coverage-note"><span>Privacy-safe measurement</span>Counts include only events collected after analytics consent. Form contents and contact details are excluded.</p></Card>
    </div>

    <div className="platform-analytics-secondary">
      <Card className="analytics-panel"><div className="operation-section__head"><div><span>Event mix</span><h3>What visitors did</h3><p>{formatNumber(totalEvents)} accepted tracked events in this window.</p></div><CheckCircle2 size={18}/></div><div className="platform-event-mix">{trackedEvents.map((event)=><div key={event.key}><div><span>{event.label}</span><strong>{formatNumber(totals[event.key])}</strong></div><span><i className={event.className} style={{width:`${totals[event.key]/maxEvent*100}%`}}/></span><small>{ratio(totals[event.key],totalEvents)} of tracked activity</small></div>)}</div></Card>
      <Card className="analytics-panel"><div className="operation-section__head"><div><span>Data quality</span><h3>Collection health</h3><p>Lifetime ingestion and current pipeline state.</p></div><ShieldCheck size={18}/></div><div className="platform-quality-list"><div><span><i className={`is-${health?.collectorStatus}`}/>Collector</span><strong>{health?.collectorStatus??"unknown"}</strong></div><div><span><i className={`is-${health?.processingStatus}`}/>Processing</span><strong>{health?.processingStatus??"unknown"}</strong></div><div><span>Accepted rate</span><strong>{acceptedRate.toFixed(1)}%</strong></div><div><span>Consent restricted</span><strong>{formatNumber(health?.consentRestrictedCount??0)}</strong></div><div><span>Rejected / schema errors</span><strong>{formatNumber((health?.rejectedCount??0)+(health?.schemaErrorCount??0))}</strong></div><div><span>SDK / Contract</span><strong>{health?.sdkDetected?`${health.sdkVersion} / ${health.contractVersion}`:"Not detected"}</strong></div></div></Card>
    </div>

    <Card className="analytics-table-card"><div className="operation-section__head"><div><span>Hourly detail</span><h3>Event activity</h3><p>Most recent aggregate rows, newest first.</p></div><div className="platform-freshness"><Clock3 size={15}/><span>Fresh through {formatDateTime(report?.sourceFreshThrough)}</span></div></div><DataTable rows={rows} columns={columns} getKey={(row)=>`${row.hourStart}:${row.eventKey}`} empty="No accepted first-party events have been processed in this window."/></Card>
    {error?<Card className="architecture-callout"><TriangleAlert size={17}/><div><strong>Last refresh warning</strong><p>{error}</p></div></Card>:null}
  </div>;
}
