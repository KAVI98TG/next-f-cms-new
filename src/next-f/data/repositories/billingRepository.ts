import { platformStore } from "../../../platform/services/platformStore";
import { activity, ahead, id, KEYS, read, seedInvoices, seedSubscriptions, sequentialNumber, write } from "../core";
import type { DigitalInvoice, DigitalSubscription } from "../types";
import { projectsRepository } from "./projectsRepository";
import { digitalSettingsRepository } from "../../settings/settingsRepository";

export const billingRepository = {
  getInvoices: () => read(KEYS.invoices, seedInvoices),
  getSubscriptions: () => read(KEYS.subscriptions, seedSubscriptions),
  createInvoice(input: Pick<DigitalInvoice, "clientId" | "amount" | "dueAt"> & Partial<Pick<DigitalInvoice, "projectId" | "subscriptionId" | "proposalId" | "status">>) {
    const invoices=this.getInvoices(); const timestamp=new Date().toISOString();
    const invoice:DigitalInvoice={id:id("inv"),number:sequentialNumber("NF-I-",invoices,2000),clientId:input.clientId,projectId:input.projectId,proposalId:input.proposalId,subscriptionId:input.subscriptionId,amount:input.amount,paidAmount:0,status:input.status ?? "issued",issuedAt:timestamp,dueAt:input.dueAt};
    write(KEYS.invoices,[invoice,...invoices]); activity("Invoice created",`${invoice.number} · ${invoice.amount.toLocaleString("en-LK")} LKR`,"invoice",invoice.id,"info"); platformStore.addAudit("Admin","Invoice created",invoice.number,"NEXT F Digital",`${invoice.amount.toLocaleString("en-LK")} LKR issued.`,"info"); return invoice;
  },
  updateInvoice(idValue: string, patch: Partial<DigitalInvoice>) { const items=this.getInvoices().map((item)=>item.id===idValue?{...item,...patch}:item); write(KEYS.invoices,items); return items.find((item)=>item.id===idValue)!; },
  recordInvoicePayment(invoiceId:string,amount:number) {
    const invoice=this.getInvoices().find((item)=>item.id===invoiceId); if(!invoice) throw new Error("Invoice not found");
    const paidAmount=Math.min(invoice.amount,Math.max(0,invoice.paidAmount+amount)); const status=paidAmount>=invoice.amount?"paid":paidAmount>0?"partially_paid":invoice.status; const paidAt=status==="paid"?new Date().toISOString():invoice.paidAt;
    const updated=this.updateInvoice(invoiceId,{paidAmount,status,paidAt});
    if(status==="paid"){ if(invoice.projectId){ const project=projectsRepository.getProjects().find((item)=>item.id===invoice.projectId); if(project?.status==="planned") projectsRepository.updateProject(project.id,{status:"active",startAt:new Date().toISOString()}); } if(invoice.subscriptionId) this.advanceSubscription(invoice.subscriptionId); }
    activity("Payment recorded",`${invoice.number} · ${amount.toLocaleString("en-LK")} LKR`,"invoice",invoice.id,"success"); platformStore.addAudit("Admin","Invoice payment recorded",invoice.number,"NEXT F Digital",`${amount.toLocaleString("en-LK")} LKR payment captured.`,"info"); return updated;
  },
  markInvoicePaid(invoiceId: string) {
    const invoice=this.getInvoices().find((item)=>item.id===invoiceId); if(!invoice) throw new Error("Invoice not found"); if(invoice.status==="paid") return invoice;
    const updated=this.updateInvoice(invoiceId,{paidAmount:invoice.amount,status:"paid",paidAt:new Date().toISOString()});
    if(invoice.projectId){ const project=projectsRepository.getProjects().find((item)=>item.id===invoice.projectId); if(project?.status==="planned") projectsRepository.updateProject(project.id,{status:"active",startAt:new Date().toISOString()}); }
    if(invoice.subscriptionId) this.advanceSubscription(invoice.subscriptionId);
    activity("Payment recorded",`${invoice.number} marked paid. Linked project activated and renewal advanced when applicable.`,"invoice",invoice.id,"success");
    platformStore.addAudit("Admin","Invoice paid",invoice.number,"NEXT F Digital",`${invoice.amount.toLocaleString("en-LK")} LKR recorded as paid.`,"info"); return updated;
  },
  refundInvoice(invoiceId:string) {
    const invoice=this.getInvoices().find((item)=>item.id===invoiceId); if(!invoice) throw new Error("Invoice not found");
    const updated=this.updateInvoice(invoiceId,{status:"refunded",paidAmount:0,paidAt:undefined}); activity("Invoice refunded",`${invoice.number} moved to refunded.`,"invoice",invoice.id,"warning"); platformStore.addAudit("Admin","Invoice refunded",invoice.number,"NEXT F Digital","Invoice marked refunded in local billing records.","warning"); return updated;
  },
  sendInvoiceReminder(invoiceId:string) {
    const invoice=this.getInvoices().find((item)=>item.id===invoiceId); if(!invoice) throw new Error("Invoice not found");
    activity("Invoice reminder queued",`${invoice.number} reminder prepared for the client.`,"invoice",invoice.id,"info"); platformStore.addAudit("Admin","Invoice reminder queued",invoice.number,"NEXT F Digital","Reminder action recorded locally.","info"); return invoice;
  },
  createRenewalInvoice(subscriptionId:string){ const subscription=this.getSubscriptions().find((item)=>item.id===subscriptionId); if(!subscription) throw new Error("Subscription not found"); const existing=this.getInvoices().find((item)=>item.subscriptionId===subscriptionId&&item.status!=="paid"&&item.status!=="cancelled"); if(existing)return existing; const invoices=this.getInvoices(); const timestamp=new Date().toISOString(); const invoice:DigitalInvoice={id:id("inv"),number:sequentialNumber("NF-I-",invoices,2000),clientId:subscription.clientId,projectId:subscription.projectId,subscriptionId,amount:subscription.amount,paidAmount:0,status:"issued",issuedAt:timestamp,dueAt:ahead(digitalSettingsRepository.get().invoiceDueDays)}; write(KEYS.invoices,[invoice,...invoices]); activity("Renewal invoice created",`${invoice.number} · ${subscription.name}`,"subscription",subscription.id,"info"); return invoice; },
  updateSubscription(idValue:string,patch:Partial<DigitalSubscription>){ const items=this.getSubscriptions().map((item)=>item.id===idValue?{...item,...patch}:item); write(KEYS.subscriptions,items); return items.find((item)=>item.id===idValue)!; },
  advanceSubscription(subscriptionId:string){ const subscription=this.getSubscriptions().find((item)=>item.id===subscriptionId); if(!subscription) throw new Error("Subscription not found"); const days=subscription.frequency==="monthly"?30:365; const base=new Date(subscription.nextRenewalAt).getTime(); const next=new Date(base+days*86_400_000).toISOString(); const updated=this.updateSubscription(subscriptionId,{nextBillingAt:next,nextRenewalAt:next,status:"active"}); activity("Subscription renewed",`${subscription.name} renewed to ${new Date(next).toLocaleDateString("en-LK")}.`,"subscription",subscription.id,"success"); return updated; },
};
