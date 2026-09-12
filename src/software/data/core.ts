import { platformStore } from "../../platform/services/platformStore";
import type { SoftwareProduct,SoftwareEdition,SoftwareRelease,SoftwareCustomer,SoftwareOrder,SoftwareLicense,SoftwareActivation,SoftwareSubscription,UpdateCheck,DownloadRecord,SoftwareSupportCase,SoftwareSettings,SoftwareActivity,ReleaseChannel } from "./types";

export const KEYS = {
  products:"nextf.v0.6.software.products", editions:"nextf.v0.6.software.editions", releases:"nextf.v0.6.software.releases", customers:"nextf.v0.6.software.customers", orders:"nextf.v0.6.software.orders", licenses:"nextf.v0.6.software.licenses", activations:"nextf.v0.6.software.activations", subscriptions:"nextf.v0.6.software.subscriptions", updates:"nextf.v0.6.software.updates", downloads:"nextf.v0.6.software.downloads", support:"nextf.v0.6.software.support", settings:"nextf.v0.6.software.settings", activity:"nextf.v0.6.software.activity",
};
const now = Date.now(); const ago=(m:number)=>new Date(now-m*60_000).toISOString(); const future=(days:number)=>new Date(now+days*86_400_000).toISOString();
export const uid=(prefix:string)=>`${prefix}_${Math.random().toString(36).slice(2,8)}${Date.now().toString(36).slice(-4)}`;
export function read<T>(key:string, seed:T):T { try { const value=window.localStorage.getItem(key); return value?JSON.parse(value):seed; } catch { return seed; } }
export function write<T>(key:string,value:T){ window.localStorage.setItem(key,JSON.stringify(value)); window.dispatchEvent(new CustomEvent("nextf:software-store",{detail:key})); }
export function nextNumber(prefix:string, rows:Array<{number:string}>, start:number){ const max=Math.max(start-1,...rows.map((r)=>Number(r.number.replace(/\D/g,""))||0)); return `${prefix}${max+1}`; }
export function licenseKey(){ const block=()=>Math.random().toString(36).slice(2,6).toUpperCase(); return `NFSW-${block()}-${block()}-${block()}-${block()}`; }
export function audit(title:string,target:string,detail:string,tone:"neutral"|"info"|"success"|"warning"|"danger"="info"){ try { platformStore.addAudit("Admin", title, target, "Software", detail, tone === "success" ? "info" : tone); } catch {} }
export function pushActivity(title:string,detail:string,tone:SoftwareActivity["tone"]="info"){ const rows=read<SoftwareActivity[]>(KEYS.activity,seedActivity); write(KEYS.activity,[{id:uid("sa"),title,detail,tone,createdAt:new Date().toISOString()},...rows].slice(0,80)); }

