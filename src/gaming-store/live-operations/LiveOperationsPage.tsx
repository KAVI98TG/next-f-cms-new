import { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, CircleDollarSign, Eye, Mail, PackageCheck, RefreshCw, RotateCcw, ShieldCheck, ShoppingBag, SlidersHorizontal } from "lucide-react";
import { Button, Card, ConfirmDialog, DataTable, Drawer, FormField, KeyValueList, Modal, PageToolbar, SectionHeader, SelectInput, StatePanel, TextInput, Toggle, type DataTableColumn } from "../../shared/components";
import { useToast } from "../../shared/feedback/ToastProvider";
import { GamingStatus } from "../shared/GamingStatus";
import { gamingDate, gamingLkr } from "../shared/format";
import { completeGamingRefund, createGamingRefund, decideGamingRefund, decideGamingRisk, loadGamingOperationsSnapshot, markGamingRefundSent, retryGamingFulfillment, retryGamingNotification, reviewGamingPayment, type LiveFulfillmentJob, type LiveGamingEvent, type LiveGamingOperationsSnapshot, type LiveGamingOrder, type LiveNotificationRecord, type LivePaymentProof, type LiveRefundRecord, type LiveRiskAssessment } from "./operations";

const eventLabel=(value:string)=>value.toLowerCase().replace(/_/g," ").replace(/(^|\s)\S/g,(c)=>c.toUpperCase());
const providerLabel=(value?:string)=>!value?"Not assigned":value==="manual_bank"?"Manual bank":value==="ezycash"?"eZ Cash":value==="payhere"?"PayHere":value.replace(/_/g," ");
const localDateTime=()=>{const date=new Date();return new Date(date.getTime()-date.getTimezoneOffset()*60_000).toISOString().slice(0,16);};

function detailItems(value?:Record<string,unknown>){
  if(!value)return [];
  return Object.entries(value).filter(([,item])=>item!==undefined&&item!==null&&typeof item!=="object").map(([label,item])=>({label:label.replace(/([A-Z])/g," $1").replace(/^./,(c)=>c.toUpperCase()),value:String(item)}));
}

type PaymentDraft={decision:"verified"|"rejected";statementReference:string;receivedAmountLkr:string;receivedAt:string;destinationConfirmed:boolean;note:string};
type RefundCreateDraft={amountLkr:string;reasonCode:"fulfillment_failed"|"duplicate_payment"|"customer_request"|"operator_correction"|"other";reasonNote:string};
type RefundDecisionDraft={decision:"approved"|"rejected";note:string};
type RefundSentDraft={providerReference:string;sentAt:string;destinationConfirmed:boolean;supplierRecoveryLkr:string;gatewayFeeRecoveredLkr:string};

