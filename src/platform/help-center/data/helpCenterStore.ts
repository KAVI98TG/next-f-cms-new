import { platformStore } from "../../services/platformStore";
import type { HelpAnnouncement, HelpArticle, HelpAudience, HelpCategory, HelpCenterSettings, HelpFaq, HelpFeedback, HelpRequest, HelpSavedReply } from "./types";
import { readDurableValue, writeDurableValue } from "../../../services/production/durableStorage";

const K = {
  categories: "nextf.v0.11.help.categories",
  articles: "nextf.v0.11.help.articles",
  faqs: "nextf.v0.11.help.faqs",
  announcements: "nextf.v0.11.help.announcements",
  replies: "nextf.v0.11.help.replies",
  requests: "nextf.v0.11.help.requests",
  feedback: "nextf.v0.11.help.feedback",
  settings: "nextf.v0.11.help.settings",
};

const now = Date.now();
const ago = (minutes:number) => new Date(now - minutes * 60_000).toISOString();
const ahead = (days:number) => new Date(now + days * 86_400_000).toISOString();
const uid = (prefix:string) => `${prefix}_${crypto.randomUUID()}`;

const seedCategories: HelpCategory[] = [
  { id:"hc_getting_started", name:"Getting Started", slug:"getting-started", description:"Account, ordering and support basics across NEXT F.", audience:"all", order:10, active:true, createdAt:ago(5000), updatedAt:ago(300) },
  { id:"hc_billing", name:"Billing & Payments", slug:"billing-payments", description:"Invoices, payment status, renewals and refunds.", audience:"all", order:20, active:true, createdAt:ago(4900), updatedAt:ago(290) },
  { id:"hc_digital", name:"Digital Services", slug:"digital-services", description:"Projects, approvals, maintenance and service delivery.", audience:"digital", order:30, active:true, createdAt:ago(4800), updatedAt:ago(280) },
  { id:"hc_gaming", name:"Gaming Orders", slug:"gaming-orders", description:"Top-up status, player details and reseller fulfillment.", audience:"gaming", order:40, active:true, createdAt:ago(4700), updatedAt:ago(270) },
  { id:"hc_software", name:"Software & Licenses", slug:"software-licenses", description:"Licenses, activations, updates, downloads and renewals.", audience:"software", order:50, active:true, createdAt:ago(4600), updatedAt:ago(260) },
];

const seedArticles: HelpArticle[] = [
  { id:"ha_1", title:"How NEXT F customer support works", slug:"how-next-f-support-works", summary:"Find the right help path for Digital, Gaming Store and Software.", body:"Search the knowledge base first. If the answer is not available, submit a help request and choose the business related to your issue. Requests are routed to the correct internal support queue.", categoryId:"hc_getting_started", audience:"all", status:"published", featured:true, views:128, updatedAt:ago(90) },
  { id:"ha_2", title:"Track a NEXT F Digital project", slug:"track-digital-project", summary:"Understand project progress, milestones, approvals and deliverables.", body:"Digital projects move through planned, active, awaiting-client and completed stages. Customer approvals and deliverables remain attached to the project record.", categoryId:"hc_digital", audience:"digital", status:"published", featured:true, views:84, updatedAt:ago(140) },
  { id:"ha_3", title:"What happens after a gaming top-up order", slug:"gaming-topup-order-status", summary:"Payment, validation, supplier processing and completion explained.", body:"After payment, account fields are validated and the order is submitted to the configured supplier. Processing and failure states are tracked separately from payment state so support can investigate safely.", categoryId:"hc_gaming", audience:"gaming", status:"published", featured:true, views:241, updatedAt:ago(75) },
  { id:"ha_4", title:"Activate a NEXT F Software license", slug:"activate-software-license", summary:"How activation limits, entitlements and updates work.", body:"A valid license can activate up to the limit included in the purchased edition. Update and support access depend on the license entitlement window and current license state.", categoryId:"hc_software", audience:"software", status:"published", featured:false, views:109, updatedAt:ago(110) },
];