export const seedProducts:SoftwareProduct[]=[
 {id:"swp_seo",name:"NEXT F SEO",slug:"next-f-seo",type:"plugin",status:"active",description:"SEO workflow, metadata and technical optimization toolkit.",createdAt:ago(100000),updatedAt:ago(240)},
 {id:"swp_forms",name:"NEXT F Forms",slug:"next-f-forms",type:"plugin",status:"active",description:"Conversion-focused forms and lead capture plugin.",createdAt:ago(80000),updatedAt:ago(800)},
 {id:"swp_analytics",name:"NEXT F Analytics",slug:"next-f-analytics",type:"plugin",status:"draft",description:"Privacy-aware analytics and reporting extension.",createdAt:ago(12000),updatedAt:ago(130)},
];
export const seedEditions:SoftwareEdition[]=[
 {id:"swe_seo_personal",productId:"swp_seo",name:"Personal",billingModel:"annual",price:39,currency:"USD",activationLimit:1,updateMonths:12,supportMonths:12,active:true},
 {id:"swe_seo_business",productId:"swp_seo",name:"Business",billingModel:"annual",price:89,currency:"USD",activationLimit:5,updateMonths:12,supportMonths:12,active:true},
 {id:"swe_seo_agency",productId:"swp_seo",name:"Agency",billingModel:"annual",price:179,currency:"USD",activationLimit:25,updateMonths:12,supportMonths:12,active:true},
 {id:"swe_forms_personal",productId:"swp_forms",name:"Personal",billingModel:"annual",price:29,currency:"USD",activationLimit:1,updateMonths:12,supportMonths:12,active:true},
 {id:"swe_forms_agency",productId:"swp_forms",name:"Agency",billingModel:"annual",price:129,currency:"USD",activationLimit:25,updateMonths:12,supportMonths:12,active:true},
];
export const seedReleases:SoftwareRelease[]=[
 {id:"swr_seo_140",productId:"swp_seo",version:"1.4.0",channel:"stable",status:"published",releasedAt:ago(43200),minRuntime:"PHP 8.1",compatibility:"WordPress 6.5+",fileName:"next-f-seo-1.4.0.zip",fileSizeMb:2.8,checksum:"sha256:4f8c...140",changelog:"Improved schema controls and crawl diagnostics.",rollbackVersion:"1.3.2",createdAt:ago(44000),updatedAt:ago(43200)},
 {id:"swr_seo_150b",productId:"swp_seo",version:"1.5.0-beta.2",channel:"beta",status:"published",releasedAt:ago(1800),minRuntime:"PHP 8.1",compatibility:"WordPress 6.6+",fileName:"next-f-seo-1.5.0-beta.2.zip",fileSizeMb:3.1,checksum:"sha256:9aa1...15b",changelog:"Beta release for content intelligence module.",rollbackVersion:"1.4.0",createdAt:ago(2200),updatedAt:ago(1800)},
 {id:"swr_forms_210",productId:"swp_forms",version:"2.1.0",channel:"stable",status:"published",releasedAt:ago(11520),minRuntime:"PHP 8.1",compatibility:"WordPress 6.5+",fileName:"next-f-forms-2.1.0.zip",fileSizeMb:1.9,checksum:"sha256:3c22...210",changelog:"Conditional logic and webhook delivery improvements.",rollbackVersion:"2.0.4",createdAt:ago(12000),updatedAt:ago(11520)},
 {id:"swr_analytics_010",productId:"swp_analytics",version:"0.1.0",channel:"development",status:"draft",minRuntime:"PHP 8.2",compatibility:"WordPress 6.6+",fileName:"next-f-analytics-0.1.0.zip",fileSizeMb:2.2,checksum:"sha256:dev...010",changelog:"Initial internal development build.",createdAt:ago(1000),updatedAt:ago(130)},
];
export const seedCustomers:SoftwareCustomer[]=[
 {id:"swc_1",name:"Nimal Jayasuriya",email:"nimal@example.com",company:"Orbit Web",orders:2,lifetimeValue:218,createdAt:ago(120000),lastOrderAt:ago(4800)},
 {id:"swc_2",name:"Ayesha Fernando",email:"ayesha@example.com",company:"Ayesha Studio",orders:1,lifetimeValue:39,createdAt:ago(50000),lastOrderAt:ago(20000)},
 {id:"swc_3",name:"Daniel Brooks",email:"daniel@example.com",company:"Northbridge Digital",orders:1,lifetimeValue:179,createdAt:ago(16000),lastOrderAt:ago(14000)},
];
export const seedOrders:SoftwareOrder[]=[
 {id:"swo_1",number:"SW-6001",customerId:"swc_1",productId:"swp_seo",editionId:"swe_seo_agency",amount:179,currency:"USD",status:"paid",createdAt:ago(60000),paidAt:ago(59990)},
 {id:"swo_2",number:"SW-6002",customerId:"swc_2",productId:"swp_seo",editionId:"swe_seo_personal",amount:39,currency:"USD",status:"paid",createdAt:ago(20000),paidAt:ago(19990)},
 {id:"swo_3",number:"SW-6003",customerId:"swc_3",productId:"swp_seo",editionId:"swe_seo_agency",amount:179,currency:"USD",status:"paid",createdAt:ago(14000),paidAt:ago(13990)},
 {id:"swo_4",number:"SW-6004",customerId:"swc_1",productId:"swp_forms",editionId:"swe_forms_personal",amount:29,currency:"USD",status:"paid",createdAt:ago(4800),paidAt:ago(4790)},
];
export const seedLicenses:SoftwareLicense[]=[
 {id:"swl_1",key:"NFSW-SEO1-AGCY-8Q2M-41XA",customerId:"swc_1",productId:"swp_seo",editionId:"swe_seo_agency",orderId:"swo_1",status:"active",activationLimit:25,issuedAt:ago(59980),expiresAt:future(210),updateAccessUntil:future(210),supportAccessUntil:future(210)},
 {id:"swl_2",key:"NFSW-SEO1-PERS-2D8A-91LK",customerId:"swc_2",productId:"swp_seo",editionId:"swe_seo_personal",orderId:"swo_2",status:"active",activationLimit:1,issuedAt:ago(19980),expiresAt:future(45),updateAccessUntil:future(45),supportAccessUntil:future(45)},
 {id:"swl_3",key:"NFSW-SEO1-AGCY-7H1B-22PO",customerId:"swc_3",productId:"swp_seo",editionId:"swe_seo_agency",orderId:"swo_3",status:"active",activationLimit:25,issuedAt:ago(13980),expiresAt:future(270),updateAccessUntil:future(270),supportAccessUntil:future(270)},
 {id:"swl_4",key:"NFSW-FRM1-PERS-5Y7N-11CZ",customerId:"swc_1",productId:"swp_forms",editionId:"swe_forms_personal",orderId:"swo_4",status:"active",activationLimit:1,issuedAt:ago(4780),expiresAt:future(330),updateAccessUntil:future(330),supportAccessUntil:future(330)},
];
export const seedActivations:SoftwareActivation[]=[
 {id:"swa_1",licenseId:"swl_1",siteUrl:"https://orbitweb.lk",fingerprint:"fp-orbit-001",status:"active",activatedAt:ago(59000),lastSeenAt:ago(20)},
 {id:"swa_2",licenseId:"swl_1",siteUrl:"https://client-one.com",fingerprint:"fp-client-002",status:"active",activatedAt:ago(30000),lastSeenAt:ago(80)},
 {id:"swa_3",licenseId:"swl_2",siteUrl:"https://ayeshastudio.lk",fingerprint:"fp-ayesha-003",status:"active",activatedAt:ago(19000),lastSeenAt:ago(140)},
 {id:"swa_4",licenseId:"swl_3",siteUrl:"https://northbridge.digital",fingerprint:"fp-north-004",status:"active",activatedAt:ago(13000),lastSeenAt:ago(45)},
];
export const seedSubscriptions:SoftwareSubscription[]=[
 {id:"sws_1",customerId:"swc_1",productId:"swp_seo",editionId:"swe_seo_agency",licenseId:"swl_1",status:"active",interval:"annual",amount:179,currency:"USD",nextRenewalAt:future(210),autoRenew:true,lastPaymentAt:ago(59990)},
 {id:"sws_2",customerId:"swc_2",productId:"swp_seo",editionId:"swe_seo_personal",licenseId:"swl_2",status:"active",interval:"annual",amount:39,currency:"USD",nextRenewalAt:future(45),autoRenew:false,lastPaymentAt:ago(19990)},
 {id:"sws_3",customerId:"swc_3",productId:"swp_seo",editionId:"swe_seo_agency",licenseId:"swl_3",status:"active",interval:"annual",amount:179,currency:"USD",nextRenewalAt:future(270),autoRenew:true,lastPaymentAt:ago(13990)},
 {id:"sws_4",customerId:"swc_1",productId:"swp_forms",editionId:"swe_forms_personal",licenseId:"swl_4",status:"active",interval:"annual",amount:29,currency:"USD",nextRenewalAt:future(330),autoRenew:true,lastPaymentAt:ago(4790)},
];
export const seedUpdates:UpdateCheck[]=[{id:"swu_1",licenseId:"swl_2",productId:"swp_seo",currentVersion:"1.3.2",availableVersion:"1.4.0",eligible:true,reason:"Stable update available and entitlement is active.",checkedAt:ago(90)}];
export const seedDownloads:DownloadRecord[]=[{id:"swd_1",customerId:"swc_1",productId:"swp_seo",releaseId:"swr_seo_140",licenseId:"swl_1",fileName:"next-f-seo-1.4.0.zip",status:"downloaded",tokenHint:"dl_••••82KD",expiresAt:future(1),downloadCount:1,createdAt:ago(5000),lastDownloadAt:ago(4990)}];
export const seedSupport:SoftwareSupportCase[]=[{id:"swt_1",number:"SW-S-9001",customerId:"swc_2",productId:"swp_seo",licenseId:"swl_2",subject:"Schema preview not refreshing",detail:"Customer reports stale preview after updating post metadata.",priority:"normal",status:"open",createdAt:ago(320),updatedAt:ago(320)}];
export const seedSettings:SoftwareSettings={defaultLicenseDays:365,graceDays:7,offlineValidationDays:7,downloadTokenHours:24,maxDownloadAttempts:5,renewalReminderDays:30,defaultReleaseChannel:"stable"};
export const seedActivity:SoftwareActivity[]=[{id:"sa_1",title:"Stable release published",detail:"NEXT F SEO v1.4.0 is available to eligible licenses.",tone:"success",createdAt:ago(43200)},{id:"sa_2",title:"Renewal approaching",detail:"Ayesha Studio license renews in 45 days.",tone:"info",createdAt:ago(200)}];

export function monthsFrom(date:string,months:number){ const d=new Date(date); d.setMonth(d.getMonth()+months); return d.toISOString(); }
export function latestPublishedRelease(productId:string,channel:ReleaseChannel="stable"){ const rank:Record<ReleaseChannel,number>={development:0,beta:1,release_candidate:2,stable:3}; return read<SoftwareRelease[]>(KEYS.releases,seedReleases).filter((r)=>r.productId===productId&&r.status==="published"&&rank[r.channel]>=rank[channel]).sort((a,b)=>new Date(b.releasedAt??b.createdAt).getTime()-new Date(a.releasedAt??a.createdAt).getTime())[0]; }


export function resetSoftwareCore(){Object.values(KEYS).forEach((key)=>window.localStorage.removeItem(key));window.dispatchEvent(new CustomEvent("nextf:software-store",{detail:"reset"}));}
