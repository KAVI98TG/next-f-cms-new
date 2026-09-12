import { audit,KEYS,read,seedActivations,uid,write } from "../core";
import type { ActivationStatus,SoftwareActivation } from "../types";
import { commercialRepository } from "./commercialRepository";
export const licensingRepository={
 getActivations:()=>read(KEYS.activations,seedActivations),
 addActivation(licenseId:string,siteUrl:string){const license=commercialRepository.getLicenses().find((l)=>l.id===licenseId);if(!license||!["active","grace"].includes(license.status))return{ok:false,reason:"License is not active."};const active=this.getActivations().filter((a)=>a.licenseId===licenseId&&a.status==="active");if(active.length>=license.activationLimit)return{ok:false,reason:"Activation limit reached."};const row:SoftwareActivation={id:uid("swa"),licenseId,siteUrl,fingerprint:uid("fp"),status:"active",activatedAt:new Date().toISOString(),lastSeenAt:new Date().toISOString()};write(KEYS.activations,[row,...this.getActivations()]);audit("Software activation created",license.key,siteUrl);return{ok:true,activation:row};},
 deactivateActivation(id:string){const rows=this.getActivations().map((a)=>a.id===id?{...a,status:"deactivated" as ActivationStatus,lastSeenAt:new Date().toISOString()}:a);write(KEYS.activations,rows);return rows.find((a)=>a.id===id);},
};