const seedFaqs: HelpFaq[] = [
  { id:"hf_1", question:"How do I contact NEXT F support?", answer:"Use the Help Center request form and select the business related to your issue. This keeps the request attached to the correct operations team.", categoryId:"hc_getting_started", audience:"all", status:"published", order:10, updatedAt:ago(100) },
  { id:"hf_2", question:"Can a completed gaming top-up always be refunded?", answer:"No. Some supplier-delivered credits can be irreversible after successful fulfillment. Support must review the supplier and order state before any refund decision.", categoryId:"hc_gaming", audience:"gaming", status:"published", order:20, updatedAt:ago(80) },
  { id:"hf_3", question:"What happens when a software license expires?", answer:"Update and support entitlement can end or enter a configured grace period. Existing product behavior depends on the commercial policy of that software edition.", categoryId:"hc_software", audience:"software", status:"published", order:30, updatedAt:ago(70) },
];

const seedAnnouncements: HelpAnnouncement[] = [
  { id:"han_1", title:"Unified NEXT F Help Center", message:"Customer guidance for Digital Services, Gaming Store and NEXT F Software is now managed from one shared help system.", audience:"all", status:"published", publishAt:ago(180), updatedAt:ago(180) },
  { id:"han_2", title:"Planned support maintenance", message:"Use this announcement system for future maintenance windows and customer-impacting service notices.", audience:"all", status:"draft", publishAt:ahead(7), updatedAt:ago(40) },
];

const seedReplies: HelpSavedReply[] = [
  { id:"hrp_1", title:"Request received", shortcut:"received", body:"Thanks for contacting NEXT F. Your request has been received and routed to the relevant support team.", audience:"all", active:true, updatedAt:ago(200) },
  { id:"hrp_2", title:"Gaming order under review", shortcut:"gaming-review", body:"Your gaming order is under review. We are checking payment, account details and supplier fulfillment state before the next action.", audience:"gaming", active:true, updatedAt:ago(160) },
  { id:"hrp_3", title:"Need more information", shortcut:"more-info", body:"We need a little more information to continue. Please reply with the requested account or order details without sharing passwords or secret credentials.", audience:"all", active:true, updatedAt:ago(140) },
];

const seedRequests: HelpRequest[] = [
  { id:"hreq_1", number:"HELP-1001", customerName:"Sample Digital Client", email:"client@example.com", business:"digital", subject:"Need clarification on project approval", detail:"Customer wants to understand what is required before approving the current project milestone.", priority:"normal", status:"routed", source:"help_center", createdAt:ago(220), updatedAt:ago(180) },
  { id:"hreq_2", number:"HELP-1002", customerName:"Gaming Customer", email:"gamer@example.com", business:"gaming", subject:"Top-up still processing", detail:"Customer reports the order has remained in processing longer than expected.", priority:"high", status:"in_progress", assignedTo:"Gaming Support", source:"help_center", createdAt:ago(95), updatedAt:ago(25) },
];

const seedFeedback: HelpFeedback[] = [
  { id:"hfb_1", articleId:"ha_3", audience:"gaming", rating:"helpful", comment:"Order stages were clear.", createdAt:ago(70) },
  { id:"hfb_2", articleId:"ha_4", audience:"software", rating:"not_helpful", comment:"Would like a screenshot example later.", createdAt:ago(45) },
];

const seedSettings: HelpCenterSettings = {
  name:"NEXT F Help Center",
  contactEmail:"nextf.cms.lk@gmail.com",
  welcomeTitle:"How can we help?",
  welcomeText:"Search answers across NEXT F Digital, Gaming Store and NEXT F Software, or send a request to the correct support team.",
  defaultAudience:"all",
  enableSearch:true,
  enableFeedback:true,
  enableContactRequests:true,
  allowAnonymousRequests:false,
  autoRouteRequests:true,
};

