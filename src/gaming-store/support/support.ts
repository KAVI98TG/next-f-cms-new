import { ProductionBackendClient } from '../../services/production/httpClient';
import { readProductionRuntimeConfig } from '../../services/production/runtime';

export type GamingSupportCase={
  caseId:string;caseNumber:string;orderId:string;orderNumber:string;category:string;subject:string;priority:'normal'|'high'|'urgent';status:'open'|'in_progress'|'waiting_customer'|'waiting_internal'|'resolved'|'closed';assignee?:{accountId:string};
  sla:{policyVersion:number;firstResponseDueAt:string;resolutionDueAt:string;firstRespondedAt?:string;resolvedAt?:string;firstResponseBreached:boolean;resolutionBreached:boolean};
  createdAt:string;createdBy:string;updatedAt:string;updatedBy:string;
  orderContext:{productId?:string;productName:string;offerId?:string;offerName:string;customerEmail?:string;amountLkr:number;orderStatus:string;paymentState:string;fulfillmentState?:string;refundStates:string[];risk?:{level:string;state:string;score:number};orderCreatedAt?:string};
};
export type GamingSupportMessage={messageId:string;caseId:string;orderId:string;visibility:'internal'|'customer';body:string;author:{kind:'staff'|'customer'|'service';accountId?:string};createdAt:string};
export type GamingSupportEvidence={evidenceId:string;caseId:string;orderId:string;kind:'external_reference'|'customer_reference'|'media_asset';label:string;reference:string;sensitivity:'general'|'support_private';audience?:'customer'|'staff';addedAt:string;addedBy:string};
export type GamingSupportSnapshot={source:'shared-d1'|'local-prototype';generatedAt:string;capabilities:{manage:boolean};summary:{total:number;open:number;inProgress:number;waitingCustomer:number;waitingInternal:number;urgent:number;slaBreached:number};cases:GamingSupportCase[];messages:GamingSupportMessage[];evidence:GamingSupportEvidence[];orders:Array<{orderId:string;orderNumber:string;productName:string;offerName:string;status:string;paymentState:string;amountLkr:number;createdAt:string}>};
export type SupportCreateInput={orderId:string;category:'payment'|'fulfillment'|'refund'|'account_details'|'delivery'|'promotion'|'duplicate_order'|'other';subject:string;priority:'normal'|'high'|'urgent';initialNote?:string};
export type SupportCommandInput={caseId:string;action:'assign_self'|'unassign'|'set_status'|'set_priority'|'add_internal_note'|'send_customer_message'|'add_evidence';status?:GamingSupportCase['status'];priority?:GamingSupportCase['priority'];body?:string;kind?:GamingSupportEvidence['kind'];label?:string;reference?:string};

const runtime=readProductionRuntimeConfig();
const client=runtime.mode==='production-api'?new ProductionBackendClient(runtime.apiBaseUrl):undefined;

export async function loadGamingSupportSnapshot():Promise<GamingSupportSnapshot>{
  if(!client)return{source:'local-prototype',generatedAt:new Date().toISOString(),capabilities:{manage:false},summary:{total:0,open:0,inProgress:0,waitingCustomer:0,waitingInternal:0,urgent:0,slaBreached:0},cases:[],messages:[],evidence:[],orders:[]};
  const result=await client.execute<GamingSupportSnapshot>({operation:'staff.gaming.support.snapshot.get',kind:'query',input:{}});
  if(!result.ok)throw new Error(`${result.problem.code}: ${result.problem.detail}`);return result.data;
}
async function command(operation:'staff.gaming.support.case.create'|'staff.gaming.support.case.command',input:Record<string,unknown>){
  if(!client)throw new Error('Live support management is available only through the production CMS API.');
  const result=await client.execute<Record<string,unknown>>({operation,kind:'command',input,idempotencyKey:`gaming-support:${crypto.randomUUID()}`});
  if(!result.ok)throw new Error(`${result.problem.code}: ${result.problem.detail}`);return result.data;
}
export function createGamingSupportCase(input:SupportCreateInput){return command('staff.gaming.support.case.create',input);}
export function commandGamingSupportCase(input:SupportCommandInput){return command('staff.gaming.support.case.command',input);}
