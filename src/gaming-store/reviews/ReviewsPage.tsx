import { useEffect, useMemo, useState } from 'react';
import { Check, CircleCheck, Clock3, Inbox, RefreshCw, ShieldCheck, Star, X } from 'lucide-react';
import './reviews-page.css';
import { Badge, Button, Card, FormField, SectionHeader, StatePanel, TextInput } from '../../shared/components';
import { useToast } from '../../shared/feedback/ToastProvider';
import { decideGamingReview, loadGamingReviews, type LiveGamingReview } from './reviews';

type Filter='all'|'pending'|'approved'|'rejected';
const FILTERS: Array<{value:Filter;label:string}>=[{value:'all',label:'All'},{value:'pending',label:'Pending'},{value:'approved',label:'Approved'},{value:'rejected',label:'Rejected'}];
const tone=(status:LiveGamingReview['status'])=>status==='approved'?'success':status==='rejected'?'danger':'warning';
const fmt=(v?:string)=>v?new Date(v).toLocaleString():'—';

export function ReviewsPage(){
  const {notify}=useToast();
  const [reviews,setReviews]=useState<LiveGamingReview[]>([]);
  const [filter,setFilter]=useState<Filter>('all');
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState('');
  const [rejectingId,setRejectingId]=useState('');
  const [note,setNote]=useState('');

  const load=async()=>{
    setLoading(true);setError('');
    try{setReviews((await loadGamingReviews(filter)).reviews);}
    catch(e){setError(e instanceof Error?e.message:'Reviews could not be loaded');}
    finally{setLoading(false);}
  };
  useEffect(()=>{void load();},[filter]);

  const summary=useMemo(()=>({
    pending:reviews.filter(r=>r.status==='pending').length,
    approved:reviews.filter(r=>r.status==='approved').length,
    rejected:reviews.filter(r=>r.status==='rejected').length,
    avg:(()=>{const approved=reviews.filter(r=>r.status==='approved');return approved.length?approved.reduce((n,r)=>n+r.rating,0)/approved.length:0;})()
  }),[reviews]);

  const closeReject=()=>{setRejectingId('');setNote('');};
  const decide=async(review:LiveGamingReview,decision:'approved'|'rejected',moderationNote='')=>{
    setBusy(review.reviewId);
    try{
      await decideGamingReview(review.reviewId,decision,moderationNote);
      notify({tone:'success',title:decision==='approved'?'Review published':'Review rejected',description:decision==='approved'?'The verified review is now eligible for the public Gaming Store.':'The review will remain private.'});
      closeReject();
      await load();
    }catch(e){notify({tone:'danger',title:'Review moderation failed',description:e instanceof Error?e.message:'Please try again.'});}
    finally{setBusy('');}
  };

  return <div className="page gaming-reviews-page">
    <SectionHeader eyebrow="Gaming Store / Trust & safety" title="Customer Reviews" description="Moderate verified-purchase feedback before it appears on the storefront." action={<Button variant="secondary" onClick={()=>void load()} disabled={loading}><RefreshCw size={16}/>Refresh reviews</Button>}/>
    <div className="gaming-review-metrics" aria-label="Review summary">
      <Card className="gaming-review-metric gaming-review-metric--pending"><span className="gaming-review-metric__label"><Clock3 size={18}/>Pending</span><strong>{loading||error?'—':filter==='all'?summary.pending:filter==='pending'?reviews.length:'—'}</strong><small>Needs a decision</small></Card>
      <Card className="gaming-review-metric gaming-review-metric--approved"><span className="gaming-review-metric__label"><CircleCheck size={18}/>Approved</span><strong>{loading||error?'—':filter==='all'?summary.approved:filter==='approved'?reviews.length:'—'}</strong><small>Visible to customers</small></Card>
      <Card className="gaming-review-metric gaming-review-metric--rejected"><span className="gaming-review-metric__label"><X size={18}/>Rejected</span><strong>{loading||error?'—':filter==='all'?summary.rejected:filter==='rejected'?reviews.length:'—'}</strong><small>Kept private</small></Card>
      <Card className="gaming-review-metric gaming-review-metric--rating"><span className="gaming-review-metric__label"><Star size={18}/>Approved rating</span><strong>{!loading&&!error&&summary.avg?`${summary.avg.toFixed(1)} / 5`:'—'}</strong><small>Current loaded set</small></Card>
    </div>
    <Card className="gaming-review-queue">
      <div className="gaming-review-toolbar"><div><span className="gaming-review-toolbar__eyebrow">REVIEW WORKSPACE</span><strong>Moderation queue</strong><span>{loading?'Loading…':error?'Unavailable':`${reviews.length} review${reviews.length===1?'':'s'} in this view`}</span></div><div className="gaming-review-filter" role="group" aria-label="Review status filter">{FILTERS.map(item=><button type="button" key={item.value} className={filter===item.value?'is-active':''} aria-pressed={filter===item.value} onClick={()=>setFilter(item.value)}>{item.label}</button>)}</div></div>
      {loading?<StatePanel state="loading" title="Loading reviews" description="Reading the production moderation queue."/>:error?<div className="gaming-review-error"><StatePanel state="error" title="Reviews unavailable" description={error}/><Button variant="secondary" onClick={()=>void load()}><RefreshCw size={16}/>Retry</Button></div>:reviews.length===0?<div className="gaming-review-empty"><div className="gaming-review-empty__main"><span className="gaming-review-empty__icon"><Inbox size={26}/></span><span className="gaming-review-empty__eyebrow">ALL CAUGHT UP</span><h3>{filter==='all'?'No customer reviews yet':`No ${filter} reviews`}</h3><p>{filter==='all'?'When a customer reviews a completed purchase, it will appear here for staff moderation.':`There are no ${filter} reviews in the current queue. Try another status to see more.`}</p></div><div className="gaming-review-empty__guide"><strong>How a review goes live</strong><div><span>01</span><p>Customer submits a review for a completed purchase.</p></div><div><span>02</span><p>Staff approves or rejects it here.</p></div><div><span>03</span><p>Only approved reviews appear on the storefront.</p></div></div></div>:<div className="gaming-review-list">{reviews.map(review=><article className="gaming-review-card" key={review.reviewId}>
        <div className="gaming-review-card__top"><div><div className="gaming-review-stars" aria-label={`${review.rating} out of 5 stars`}>{[1,2,3,4,5].map(i=><Star key={i} size={15} fill={i<=review.rating?'currentColor':'none'}/>)}</div><h3>{review.title}</h3><p>{review.text}</p></div><Badge tone={tone(review.status)}>{review.status}</Badge></div>
        <div className="gaming-review-meta"><span><strong>{review.publicName}</strong> · {review.badge}</span><span>{review.productName||'Gaming purchase'}</span><span>Order {review.orderNumber}</span><span>Submitted {fmt(review.submittedAt)}</span>{review.reviewedAt&&<span>Moderated {fmt(review.reviewedAt)}</span>}</div>
        {review.moderationNote&&<div className="gaming-review-note"><strong>Moderation note</strong><span>{review.moderationNote}</span></div>}
        {review.status==='pending'&&<>
          <div className="gaming-review-actions"><Button variant="primary" disabled={busy===review.reviewId} onClick={()=>void decide(review,'approved')}><Check size={14}/>Approve & publish</Button><Button variant="secondary" disabled={busy===review.reviewId} onClick={()=>{setRejectingId(review.reviewId);setNote('');}}><X size={14}/>Reject</Button></div>
          {rejectingId===review.reviewId&&<div className="gaming-review-inline-reject" aria-label="Reject customer review"><div><strong>Reject this review</strong><p>The review will remain private. Add an internal reason for future staff.</p></div><FormField label="Moderation note"><TextInput autoFocus value={note} onChange={e=>setNote(e.target.value)} placeholder="Example: contains personal information or unrelated content"/></FormField><div className="gaming-review-inline-reject__actions"><Button variant="secondary" onClick={closeReject} disabled={busy===review.reviewId}>Cancel</Button><Button variant="secondary" className="gaming-review-reject-button" onClick={()=>void decide(review,'rejected',note)} disabled={busy===review.reviewId}>{busy===review.reviewId?'Rejecting…':'Reject review'}</Button></div></div>}
        </>}
      </article>)}</div>}
    </Card>
    <div className="gaming-review-policy"><ShieldCheck size={18}/><span><strong>Verified-purchase protection</strong> Reviews start private. Staff can moderate customer submissions but cannot create a “Verified purchase” review.</span></div>
  </div>;
}
