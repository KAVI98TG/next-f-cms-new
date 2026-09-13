import { platformStore } from "../../platform/services/platformStore";
import { digitalStore } from "../data/digitalStore";
import { portalRepository } from "../clients/portalRepository";
import type { PortalAccess } from "../clients/portalRepository";
import { digitalSettingsRepository } from "../settings/settingsRepository";
import type { DigitalBusinessSettings } from "../settings/settingsRepository";
import { readDurableValue, writeDurableValue } from "../../services/production/durableStorage";

export type ServiceAddon={id:string;serviceId:string;name:string;price:number;billing:"one_time"|"monthly";active:boolean;createdAt:string};
export type ProjectTemplate={id:string;name:string;serviceId?:string;stages:string[];active:boolean;createdAt:string;updatedAt:string};
export type BillingAdjustment={id:string;invoiceId:string;type:"discount"|"credit"|"fee";amount:number;reason:string;createdAt:string};
export type { PortalAccess, DigitalBusinessSettings };
const K={addons:"nextf.v0.10.digital.addons",templates:"nextf.v0.10.digital.project-templates",adjustments:"nextf.v0.10.digital.billing-adjustments"};
const now=Date.now();const ago=(d:number)=>new Date(now-d*86400000).toISOString();
const addonSeed:ServiceAddon[]=[{id:"addon_copy",serviceId:"svc_web_business",name:"Additional content page",price:12000,billing:"one_time",active:true,createdAt:ago(120)},{id:"addon_reporting",serviceId:"svc_seo_growth",name:"Executive reporting pack",price:9000,billing:"monthly",active:true,createdAt:ago(90)}];
const templateSeed:ProjectTemplate[]=[{id:"tmpl_web",name:"Website Delivery",serviceId:"svc_web_business",stages:["Discovery","Requirements","UI Design","Development","Content","QA","Client Review","Deployment","Handover"],active:true,createdAt:ago(200),updatedAt:ago(3)},{id:"tmpl_seo",name:"SEO Monthly Delivery",serviceId:"svc_seo_growth",stages:["SEO Audit","Technical Fixes","Keyword Research","On-page Work","Content","Authority Work","Tracking","Monthly Report"],active:true,createdAt:ago(200),updatedAt:ago(4)}];
const adjustmentSeed:BillingAdjustment[]=[{id:"adj_1",invoiceId:"inv_2",type:"discount",amount:1500,reason:"Loyalty adjustment",createdAt:ago(1)}];
function read<T>(key:string,seed:T):T{return readDurableValue(key,seed);}
function write<T>(key:string,value:T){const result=writeDurableValue(key,value);window.dispatchEvent(new CustomEvent("nextf:digital-admin",{detail:key}));return result;}
const uid=(p:string)=>`${p}_${crypto.randomUUID()}`;
export const digitalAdminStore={
 getAddons:()=>read(K.addons,addonSeed),getTemplates:()=>read(K.templates,templateSeed),getAdjustments:()=>read(K.adjustments,adjustmentSeed),getPortalAccess:()=>portalRepository.get(),getSettings:()=>digitalSettingsRepository.get(),
 addAddon(input:Omit<ServiceAddon,"id"|"createdAt">){const row:ServiceAddon={...input,id:uid("addon"),createdAt:new Date().toISOString()};write(K.addons,[row,...this.getAddons()]);platformStore.addAudit("Admin","Service add-on created",row.name,"NEXT F Digital","Commercial add-on added.","info");return row;},
 updateAddon(id:string,patch:Partial<ServiceAddon>){const rows=this.getAddons().map((r)=>r.id===id?{...r,...patch}:r);write(K.addons,rows);return rows.find((r)=>r.id===id);},
 addTemplate(input:Pick<ProjectTemplate,"name"|"serviceId"|"stages">){const row:ProjectTemplate={...input,id:uid("tmpl"),active:true,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};write(K.templates,[row,...this.getTemplates()]);platformStore.addAudit("Admin","Project template created",row.name,"NEXT F Digital",`${row.stages.length} delivery stages configured.`,"info");return row;},
 updateTemplate(id:string,patch:Partial<ProjectTemplate>){const rows=this.getTemplates().map((r)=>r.id===id?{...r,...patch,updatedAt:new Date().toISOString()}:r);write(K.templates,rows);return rows.find((r)=>r.id===id);},
 addAdjustment(input:Omit<BillingAdjustment,"id"|"createdAt">){const invoice=digitalStore.getInvoices().find((i)=>i.id===input.invoiceId);if(!invoice)throw new Error("Invoice not found");const row:BillingAdjustment={...input,id:uid("adj"),createdAt:new Date().toISOString()};write(K.adjustments,[row,...this.getAdjustments()]);platformStore.addAudit("Admin","Billing adjustment created",invoice.number,"NEXT F Digital",`${input.type} ${input.amount} LKR · ${input.reason}`,input.type==="fee"?"info":"warning");return row;},
 getInvoiceAdjustedTotal(invoiceId:string){const invoice=digitalStore.getInvoices().find((i)=>i.id===invoiceId);if(!invoice)return 0;return this.getAdjustments().filter((a)=>a.invoiceId===invoiceId).reduce((sum,a)=>sum+(a.type==="fee"?a.amount:-a.amount),invoice.amount);},
 createPortalAccess(clientId:string){return portalRepository.createOrInvite(clientId);},
 updatePortalAccess(id:string,patch:Partial<PortalAccess>){return portalRepository.update(id,patch);},
 saveSettings(settings:DigitalBusinessSettings){return digitalSettingsRepository.save(settings);},
};
