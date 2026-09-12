import { activity, id, KEYS, read, seedSites, write } from "../core";
import type { DigitalSite, SiteStatus } from "../types";
export const sitesRepository={
 getSites:()=>read(KEYS.sites,seedSites),
 addSite(input:Omit<DigitalSite,"id"|"updatedAt"|"status"|"sslStatus"|"responseMs"|"billingState">){ const row:DigitalSite={...input,id:id("site"),status:"online",sslStatus:"valid",responseMs:320,billingState:"paid",updatedAt:new Date().toISOString()}; write(KEYS.sites,[row,...this.getSites()]); activity("Client site added",row.domain,"site",row.id,"success"); return row; },
 updateSite(siteId:string,patch:Partial<DigitalSite>){ const rows=this.getSites().map((row)=>row.id===siteId?{...row,...patch,updatedAt:new Date().toISOString()}:row); write(KEYS.sites,rows); return rows.find((row)=>row.id===siteId)!; },
 runSiteCheck(siteId:string){ const site=this.getSites().find((row)=>row.id===siteId); if(!site) throw new Error("Site not found"); const responseMs=site.status==="offline"?0:Math.max(210,Math.min(1800,site.responseMs+Math.round((Math.random()-.45)*180))); const status:SiteStatus=site.status==="maintenance"?"maintenance":responseMs===0?"offline":responseMs>900?"degraded":"online"; const updated=this.updateSite(siteId,{responseMs,status}); activity("Site health checked",`${site.domain} · ${status} · ${responseMs||"no"} ms`,"site",site.id,status==="online"?"success":"warning"); return updated; },
};