export function LiveOperationsPage(){
  const {notify}=useToast();
  const [snapshot,setSnapshot]=useState<LiveGamingOperationsSnapshot>();
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(true);
  const [tab,setTab]=useState<"orders"|"payments"|"fulfillment"|"risk"|"refunds"|"notifications"|"events">("orders");
  const [query,setQuery]=useState("");
  const [queueFilter,setQueueFilter]=useState("all");
  const [selectedOrderId,setSelectedOrderId]=useState<string|null>(null);
  const [reviewProof,setReviewProof]=useState<LivePaymentProof|null>(null);
  const [paymentDraft,setPaymentDraft]=useState<PaymentDraft>({decision:"verified",statementReference:"",receivedAmountLkr:"",receivedAt:localDateTime(),destinationConfirmed:false,note:""});
  const [paymentError,setPaymentError]=useState("");
  const [retryJob,setRetryJob]=useState<LiveFulfillmentJob|null>(null);
  const [refundOrder,setRefundOrder]=useState<LiveGamingOrder|null>(null);
  const [refundDraft,setRefundDraft]=useState<RefundCreateDraft>({amountLkr:"",reasonCode:"customer_request",reasonNote:""});
  const [refundDecision,setRefundDecision]=useState<LiveRefundRecord|null>(null);
  const [refundDecisionDraft,setRefundDecisionDraft]=useState<RefundDecisionDraft>({decision:"approved",note:""});
  const [refundSent,setRefundSent]=useState<LiveRefundRecord|null>(null);
  const [refundSentDraft,setRefundSentDraft]=useState<RefundSentDraft>({providerReference:"",sentAt:localDateTime(),destinationConfirmed:false,supplierRecoveryLkr:"0",gatewayFeeRecoveredLkr:"0"});
  const [completeRefund,setCompleteRefund]=useState<LiveRefundRecord|null>(null);
  const [refundError,setRefundError]=useState("");
  const [riskReview,setRiskReview]=useState<LiveRiskAssessment|null>(null);
  const [riskDecision,setRiskDecision]=useState<"release"|"keep_hold">("release");
  const [riskNote,setRiskNote]=useState("");
  const [riskError,setRiskError]=useState("");
  const [actionBusy,setActionBusy]=useState(false);

  const load=async()=>{setLoading(true);setError("");try{setSnapshot(await loadGamingOperationsSnapshot());}catch(err){setError(err instanceof Error?err.message:"Live Gaming operations could not be loaded.");}finally{setLoading(false);}};
  useEffect(()=>{void load();},[]);
  const selectedOrder=snapshot?.orders.find((order)=>order.orderId===selectedOrderId);
  const timeline=useMemo(()=>snapshot?.events.filter((event)=>event.orderId===selectedOrderId)??[],[snapshot,selectedOrderId]);
  const selectedRefunds=useMemo(()=>snapshot?.refunds.filter((refund)=>refund.orderId===selectedOrderId)??[],[snapshot,selectedOrderId]);
  const normalized=query.trim().toLowerCase();
  const baseOrders=(snapshot?.orders??[]).filter((order)=>`${order.orderNumber} ${order.productName} ${order.offerName} ${order.customer.email} ${order.status} ${order.payment.providerKey}`.toLowerCase().includes(normalized));
  const baseProofs=(snapshot?.paymentProofs??[]).filter((proof)=>`${proof.orderNumber} ${proof.reference} ${proof.paymentMethodLabel} ${proof.status}`.toLowerCase().includes(normalized));
  const baseJobs=(snapshot?.fulfillmentJobs??[]).filter((job)=>`${job.orderId} ${job.jobId} ${job.providerKey??""} ${job.state} ${job.lastError??""}`.toLowerCase().includes(normalized));
  const baseRefunds=(snapshot?.refunds??[]).filter((refund)=>`${refund.orderNumber} ${refund.refundId} ${refund.reasonCode} ${refund.paymentProviderKey} ${refund.status}`.toLowerCase().includes(normalized));
  const baseRisks=(snapshot?.riskAssessments??[]).filter((risk)=>`${risk.orderNumber} ${risk.assessmentId} ${risk.level} ${risk.state} ${risk.signals.map((signal)=>signal.code).join(" ")}`.toLowerCase().includes(normalized));
  const baseNotifications=(snapshot?.notifications??[]).filter((notification)=>`${notification.orderNumber} ${notification.notificationId} ${notification.recipient.email} ${notification.templateKey} ${notification.providerKey} ${notification.state} ${notification.lastError??""}`.toLowerCase().includes(normalized));
  const selectedRisk=(snapshot?.riskAssessments??[]).find((risk)=>risk.orderId===selectedOrderId);
  const baseEvents=(snapshot?.events??[]).filter((event)=>`${event.eventType} ${event.action} ${event.orderId??""} ${event.outcome}`.toLowerCase().includes(normalized));

  const orders=baseOrders.filter((order)=>queueFilter==="all"||order.status===queueFilter);
  const proofs=baseProofs.filter((proof)=>queueFilter==="all"||proof.status===queueFilter);
  const jobs=baseJobs.filter((job)=>queueFilter==="all"||(queueFilter==="attention"?["retry","blocked","failed"].includes(job.state):job.state===queueFilter));
  const refunds=baseRefunds.filter((refund)=>queueFilter==="all"||(queueFilter==="active"?["requested","approved","sent"].includes(refund.status):refund.status===queueFilter));
  const risks=baseRisks.filter((risk)=>queueFilter==="all"||(queueFilter==="attention"?["held","review"].includes(risk.state):queueFilter==="high"?["high","critical"].includes(risk.level):risk.state===queueFilter));
  const notifications=baseNotifications.filter((notification)=>queueFilter==="all"||(queueFilter==="attention"?["retry","blocked","failed"].includes(notification.state):notification.state===queueFilter));
  const events=baseEvents.filter((event)=>queueFilter==="all"||event.outcome===queueFilter);

  const paymentAttention=(snapshot?.paymentProofs??[]).filter((proof)=>proof.status==="pending_review").length;
  const fulfillmentAttention=snapshot?.summary.fulfillmentAttention??0;
  const riskAttention=(snapshot?.riskAssessments??[]).filter((risk)=>["held","review"].includes(risk.state)).length;
  const refundAttention=(snapshot?.refunds??[]).filter((refund)=>["requested","approved","sent"].includes(refund.status)).length;
  const notificationAttention=snapshot?.summary.notificationAttention??0;
  const totalAttention=paymentAttention+fulfillmentAttention+riskAttention+refundAttention+notificationAttention;
  const activeOrders=(snapshot?.orders??[]).filter((order)=>!["completed","failed","refunded","cancelled"].includes(order.status)).length;
  const recentActivity=(snapshot?.events??[]).slice(0,8);

  const queueOptions=tab==="orders"
    ? [["all","All states"],["payment_pending","Payment pending"],["processing","Processing"],["completed","Completed"],["failed","Failed"]]
    : tab==="payments"
      ? [["all","All reviews"],["pending_review","Needs review"],["verified","Verified"],["rejected","Rejected"]]
      : tab==="fulfillment"
        ? [["all","All jobs"],["attention","Needs attention"],["processing","Processing"],["completed","Completed"]]
        : tab==="risk"
          ? [["all","All assessments"],["attention","Needs review"],["high","High / critical"],["released","Released"]]
          : tab==="refunds"
            ? [["all","All refunds"],["active","Active workflow"],["completed","Completed"],["rejected","Rejected"]]
            : tab==="notifications"
              ? [["all","All notifications"],["attention","Needs attention"],["pending","Pending"],["sent","Sent"]]
              : [["all","All outcomes"],["success","Success"],["failed","Failed"],["verified","Verified"],["completed","Completed"]];

  const completedRefundFor=(orderId:string)=>(snapshot?.refunds??[]).filter((refund)=>refund.orderId===orderId&&refund.status==="completed").reduce((sum,refund)=>sum+refund.amountLkr,0);
  const activeRefundFor=(orderId:string)=>(snapshot?.refunds??[]).find((refund)=>refund.orderId===orderId&&["requested","approved","sent"].includes(refund.status));
  const remainingRefundFor=(order:LiveGamingOrder)=>Math.max(0,Math.round((order.amountLkr-completedRefundFor(order.orderId))*100)/100);
  const canStartRefund=(order:LiveGamingOrder)=>Boolean(snapshot?.capabilities.refundManage&&order.payment.state==="verified"&&["completed","failed","refund_pending"].includes(order.status)&&remainingRefundFor(order)>0&&!activeRefundFor(order.orderId));

  const openPaymentReview=(proof:LivePaymentProof)=>{
    setPaymentError("");
    setPaymentDraft({decision:"verified",statementReference:"",receivedAmountLkr:String(proof.amountLkr),receivedAt:localDateTime(),destinationConfirmed:false,note:""});
    setReviewProof(proof);
  };

  const submitPaymentReview=async()=>{
    if(!reviewProof||!snapshot?.capabilities.paymentReview||actionBusy)return;
    setPaymentError("");
    const amount=Number(paymentDraft.receivedAmountLkr);
    if(paymentDraft.decision==="verified"){
      if(!paymentDraft.statementReference.trim()){setPaymentError("Enter the transaction reference from the receiving bank/eZ Cash statement.");return;}
      if(!Number.isFinite(amount)||amount<=0){setPaymentError("Enter the amount actually credited to the receiving account.");return;}
      if(!paymentDraft.receivedAt){setPaymentError("Enter the received date and time shown by the receiving account.");return;}
      if(!paymentDraft.destinationConfirmed){setPaymentError("Confirm that the payment reached the selected NEXT F destination.");return;}
    }
    setActionBusy(true);
    try{
      await reviewGamingPayment({proofId:reviewProof.proofId,decision:paymentDraft.decision,note:paymentDraft.note.trim()||undefined,...(paymentDraft.decision==="verified"?{statementReference:paymentDraft.statementReference.trim(),receivedAmountLkr:amount,receivedAt:new Date(paymentDraft.receivedAt).toISOString(),destinationConfirmed:true}:{}),});
      notify({title:paymentDraft.decision==="verified"?"Payment verified":"Payment rejected",description:`${reviewProof.orderNumber} was updated through the Gaming control boundary.`,tone:paymentDraft.decision==="verified"?"success":"info"});
      setReviewProof(null); await load();
    }catch(err){setPaymentError(err instanceof Error?err.message:"Payment review could not be completed.");}
    finally{setActionBusy(false);}
  };

  const submitFulfillmentRetry=async()=>{
    if(!retryJob||!snapshot?.capabilities.fulfillmentRetry||actionBusy)return;
    setActionBusy(true);
    try{await retryGamingFulfillment(retryJob.jobId);notify({title:"Fulfillment retry queued",description:`${snapshot.orders.find((order)=>order.orderId===retryJob.orderId)?.orderNumber??retryJob.orderId} is ready for the Gaming fulfillment worker to retry.`,tone:"success"});setRetryJob(null);await load();}
    catch(err){notify({title:"Retry not queued",description:err instanceof Error?err.message:"Fulfillment retry could not be queued.",tone:"danger"});}
    finally{setActionBusy(false);}
  };

  const openRefundCreate=(order:LiveGamingOrder)=>{
    const amount=remainingRefundFor(order);
    setRefundError("");
    setRefundDraft({amountLkr:String(amount),reasonCode:["failed","refund_pending"].includes(order.status)?"fulfillment_failed":"customer_request",reasonNote:""});
    setRefundOrder(order);
  };

  const submitRefundCreate=async()=>{
    if(!refundOrder||!snapshot?.capabilities.refundManage||actionBusy)return;
    const amount=Number(refundDraft.amountLkr); const remaining=remainingRefundFor(refundOrder); setRefundError("");
    if(!Number.isFinite(amount)||amount<=0){setRefundError("Enter a positive refund amount.");return;}
    if(amount-remaining>0.009){setRefundError(`Refund cannot exceed the remaining ${gamingLkr(remaining)}.`);return;}
    setActionBusy(true);
    try{await createGamingRefund({orderId:refundOrder.orderId,amountLkr:amount,reasonCode:refundDraft.reasonCode,reasonNote:refundDraft.reasonNote.trim()||undefined});notify({title:"Refund requested",description:`${refundOrder.orderNumber} entered the finance refund workflow.`,tone:"success"});setRefundOrder(null);await load();}
    catch(err){setRefundError(err instanceof Error?err.message:"Refund could not be requested.");}
    finally{setActionBusy(false);}
  };

  const submitRefundDecision=async()=>{
    if(!refundDecision||!snapshot?.capabilities.refundManage||actionBusy)return; setRefundError("");
    if(refundDecisionDraft.decision==="rejected"&&!refundDecisionDraft.note.trim()){setRefundError("Enter the reason this refund is being rejected.");return;}
    setActionBusy(true);
    try{await decideGamingRefund(refundDecision.refundId,refundDecisionDraft.decision,refundDecisionDraft.note.trim()||undefined);notify({title:refundDecisionDraft.decision==="approved"?"Refund approved":"Refund rejected",description:`${refundDecision.orderNumber} refund was ${refundDecisionDraft.decision}.`,tone:refundDecisionDraft.decision==="approved"?"success":"info"});setRefundDecision(null);await load();}
    catch(err){setRefundError(err instanceof Error?err.message:"Refund decision could not be recorded.");}
    finally{setActionBusy(false);}
  };

  const submitRefundSent=async()=>{
    if(!refundSent||!snapshot?.capabilities.refundManage||actionBusy)return; setRefundError("");
    const supplierRecovery=Number(refundSentDraft.supplierRecoveryLkr||0); const feeRecovery=Number(refundSentDraft.gatewayFeeRecoveredLkr||0);
    if(!refundSentDraft.providerReference.trim()){setRefundError("Enter the sending provider transaction/reference.");return;}
    if(!refundSentDraft.sentAt){setRefundError("Enter the date and time the refund was sent.");return;}
    if(!refundSentDraft.destinationConfirmed){setRefundError("Confirm the refund was sent to the intended customer destination.");return;}
    if(!Number.isFinite(supplierRecovery)||supplierRecovery<0||!Number.isFinite(feeRecovery)||feeRecovery<0){setRefundError("Recovery amounts must be zero or positive.");return;}
    if(supplierRecovery+feeRecovery-refundSent.amountLkr>0.009){setRefundError("Recorded recoveries cannot exceed the customer refund amount.");return;}
    setActionBusy(true);
    try{await markGamingRefundSent({refundId:refundSent.refundId,providerReference:refundSentDraft.providerReference.trim(),sentAt:new Date(refundSentDraft.sentAt).toISOString(),destinationConfirmed:true,supplierRecoveryLkr:supplierRecovery,gatewayFeeRecoveredLkr:feeRecovery});notify({title:"Refund marked sent",description:`${refundSent.orderNumber} now has a recorded payout reference.`,tone:"success"});setRefundSent(null);await load();}
    catch(err){setRefundError(err instanceof Error?err.message:"Refund payout could not be recorded.");}
    finally{setActionBusy(false);}
  };

  const submitRefundComplete=async()=>{
    if(!completeRefund||!snapshot?.capabilities.refundManage||actionBusy)return; setActionBusy(true);
    try{await completeGamingRefund(completeRefund.refundId);notify({title:"Refund completed",description:`${completeRefund.orderNumber} financial refund is finalized.`,tone:"success"});setCompleteRefund(null);await load();}
    catch(err){notify({title:"Refund not completed",description:err instanceof Error?err.message:"Refund completion failed.",tone:"danger"});}
    finally{setActionBusy(false);}
  };

  const submitRiskDecision=async()=>{
    if(!riskReview||!snapshot?.capabilities.riskReview||actionBusy)return; setRiskError("");
    setActionBusy(true);
    try{await decideGamingRisk(riskReview.assessmentId,riskDecision,riskNote.trim()||undefined);notify({title:riskDecision==="release"?"Risk hold released":"Risk hold retained",description:`${riskReview.orderNumber} risk review was recorded by the Gaming API.`,tone:riskDecision==="release"?"success":"info"});setRiskReview(null);setRiskNote("");await load();}
    catch(err){setRiskError(err instanceof Error?err.message:"Risk decision could not be completed.");}
    finally{setActionBusy(false);}
  };

  const submitNotificationRetry=async(notification:LiveNotificationRecord)=>{
    if(!snapshot?.capabilities.notificationRetry||actionBusy||notification.state==="sent")return;
    setActionBusy(true);
    try{await retryGamingNotification(notification.notificationId);notify({title:"Notification retry queued",description:`${notification.orderNumber} · ${eventLabel(notification.templateKey)} will retry through the Gaming notification outbox.`,tone:"success"});await load();}
    catch(err){notify({title:"Notification not queued",description:err instanceof Error?err.message:"Notification retry could not be queued.",tone:"danger"});}
    finally{setActionBusy(false);}
  };

  const orderColumns:DataTableColumn<LiveGamingOrder>[]= [
    {key:"order",header:"Order",render:(row)=><div className="entity-cell"><strong>{row.orderNumber}</strong><small>{gamingDate(row.createdAt)}</small></div>},
    {key:"customer",header:"Customer",render:(row)=><div className="entity-cell"><strong>{row.customer.email||"Guest"}</strong><small>{row.productName} · {row.offerName}</small></div>},
    {key:"amount",header:"Amount",render:(row)=><strong>{gamingLkr(row.amountLkr)}</strong>},
    {key:"payment",header:"Payment",render:(row)=><div className="entity-cell"><strong>{providerLabel(row.payment.providerKey)}</strong><small>{row.payment.methodLabel||row.payment.state}</small></div>},
    {key:"status",header:"Order state",render:(row)=><GamingStatus value={row.status}/>},
    {key:"fulfillment",header:"Fulfillment",render:(row)=><GamingStatus value={snapshot?.fulfillmentJobs.find((job)=>job.orderId===row.orderId)?.state??(row.status==="completed"?"completed":"not_started")}/>},
    {key:"action",header:"",width:"88px",render:(row)=><Button onClick={()=>setSelectedOrderId(row.orderId)}><Eye size={13}/>View</Button>},
  ];
  const paymentColumns:DataTableColumn<LivePaymentProof>[]= [
    {key:"order",header:"Order",render:(row)=><div className="entity-cell"><strong>{row.orderNumber}</strong><small>{row.proofId}</small></div>},
    {key:"method",header:"Provider",render:(row)=><div className="entity-cell"><strong>{providerLabel(row.providerKey)}</strong><small>{row.paymentMethodLabel}</small></div>},
    {key:"reference",header:"Customer reference",render:(row)=><strong>{row.reference}</strong>},
    {key:"amount",header:"Amount",render:(row)=><strong>{gamingLkr(row.amountLkr)}</strong>},
    {key:"status",header:"Review state",render:(row)=><GamingStatus value={row.status}/>},
    {key:"submitted",header:"Submitted",render:(row)=><span className="muted-cell">{gamingDate(row.submittedAt)}</span>},
    {key:"action",header:"",width:"110px",render:(row)=>row.status==="pending_review"?<Button variant="primary" disabled={!snapshot?.capabilities.paymentReview||actionBusy} onClick={()=>openPaymentReview(row)}>Review</Button>:<span className="muted-cell">Reviewed</span>},
  ];
  const fulfillmentColumns:DataTableColumn<LiveFulfillmentJob>[]= [
    {key:"job",header:"Job",render:(row)=><div className="entity-cell"><strong>{row.jobId}</strong><small>{snapshot?.orders.find((order)=>order.orderId===row.orderId)?.orderNumber??row.orderId}</small></div>},
    {key:"provider",header:"Supplier",render:(row)=><div className="entity-cell"><strong>{row.providerKey??"Waiting for route"}</strong><small>{row.supplierOrderId??row.mappingId??"Not submitted"}</small></div>},
    {key:"state",header:"State",render:(row)=><GamingStatus value={row.state}/>},
    {key:"attempts",header:"Attempts",render:(row)=><strong>{row.attempts}</strong>},
    {key:"next",header:"Next check",render:(row)=><span className="muted-cell">{gamingDate(row.nextAttemptAt)}</span>},
    {key:"error",header:"Last error",render:(row)=><span className="muted-cell">{row.lastError??"—"}</span>},
    {key:"action",header:"",width:"110px",render:(row)=>row.state!=="completed"?<Button disabled={!snapshot?.capabilities.fulfillmentRetry||actionBusy} onClick={()=>setRetryJob(row)}><RotateCcw size={13}/>Retry</Button>:<span className="muted-cell">Done</span>},
  ];
  const riskColumns:DataTableColumn<LiveRiskAssessment>[]= [
    {key:"order",header:"Order",render:(row)=><div className="entity-cell"><strong>{row.orderNumber}</strong><small>{row.assessmentId}</small></div>},
    {key:"score",header:"Risk",render:(row)=><div className="entity-cell"><strong>{row.score}/100 · {eventLabel(row.level)}</strong><small>{row.signals.length} signal{row.signals.length===1?"":"s"}</small></div>},
    {key:"state",header:"Review state",render:(row)=><GamingStatus value={row.state}/>},
    {key:"account",header:"Account context",render:(row)=><div className="entity-cell"><strong>{row.account.authenticated?"Signed in":"Guest checkout"}</strong><small>{row.account.ageHours===undefined?`${row.account.previousOrderCount} previous orders`:`${row.account.ageHours}h old · ${row.account.previousOrderCount} previous orders`}</small></div>},
    {key:"signals",header:"Signals",render:(row)=><span className="muted-cell">{row.signals.slice(0,2).map((signal)=>eventLabel(signal.code)).join(" · ")||"No elevated signals"}</span>},
    {key:"updated",header:"Updated",render:(row)=><span className="muted-cell">{gamingDate(row.updatedAt)}</span>},
    {key:"action",header:"",width:"120px",render:(row)=>["held","review"].includes(row.state)?<Button variant={row.state==="held"?"primary":"secondary"} disabled={!snapshot?.capabilities.riskReview||actionBusy} onClick={()=>{setRiskError("");setRiskDecision("release");setRiskNote("");setRiskReview(row);}}>Review</Button>:<Button onClick={()=>setSelectedOrderId(row.orderId)}><Eye size={13}/>View</Button>},
  ];
  const refundColumns:DataTableColumn<LiveRefundRecord>[]= [
    {key:"refund",header:"Refund",render:(row)=><div className="entity-cell"><strong>{row.orderNumber}</strong><small>{row.refundId}</small></div>},
    {key:"reason",header:"Reason",render:(row)=><div className="entity-cell"><strong>{eventLabel(row.reasonCode)}</strong><small>{providerLabel(row.paymentProviderKey)} · {row.paymentMethodLabel}</small></div>},
    {key:"amount",header:"Customer refund",render:(row)=><strong>{gamingLkr(row.amountLkr)}</strong>},
    {key:"status",header:"State",render:(row)=><GamingStatus value={row.status}/>},
    {key:"updated",header:"Updated",render:(row)=><span className="muted-cell">{gamingDate(row.updatedAt)}</span>},
    {key:"action",header:"",width:"120px",render:(row)=>row.status==="requested"?<Button variant="primary" disabled={!snapshot?.capabilities.refundManage||actionBusy} onClick={()=>{setRefundError("");setRefundDecisionDraft({decision:"approved",note:""});setRefundDecision(row);}}>Review</Button>:row.status==="approved"?<Button disabled={!snapshot?.capabilities.refundManage||actionBusy} onClick={()=>{setRefundError("");setRefundSentDraft({providerReference:"",sentAt:localDateTime(),destinationConfirmed:false,supplierRecoveryLkr:"0",gatewayFeeRecoveredLkr:"0"});setRefundSent(row);}}>Mark sent</Button>:row.status==="sent"?<Button variant="primary" disabled={!snapshot?.capabilities.refundManage||actionBusy} onClick={()=>setCompleteRefund(row)}>Complete</Button>:<span className="muted-cell">{eventLabel(row.status)}</span>},
  ];
  const notificationColumns:DataTableColumn<LiveNotificationRecord>[]= [
    {key:"notification",header:"Notification",render:(row)=><div className="entity-cell"><strong>{eventLabel(row.templateKey)}</strong><small>{row.notificationId}</small></div>},
    {key:"order",header:"Order",render:(row)=><div className="entity-cell"><strong>{row.orderNumber}</strong><small>{row.recipient.email}</small></div>},
    {key:"provider",header:"Channel",render:(row)=><div className="entity-cell"><strong>{eventLabel(row.channel)}</strong><small>{row.providerKey}</small></div>},
    {key:"state",header:"State",render:(row)=><GamingStatus value={row.state}/>},
    {key:"attempts",header:"Attempts",render:(row)=><strong>{row.attempts}</strong>},
    {key:"updated",header:"Updated",render:(row)=><div className="entity-cell"><strong>{gamingDate(row.sentAt??row.updatedAt)}</strong><small>{row.lastError??(row.providerMessageId?`Provider ${row.providerMessageId}`:"Waiting for delivery")}</small></div>},
    {key:"action",header:"",width:"110px",render:(row)=>row.state!=="sent"?<Button disabled={!snapshot?.capabilities.notificationRetry||actionBusy} onClick={()=>void submitNotificationRetry(row)}><RotateCcw size={13}/>Retry</Button>:<span className="muted-cell">Sent</span>},
  ];
  const eventColumns:DataTableColumn<LiveGamingEvent>[]= [
    {key:"event",header:"Commerce event",render:(row)=><div className="entity-cell"><strong>{eventLabel(row.eventType)}</strong><small>{row.action}</small></div>},
    {key:"order",header:"Order",render:(row)=><strong>{snapshot?.orders.find((order)=>order.orderId===row.orderId)?.orderNumber??row.orderId??"—"}</strong>},
    {key:"scope",header:"Scope",render:(row)=><GamingStatus value={row.scope}/>},
    {key:"outcome",header:"Outcome",render:(row)=><GamingStatus value={row.outcome}/>},
    {key:"actor",header:"Actor",render:(row)=><div className="entity-cell"><strong>{row.principalKind}</strong><small>{row.principalId}</small></div>},
    {key:"time",header:"Time",render:(row)=><span className="muted-cell">{gamingDate(row.createdAt)}</span>},
  ];

  return <div className="page live-operations-page">
    <SectionHeader eyebrow="Gaming Store · Operations" title="Live Operations" description="Monitor and operate payment, fulfillment, risk, refund and notification queues from one production command center." action={<Button onClick={()=>void load()} disabled={loading||actionBusy}><RefreshCw size={15}/>Refresh</Button>}/>
    {loading&&!snapshot?<StatePanel state="loading" title="Loading live Gaming operations" description="Reading the shared order, payment, fulfillment, risk, refund, notification and audit state."/>:error&&!snapshot?<StatePanel state="error" title="Live operations unavailable" description={error} action={<Button onClick={()=>void load()}><RefreshCw size={15}/>Retry</Button>}/>:snapshot?<>
      <div className="live-ops-status-grid">
        <button className="live-ops-stat" onClick={()=>{setTab("orders");setQuery("");setQueueFilter("all");}}><span><ShoppingBag size={15}/>Active orders</span><strong>{activeOrders}</strong><small>{snapshot.summary.totalOrders} total recorded</small></button>
        <button className={`live-ops-stat ${paymentAttention?"is-warning":""}`} onClick={()=>{setTab("payments");setQuery("");setQueueFilter(paymentAttention?"pending_review":"all");}}><span><CircleDollarSign size={15}/>Payment review</span><strong>{paymentAttention}</strong><small>{paymentAttention?"operator review required":"queue clear"}</small></button>
        <button className={`live-ops-stat ${fulfillmentAttention?"is-danger":""}`} onClick={()=>{setTab("fulfillment");setQuery("");setQueueFilter(fulfillmentAttention?"attention":"all");}}><span><PackageCheck size={15}/>Fulfillment</span><strong>{fulfillmentAttention}</strong><small>{fulfillmentAttention?"jobs need attention":"no blocked jobs"}</small></button>
        <button className={`live-ops-stat ${riskAttention?"is-warning":""}`} onClick={()=>{setTab("risk");setQuery("");setQueueFilter(riskAttention?"attention":"all");}}><span><ShieldCheck size={15}/>Risk holds</span><strong>{riskAttention}</strong><small>{riskAttention?"reviews waiting":"no active holds"}</small></button>
        <button className={`live-ops-stat ${refundAttention?"is-warning":""}`} onClick={()=>{setTab("refunds");setQuery("");setQueueFilter(refundAttention?"active":"all");}}><span><RotateCcw size={15}/>Refunds</span><strong>{refundAttention}</strong><small>{snapshot.capabilities.finance?`${gamingLkr(snapshot.summary.pendingRefundsLkr??0)} pending`:"finance restricted"}</small></button>
        <button className={`live-ops-stat ${notificationAttention?"is-warning":""}`} onClick={()=>{setTab("notifications");setQuery("");setQueueFilter(notificationAttention?"attention":"all");}}><span><Mail size={15}/>Notifications</span><strong>{notificationAttention}</strong><small>{snapshot.summary.notificationPending} pending · {snapshot.summary.notificationSent} sent</small></button>
        <div className="live-ops-stat live-ops-stat--sales"><span><CircleDollarSign size={15}/>{snapshot.capabilities.finance?"Net sales":"Commerce events"}</span><strong>{snapshot.capabilities.finance?gamingLkr(snapshot.summary.netSalesLkr??snapshot.summary.grossSalesLkr??0):snapshot.events.length}</strong><small>{snapshot.source==="shared-d1"?"shared production D1":"local projection"}</small></div>
      </div>

      <Card className={`live-ops-attention ${totalAttention?"has-attention":"is-clear"}`}>
        <div className="live-ops-attention__main">
          <span className="live-ops-attention__icon">{totalAttention?<AlertTriangle size={18}/>:<CheckCircle2 size={18}/>}</span>
          <div><strong>{totalAttention?`${totalAttention} operational item${totalAttention===1?"":"s"} need attention`:"All operational queues are clear"}</strong><small>{totalAttention?"Use the queue shortcuts to work the items that need an operator decision or retry.":"No payment, fulfillment, risk, refund or notification exceptions currently require action."}</small></div>
        </div>
        {totalAttention>0&&<div className="live-ops-attention__actions">
          {paymentAttention>0&&<button onClick={()=>{setTab("payments");setQuery("");setQueueFilter("pending_review");}}>Payments <b>{paymentAttention}</b></button>}
          {fulfillmentAttention>0&&<button onClick={()=>{setTab("fulfillment");setQuery("");setQueueFilter("attention");}}>Fulfillment <b>{fulfillmentAttention}</b></button>}
          {riskAttention>0&&<button onClick={()=>{setTab("risk");setQuery("");setQueueFilter("attention");}}>Risk <b>{riskAttention}</b></button>}
          {refundAttention>0&&<button onClick={()=>{setTab("refunds");setQuery("");setQueueFilter("active");}}>Refunds <b>{refundAttention}</b></button>}
          {notificationAttention>0&&<button onClick={()=>{setTab("notifications");setQuery("");setQueueFilter("attention");}}>Notifications <b>{notificationAttention}</b></button>}
        </div>}
      </Card>

      <Card className="live-ops-workspace">
        <div className="operation-section__head live-ops-workspace__head"><div><span>Work queues</span><h3>Operate live commerce</h3></div><small>Updated {gamingDate(snapshot.generatedAt)}</small></div>
        <div className="segmented-nav live-ops-queue-nav">
          <button className={tab==="orders"?"is-active":""} onClick={()=>{setTab("orders");setQuery("");setQueueFilter("all");}}>Orders <span>{snapshot.orders.length}</span></button>
          <button className={tab==="payments"?"is-active":""} onClick={()=>{setTab("payments");setQuery("");setQueueFilter("all");}}>Payments <span>{snapshot.paymentProofs.length}</span></button>
          <button className={tab==="fulfillment"?"is-active":""} onClick={()=>{setTab("fulfillment");setQuery("");setQueueFilter("all");}}>Fulfillment <span>{snapshot.fulfillmentJobs.length}</span></button>
          <button className={tab==="risk"?"is-active":""} onClick={()=>{setTab("risk");setQuery("");setQueueFilter("all");}}>Risk <span>{snapshot.riskAssessments.length}</span></button>
          <button className={tab==="refunds"?"is-active":""} onClick={()=>{setTab("refunds");setQuery("");setQueueFilter("all");}}>Refunds <span>{snapshot.refunds.length}</span></button>
          <button className={tab==="notifications"?"is-active":""} onClick={()=>{setTab("notifications");setQuery("");setQueueFilter("all");}}>Notifications <span>{snapshot.notifications.length}</span></button>
          <button className={`live-ops-activity-tab ${tab==="events"?"is-active":""}`} onClick={()=>{setTab("events");setQuery("");setQueueFilter("all");}}><Activity size={13}/>Events <span>{snapshot.events.length}</span></button>
        </div>
        <div className="live-ops-toolbar">
          <PageToolbar query={query} onQueryChange={setQuery} placeholder={`Search ${tab}…`}/>
          <div className="live-ops-toolbar__filter"><SlidersHorizontal size={14}/><SelectInput value={queueFilter} onChange={(event)=>setQueueFilter(event.target.value)}>{queueOptions.map(([value,label])=><option key={value} value={value}>{label}</option>)}</SelectInput></div>
        </div>
        <div className="live-ops-table">
          {tab==="orders"&&<DataTable rows={orders} columns={orderColumns} getKey={(row)=>row.orderId} empty={query||queueFilter!=="all"?"No orders match the current search and filter.":"No live Gaming orders are recorded yet."}/>}
          {tab==="payments"&&(snapshot.capabilities.finance?<DataTable rows={proofs} columns={paymentColumns} getKey={(row)=>row.proofId} empty={query||queueFilter!=="all"?"No payment proofs match this view.":"Payment review is clear. No proofs are waiting."}/>:<StatePanel state="empty" title="Finance permission required" description="Payment proof and reconciliation details are restricted to staff with Gaming finance permission."/>)}
          {tab==="fulfillment"&&(snapshot.capabilities.fulfillment?<DataTable rows={jobs} columns={fulfillmentColumns} getKey={(row)=>row.jobId} empty={query||queueFilter!=="all"?"No fulfillment jobs match this view.":"No fulfillment jobs are currently recorded."}/>:<StatePanel state="empty" title="Fulfillment permission required" description="Fulfillment job details require Gaming order or supplier management permission."/>)}
          {tab==="risk"&&(snapshot.capabilities.risk?<DataTable rows={risks} columns={riskColumns} getKey={(row)=>row.assessmentId} empty={query||queueFilter!=="all"?"No risk assessments match this view.":"No risk assessments are currently recorded."}/>:<StatePanel state="empty" title="Order management permission required" description="Risk signals and review state require Gaming order management permission."/>)}
          {tab==="refunds"&&(snapshot.capabilities.finance?<DataTable rows={refunds} columns={refundColumns} getKey={(row)=>row.refundId} empty={query||queueFilter!=="all"?"No refunds match this view.":"No refund workflow is currently active."}/>:<StatePanel state="empty" title="Finance permission required" description="Refund records and payout references are restricted to staff with Gaming finance permission."/>)}
          {tab==="notifications"&&<DataTable rows={notifications} columns={notificationColumns} getKey={(row)=>row.notificationId} empty={query||queueFilter!=="all"?"No notifications match this view.":"No customer notifications are currently recorded."}/>}
          {tab==="events"&&<DataTable rows={events} columns={eventColumns} getKey={(row)=>row.id} empty={query||queueFilter!=="all"?"No commerce events match this view.":"No Gaming commerce events have been recorded yet."}/>}
        </div>
      </Card>

      {tab!=="events"&&<Card className="live-ops-activity-card">
        <div className="operation-section__head"><div><span>Activity</span><h3>Recent operational events</h3></div><Activity size={18}/></div>
        {recentActivity.length?<div className="live-ops-activity-feed">{recentActivity.map((event)=><div key={event.id}><GamingStatus value={event.outcome}/><span><strong>{eventLabel(event.eventType)}</strong><small>{snapshot.orders.find((order)=>order.orderId===event.orderId)?.orderNumber??event.targetId} · {event.action}</small></span><time>{gamingDate(event.createdAt)}</time></div>)}</div>:<div className="live-ops-inline-empty"><Activity size={18}/><span><strong>No operational activity yet</strong><small>Commerce events will appear here as customers and operators use the Gaming platform.</small></span></div>}
      </Card>}

      <details className="live-ops-diagnostics">
        <summary><span><ShieldCheck size={16}/><strong>System diagnostics</strong><small>Command bridge and payment-provider readiness</small></span><span>{snapshot.source==="shared-d1"?"Production":"Local"}</span></summary>
        <div className="live-ops-diagnostics__grid">
          <div><span>Command bridge</span><strong>{snapshot.capabilities.paymentReview&&snapshot.capabilities.fulfillmentRetry&&snapshot.capabilities.refundManage&&snapshot.capabilities.notificationRetry?"Ready":"Partially available"}</strong><small>State-changing controls stay behind the CMS Worker and staff permissions.</small></div>
          <div><span>Payment providers</span><strong>{snapshot.paymentMethods.length?`${snapshot.paymentMethods.length} configured`:"Server defaults"}</strong><small>{snapshot.paymentMethods.length?snapshot.paymentMethods.map((method)=>`${method.label} · ${providerLabel(method.providerKey)}`).join(" • "):"No CMS payment-method configuration is stored yet."}</small></div>
        </div>
      </details>
      <Drawer open={!!selectedOrder} onClose={()=>setSelectedOrderId(null)} title={selectedOrder?.orderNumber??"Order"} description={selectedOrder?`${selectedOrder.productName} · ${selectedOrder.customer.email}`:undefined}>{selectedOrder&&<>
        <div className="record-detail-section"><h4>Order state</h4><KeyValueList items={[{label:"Status",value:<GamingStatus value={selectedOrder.status}/>},{label:"Created",value:gamingDate(selectedOrder.createdAt)},{label:"Updated",value:gamingDate(selectedOrder.updatedAt)},{label:"Amount",value:gamingLkr(selectedOrder.amountLkr)},{label:"Refundable balance",value:snapshot.capabilities.finance?gamingLkr(remainingRefundFor(selectedOrder)):"Finance permission required"}]}/>{canStartRefund(selectedOrder)&&<Button variant="primary" disabled={actionBusy} onClick={()=>openRefundCreate(selectedOrder)}><RotateCcw size={13}/>Start refund</Button>}</div>
        <div className="record-detail-section"><h4>Payment</h4><KeyValueList items={[{label:"Provider",value:providerLabel(selectedOrder.payment.providerKey)},{label:"Method",value:selectedOrder.payment.methodLabel||selectedOrder.payment.methodId},{label:"State",value:<GamingStatus value={selectedOrder.payment.state}/>},{label:"Latest proof",value:selectedOrder.payment.latestProofId??"Not submitted"}]}/></div>
        <div className="record-detail-section"><h4>Fulfillment</h4><KeyValueList items={[{label:"Supplier provider",value:selectedOrder.fulfillment?.providerKey??"Not routed"},{label:"Mapping",value:selectedOrder.fulfillment?.mappingId??String(selectedOrder.routing?.mappingId??"Not captured")},{label:"Supplier order",value:selectedOrder.fulfillment?.supplierOrderId??"Not submitted"},{label:"Job",value:selectedOrder.fulfillment?.jobId??"Not queued"}]}/></div>
        {snapshot.capabilities.risk&&<div className="record-detail-section"><h4>Risk assessment</h4>{selectedRisk?<><KeyValueList items={[{label:"Score",value:`${selectedRisk.score}/100 · ${eventLabel(selectedRisk.level)}`},{label:"State",value:<GamingStatus value={selectedRisk.state}/>},{label:"Account",value:selectedRisk.account.authenticated?"Signed in":"Guest checkout"},{label:"Signals",value:String(selectedRisk.signals.length)}]}/><div className="gaming-activity">{selectedRisk.signals.map((signal)=><div key={`${selectedRisk.assessmentId}-${signal.code}`}><GamingStatus value={signal.weight>=25?"high":"warning"}/><span><strong>{eventLabel(signal.code)} · +{signal.weight}</strong><small>{gamingDate(signal.observedAt)}</small></span></div>)}</div></>:<p>No risk assessment is linked to this order.</p>}</div>}
        {selectedOrder.economics&&<div className="record-detail-section"><h4>Economics snapshot</h4><KeyValueList items={detailItems(selectedOrder.economics)}/></div>}
        {snapshot.capabilities.finance&&<div className="record-detail-section"><h4>Refund ledger</h4>{selectedRefunds.length?<div className="gaming-activity">{selectedRefunds.map((refund)=><div key={refund.refundId}><GamingStatus value={refund.status}/><span><strong>{gamingLkr(refund.amountLkr)} · {eventLabel(refund.reasonCode)}</strong><small>{gamingDate(refund.updatedAt)} · {providerLabel(refund.paymentProviderKey)}</small></span></div>)}</div>:<p>No refund records are linked to this order.</p>}</div>}
        <div className="record-detail-section"><h4>Commerce timeline</h4>{timeline.length?<div className="gaming-activity">{timeline.map((event)=><div key={event.id}><GamingStatus value={event.outcome}/><span><strong>{eventLabel(event.eventType)}</strong><small>{gamingDate(event.createdAt)} · {event.action}</small></span></div>)}</div>:<p>No append-only Gaming events are linked to this order yet.</p>}</div>
      </>}</Drawer>
      <Modal open={!!reviewProof} onClose={()=>{if(!actionBusy){setReviewProof(null);setPaymentError("");}}} title={reviewProof?`Review payment · ${reviewProof.orderNumber}`:"Review payment"} description="The Gaming API performs the financial validation. CMS records the authenticated staff operator and does not handle supplier/payment secrets in the browser." footer={<><Button disabled={actionBusy} onClick={()=>setReviewProof(null)}>Cancel</Button><Button variant={paymentDraft.decision==="verified"?"primary":"secondary"} className={paymentDraft.decision==="rejected"?"button--danger":""} disabled={actionBusy||!snapshot.capabilities.paymentReview} onClick={()=>void submitPaymentReview()}>{actionBusy?"Applying…":paymentDraft.decision==="verified"?"Verify payment":"Reject payment"}</Button></>}>
        {reviewProof&&<div className="form-grid form-grid--two"><FormField label="Decision" required><SelectInput value={paymentDraft.decision} onChange={(event)=>setPaymentDraft({...paymentDraft,decision:event.target.value as PaymentDraft["decision"]})}><option value="verified">Verified</option><option value="rejected">Rejected</option></SelectInput></FormField><FormField label="Customer reference"><TextInput value={reviewProof.reference} disabled/></FormField>{paymentDraft.decision==="verified"&&<><FormField label="Receiving statement reference" required><TextInput value={paymentDraft.statementReference} onChange={(event)=>setPaymentDraft({...paymentDraft,statementReference:event.target.value})}/></FormField><FormField label="Amount credited (LKR)" required><TextInput type="number" min="0" step="0.01" value={paymentDraft.receivedAmountLkr} onChange={(event)=>setPaymentDraft({...paymentDraft,receivedAmountLkr:event.target.value})}/></FormField><FormField label="Received at" required><TextInput type="datetime-local" value={paymentDraft.receivedAt} onChange={(event)=>setPaymentDraft({...paymentDraft,receivedAt:event.target.value})}/></FormField><div className="settings-row"><span><strong>Destination confirmed</strong><small>Confirm the credit reached the selected NEXT F bank/eZ Cash destination.</small></span><Toggle checked={paymentDraft.destinationConfirmed} onChange={(value)=>setPaymentDraft({...paymentDraft,destinationConfirmed:value})}/></div></>}<FormField label={paymentDraft.decision==="rejected"?"Rejection note":"Review note"}><TextInput value={paymentDraft.note} onChange={(event)=>setPaymentDraft({...paymentDraft,note:event.target.value})} placeholder={paymentDraft.decision==="rejected"?"Reason the proof cannot be verified":"Optional internal note"}/></FormField>{paymentError&&<div className="form-error">{paymentError}</div>}</div>}
      </Modal>
      <Modal open={!!refundOrder} onClose={()=>{if(!actionBusy){setRefundOrder(null);setRefundError("");}}} title={refundOrder?`Start refund · ${refundOrder.orderNumber}`:"Start refund"} description="Creates a durable finance record. Active supplier fulfillment is not refundable through this workflow; it must first complete or fail." footer={<><Button disabled={actionBusy} onClick={()=>setRefundOrder(null)}>Cancel</Button><Button variant="primary" disabled={actionBusy||!snapshot.capabilities.refundManage} onClick={()=>void submitRefundCreate()}>{actionBusy?"Creating…":"Create refund"}</Button></>}>
        {refundOrder&&<div className="form-grid form-grid--two"><FormField label="Refund amount (LKR)" required><TextInput type="number" min="0.01" step="0.01" value={refundDraft.amountLkr} onChange={(event)=>setRefundDraft({...refundDraft,amountLkr:event.target.value})}/></FormField><FormField label="Remaining refundable"><TextInput value={gamingLkr(remainingRefundFor(refundOrder))} disabled/></FormField><FormField label="Reason" required><SelectInput value={refundDraft.reasonCode} onChange={(event)=>setRefundDraft({...refundDraft,reasonCode:event.target.value as RefundCreateDraft["reasonCode"]})}><option value="fulfillment_failed">Fulfillment failed</option><option value="duplicate_payment">Duplicate payment</option><option value="customer_request">Customer request</option><option value="operator_correction">Operator correction</option><option value="other">Other</option></SelectInput></FormField><FormField label="Internal note"><TextInput value={refundDraft.reasonNote} onChange={(event)=>setRefundDraft({...refundDraft,reasonNote:event.target.value})} placeholder="Why this refund is required"/></FormField>{refundError&&<div className="form-error">{refundError}</div>}</div>}
      </Modal>
      <Modal open={!!refundDecision} onClose={()=>{if(!actionBusy){setRefundDecision(null);setRefundError("");}}} title={refundDecision?`Review refund · ${refundDecision.orderNumber}`:"Review refund"} description={refundDecision?`${gamingLkr(refundDecision.amountLkr)} · ${eventLabel(refundDecision.reasonCode)}`:undefined} footer={<><Button disabled={actionBusy} onClick={()=>setRefundDecision(null)}>Cancel</Button><Button variant={refundDecisionDraft.decision==="approved"?"primary":"secondary"} className={refundDecisionDraft.decision==="rejected"?"button--danger":""} disabled={actionBusy||!snapshot.capabilities.refundManage} onClick={()=>void submitRefundDecision()}>{actionBusy?"Applying…":refundDecisionDraft.decision==="approved"?"Approve refund":"Reject refund"}</Button></>}>
        {refundDecision&&<div className="form-grid form-grid--two"><FormField label="Decision" required><SelectInput value={refundDecisionDraft.decision} onChange={(event)=>setRefundDecisionDraft({...refundDecisionDraft,decision:event.target.value as RefundDecisionDraft["decision"]})}><option value="approved">Approved</option><option value="rejected">Rejected</option></SelectInput></FormField><FormField label="Original payment"><TextInput value={`${providerLabel(refundDecision.paymentProviderKey)} · ${refundDecision.paymentMethodLabel}`} disabled/></FormField><FormField label={refundDecisionDraft.decision==="rejected"?"Rejection note":"Review note"} required={refundDecisionDraft.decision==="rejected"}><TextInput value={refundDecisionDraft.note} onChange={(event)=>setRefundDecisionDraft({...refundDecisionDraft,note:event.target.value})}/></FormField>{refundError&&<div className="form-error">{refundError}</div>}</div>}
      </Modal>
      <Modal open={!!refundSent} onClose={()=>{if(!actionBusy){setRefundSent(null);setRefundError("");}}} title={refundSent?`Record payout · ${refundSent.orderNumber}`:"Record refund payout"} description="Record the actual customer payout and any supplier/gateway recoveries. These values feed the finance margin view." footer={<><Button disabled={actionBusy} onClick={()=>setRefundSent(null)}>Cancel</Button><Button variant="primary" disabled={actionBusy||!snapshot.capabilities.refundManage} onClick={()=>void submitRefundSent()}>{actionBusy?"Recording…":"Mark sent"}</Button></>}>
        {refundSent&&<div className="form-grid form-grid--two"><FormField label="Provider transaction/reference" required><TextInput value={refundSentDraft.providerReference} onChange={(event)=>setRefundSentDraft({...refundSentDraft,providerReference:event.target.value})}/></FormField><FormField label="Sent at" required><TextInput type="datetime-local" value={refundSentDraft.sentAt} onChange={(event)=>setRefundSentDraft({...refundSentDraft,sentAt:event.target.value})}/></FormField><FormField label="Supplier recovery (LKR)"><TextInput type="number" min="0" step="0.01" value={refundSentDraft.supplierRecoveryLkr} onChange={(event)=>setRefundSentDraft({...refundSentDraft,supplierRecoveryLkr:event.target.value})}/></FormField><FormField label="Gateway-fee recovery (LKR)"><TextInput type="number" min="0" step="0.01" value={refundSentDraft.gatewayFeeRecoveredLkr} onChange={(event)=>setRefundSentDraft({...refundSentDraft,gatewayFeeRecoveredLkr:event.target.value})}/></FormField><div className="settings-row"><span><strong>Customer destination confirmed</strong><small>Confirm the refund was sent to the intended customer destination.</small></span><Toggle checked={refundSentDraft.destinationConfirmed} onChange={(value)=>setRefundSentDraft({...refundSentDraft,destinationConfirmed:value})}/></div>{refundError&&<div className="form-error">{refundError}</div>}</div>}
      </Modal>
      <Modal open={!!riskReview} onClose={()=>{if(!actionBusy){setRiskReview(null);setRiskError("");}}} title={riskReview?`Risk review · ${riskReview.orderNumber}`:"Risk review"} description={riskReview?`${riskReview.score}/100 · ${eventLabel(riskReview.level)} · ${riskReview.signals.length} signals`:undefined} footer={<><Button disabled={actionBusy} onClick={()=>setRiskReview(null)}>Cancel</Button><Button variant={riskDecision==="release"?"primary":"secondary"} disabled={actionBusy||!snapshot.capabilities.riskReview} onClick={()=>void submitRiskDecision()}>{actionBusy?"Applying…":riskDecision==="release"?"Release hold":"Keep on hold"}</Button></>}>
        {riskReview&&<div className="form-grid form-grid--two"><FormField label="Decision" required><SelectInput value={riskDecision} onChange={(event)=>setRiskDecision(event.target.value as "release"|"keep_hold")}><option value="release">Release for fulfillment</option><option value="keep_hold">Keep on hold</option></SelectInput></FormField><FormField label="Risk score"><TextInput value={`${riskReview.score}/100 · ${eventLabel(riskReview.level)}`} disabled/></FormField><FormField label="Operator note"><TextInput value={riskNote} onChange={(event)=>setRiskNote(event.target.value)} placeholder="Optional review context"/></FormField>{riskError&&<div className="form-error">{riskError}</div>}</div>}
      </Modal>
      <ConfirmDialog open={!!retryJob} onClose={()=>setRetryJob(null)} title="Retry fulfillment?" description={retryJob?`${snapshot.orders.find((order)=>order.orderId===retryJob.orderId)?.orderNumber??retryJob.orderId} will be re-queued through the existing Gaming supplier boundary. Existing supplier order identity is preserved when available.`:""} confirmLabel="Queue retry" onConfirm={()=>void submitFulfillmentRetry()}/>
      <ConfirmDialog open={!!completeRefund} onClose={()=>setCompleteRefund(null)} title="Complete refund?" description={completeRefund?`${completeRefund.orderNumber} · ${gamingLkr(completeRefund.amountLkr)} will be finalized in the finance ledger. The order becomes refunded only when cumulative completed refunds equal the customer payment.`:""} confirmLabel="Complete refund" onConfirm={()=>void submitRefundComplete()}/>
    </>:null}
  </div>;
}
