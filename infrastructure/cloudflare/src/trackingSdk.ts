export const TRACKING_SDK_VERSION="1.0.0";

export const trackingSdkSource=`(()=>{
  "use strict";
  const SDK_ID="nextf.tracking-sdk",SDK_VERSION="1.0.0",SCHEMA_VERSION="1.0.0",MAX_QUEUE=20,FLUSH_MS=5000,MAX_ATTEMPTS=3;
  let config=null,queue=[],timer=0,attempts=0,consent=null,visitorId=null,sessionId=null;
  const uuid=()=>crypto.randomUUID();
  const now=()=>new Date().toISOString();
  const storage=(kind,key,value)=>{try{const target=kind==="local"?localStorage:sessionStorage;if(value===undefined)return target.getItem(key);target.setItem(key,value);return value}catch{return null}};
  const identity=()=>{if(!sessionId)sessionId=storage("session","nextf.analytics.session")||storage("session","nextf.analytics.session",uuid());if(consent&&consent.preferences&&consent.preferences.some(x=>x.categoryKey==="analytics"&&x.state==="granted")){if(!visitorId)visitorId=storage("local","nextf.analytics.visitor")||storage("local","nextf.analytics.visitor",uuid())}else visitorId=null;return{sessionId,anonymousVisitorId:visitorId}};
  const consentGranted=()=>Boolean(consent&&consent.preferences&&consent.preferences.some(x=>x.categoryKey==="analytics"&&x.state==="granted"));
  const page=()=>({url:location.origin+location.pathname,title:document.title,referrer:document.referrer?new URL(document.referrer).origin:""});
  const context=()=>{const ids=identity();return{page:page(),session:{sessionId:ids.sessionId,startedAt:storage("session","nextf.analytics.started")||storage("session","nextf.analytics.started",now())},...(ids.anonymousVisitorId?{visitor:{anonymousVisitorId:ids.anonymousVisitorId}}:{}),...(consent?{consent}:{})}};
  async function flush(){clearTimeout(timer);timer=0;if(!config||!queue.length||!consentGranted())return;const events=queue.splice(0,MAX_QUEUE);const batch={batchId:uuid(),siteId:config.siteId,environment:config.environment,sdk:{sdkId:SDK_ID,sdkVersion:SDK_VERSION},consentStateId:consent.stateId,events,sentAt:now()};try{const response=await fetch(config.endpoint+"/tracking/browser",{method:"POST",mode:"cors",credentials:"omit",keepalive:true,headers:{"content-type":"application/json"},body:JSON.stringify(batch)});if(!response.ok)throw new Error("collector "+response.status);attempts=0}catch{attempts++;if(attempts<MAX_ATTEMPTS){queue=events.concat(queue).slice(-MAX_QUEUE);timer=setTimeout(flush,Math.min(30000,1000*2**attempts))}else attempts=0}}
  function schedule(){if(queue.length>=10)void flush();else if(!timer)timer=setTimeout(flush,FLUSH_MS)}
  function track(eventKey,properties={}){if(!config||!consentGranted())return null;const event={eventId:uuid(),scope:{organizationId:config.organizationId,siteId:config.siteId},eventKey,occurredAt:now(),context:context(),properties,source:"browser",schemaVersion:SCHEMA_VERSION,debug:Boolean(config.debug)};queue.push(event);if(queue.length>MAX_QUEUE)queue.shift();schedule();return event.eventId}
  function init(options){config={endpoint:String(options.endpoint||"").replace(/\\\/$/,""),siteId:options.siteId,organizationId:options.organizationId,environment:options.environment||"production",debug:Boolean(options.debug)};consent=options.consentState||null;if(options.autoPageView!==false)track("page.viewed",{});return api}
  function setConsent(next){consent=next;if(consentGranted())schedule();else{queue=[];visitorId=null}}
  const api={init,track,flush,setConsent,version:SDK_VERSION};window.nextf=Object.assign(window.nextf||{},api);
})();`;

export function serveTrackingSdk(){
  return new Response(trackingSdkSource,{status:200,headers:{"content-type":"application/javascript; charset=utf-8","cache-control":"public, max-age=300, s-maxage=86400, immutable","x-content-type-options":"nosniff","cross-origin-resource-policy":"cross-origin"}});
}