function read<T>(key:string, seed:T):T { return readDurableValue(key, seed); }
function write<T>(key:string, value:T):T {
  const result=writeDurableValue(key,value);
  window.dispatchEvent(new CustomEvent("nextf:help-center", { detail:key }));
  return result;
}
function audit(action:string,target:string,detail:string,tone:"neutral"|"info"|"warning"|"danger"="info") {
  platformStore.addAudit("Admin", action, target, "Help Center", detail, tone);
}
function notify(title:string, detail:string, tone:"info"|"warning"|"danger"|"success"="info") {
  const items = platformStore.getNotifications();
  platformStore.saveNotifications([{ id:uid("helpnote"), title, detail, domain:"Help Center", tone, read:false, createdAt:new Date().toISOString() }, ...items].slice(0,250));
}
function nextNumber(rows:HelpRequest[]) {
  const max = rows.reduce((highest,row)=>Math.max(highest, Number(row.number.replace(/\D/g,"")) || 1000), 1000);
  return `HELP-${max+1}`;
}

export const helpCenterStore = {
  getCategories:()=>read(K.categories,seedCategories),
  getArticles:()=>read(K.articles,seedArticles),
  getFaqs:()=>read(K.faqs,seedFaqs),
  getAnnouncements:()=>read(K.announcements,seedAnnouncements),
  getReplies:()=>read(K.replies,seedReplies),
  getRequests:()=>read(K.requests,seedRequests),
  getFeedback:()=>read(K.feedback,seedFeedback),
  getSettings:()=>read(K.settings,seedSettings),

  addCategory(input:Pick<HelpCategory,"name"|"slug"|"description"|"audience">) {
    const rows=this.getCategories();
    const row:HelpCategory={...input,id:uid("hcat"),order:(rows.length+1)*10,active:true,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
    write(K.categories,[...rows,row]); audit("Help category created",row.name,`Audience: ${row.audience}.`); return row;
  },
  updateCategory(id:string,patch:Partial<HelpCategory>) { const rows=this.getCategories().map((r)=>r.id===id?{...r,...patch,updatedAt:new Date().toISOString()}:r); write(K.categories,rows); return rows.find((r)=>r.id===id); },

  addArticle(input:Pick<HelpArticle,"title"|"slug"|"summary"|"body"|"categoryId"|"audience"|"status"|"featured">) {
    const row:HelpArticle={...input,id:uid("article"),views:0,updatedAt:new Date().toISOString()};
    write(K.articles,[row,...this.getArticles()]); audit("Help article created",row.title,`${row.status} · ${row.audience}.`); return row;
  },
  updateArticle(id:string,patch:Partial<HelpArticle>) { const rows=this.getArticles().map((r)=>r.id===id?{...r,...patch,updatedAt:new Date().toISOString()}:r); write(K.articles,rows); audit("Help article updated",id,"Knowledge article changed."); return rows.find((r)=>r.id===id); },

  addFaq(input:Pick<HelpFaq,"question"|"answer"|"categoryId"|"audience"|"status">) {
    const rows=this.getFaqs(); const row:HelpFaq={...input,id:uid("faq"),order:(rows.length+1)*10,updatedAt:new Date().toISOString()}; write(K.faqs,[...rows,row]); audit("Help FAQ created",row.question,`${row.status} · ${row.audience}.`); return row;
  },
  updateFaq(id:string,patch:Partial<HelpFaq>) { const rows=this.getFaqs().map((r)=>r.id===id?{...r,...patch,updatedAt:new Date().toISOString()}:r); write(K.faqs,rows); return rows.find((r)=>r.id===id); },

  addAnnouncement(input:Pick<HelpAnnouncement,"title"|"message"|"audience"|"status"|"publishAt"|"expiresAt">) {
    const row:HelpAnnouncement={...input,id:uid("announcement"),updatedAt:new Date().toISOString()}; write(K.announcements,[row,...this.getAnnouncements()]); audit("Help announcement created",row.title,`${row.status} · ${row.audience}.`); return row;
  },
  updateAnnouncement(id:string,patch:Partial<HelpAnnouncement>) { const rows=this.getAnnouncements().map((r)=>r.id===id?{...r,...patch,updatedAt:new Date().toISOString()}:r); write(K.announcements,rows); return rows.find((r)=>r.id===id); },

  addReply(input:Pick<HelpSavedReply,"title"|"shortcut"|"body"|"audience">) {
    const row:HelpSavedReply={...input,id:uid("reply"),active:true,updatedAt:new Date().toISOString()}; write(K.replies,[row,...this.getReplies()]); audit("Saved reply created",row.title,`Shortcut: /${row.shortcut}.`); return row;
  },
  updateReply(id:string,patch:Partial<HelpSavedReply>) { const rows=this.getReplies().map((r)=>r.id===id?{...r,...patch,updatedAt:new Date().toISOString()}:r); write(K.replies,rows); return rows.find((r)=>r.id===id); },

  createRequest(input:Pick<HelpRequest,"customerName"|"email"|"business"|"subject"|"detail"|"priority"|"source">) {
    const rows=this.getRequests(); const settings=this.getSettings(); const business=settings.autoRouteRequests&&input.business!=="unassigned"?input.business:"unassigned";
    const row:HelpRequest={...input,business,id:uid("request"),number:nextNumber(rows),status:business==="unassigned"?"new":"routed",createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
    write(K.requests,[row,...rows]); audit("Customer help request created",row.number,`${row.subject} · ${row.business}.`,row.priority==="urgent"?"danger":row.priority==="high"?"warning":"info");
    notify(`${row.number} · ${row.subject}`,`${row.customerName} · ${row.business} · ${row.priority} priority`,row.priority==="urgent"?"danger":row.priority==="high"?"warning":"info");
    return row;
  },
  updateRequest(id:string,patch:Partial<HelpRequest>) { const rows=this.getRequests().map((r)=>r.id===id?{...r,...patch,updatedAt:new Date().toISOString()}:r); write(K.requests,rows); const row=rows.find((r)=>r.id===id); if(row)audit("Customer help request updated",row.number,`${row.status} · ${row.business}.`); return row; },
  routeRequest(id:string,business:HelpRequest["business"]) { return this.updateRequest(id,{business,status:"routed",assignedTo:business==="unassigned"?undefined:`${business.charAt(0).toUpperCase()+business.slice(1)} Support`}); },

  addFeedback(input:Omit<HelpFeedback,"id"|"createdAt">) { const row:HelpFeedback={...input,id:uid("feedback"),createdAt:new Date().toISOString()}; write(K.feedback,[row,...this.getFeedback()]); if(row.rating==="not_helpful")notify("Help article feedback needs review",row.comment||"A customer marked content as not helpful.","warning"); return row; },
  saveSettings(settings:HelpCenterSettings) { write(K.settings,settings); audit("Help Center settings updated",settings.name,"Customer help policies changed."); return settings; },

  search(query:string,audience:HelpAudience="all") {
    const q=query.trim().toLowerCase(); const visible=(itemAudience:HelpAudience)=>audience==="all"||itemAudience==="all"||itemAudience===audience;
    const articles=this.getArticles().filter((r)=>r.status==="published"&&visible(r.audience)&&(!q||`${r.title} ${r.summary} ${r.body}`.toLowerCase().includes(q))).map((r)=>({id:r.id,type:"Article",title:r.title,detail:r.summary,audience:r.audience}));
    const faqs=this.getFaqs().filter((r)=>r.status==="published"&&visible(r.audience)&&(!q||`${r.question} ${r.answer}`.toLowerCase().includes(q))).map((r)=>({id:r.id,type:"FAQ",title:r.question,detail:r.answer,audience:r.audience}));
    const announcements=this.getAnnouncements().filter((r)=>r.status==="published"&&visible(r.audience)&&(!q||`${r.title} ${r.message}`.toLowerCase().includes(q))).map((r)=>({id:r.id,type:"Announcement",title:r.title,detail:r.message,audience:r.audience}));
    return [...articles,...faqs,...announcements].slice(0,30);
  },
};
