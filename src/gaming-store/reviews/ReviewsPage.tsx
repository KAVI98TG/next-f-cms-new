import { useEffect, useMemo, useState } from 'react';
import { Check, RefreshCw, ShieldCheck, Star, X } from 'lucide-react';
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

  return <div className="page-stack gaming-reviews-page">
    <SectionHeader eyebrow="Gaming Store" title="Customer Reviews" description="Customers with a completed purchase submit verified reviews. Nothing publishes until staff approves it here." action={<Button variant="secondary" onClick={()=>void load()} disabled={loading}><RefreshCw size={14}/>Refresh</Button>}/>
    <div className="gaming-review-metrics"><Card><span>Pending</span><strong>{filter==='all'?summary.pending:filter==='pending'?reviews.length:'—'}</strong><small>Awaiting moderation</small></Card><Card><span>Approved</span><strong>{filter==='all'?summary.approved:filter==='approved'?reviews.length:'—'}</strong><small>Public trust proof</small></Card><Card><span>Rejected</span><strong>{filter==='all'?summary.rejected:filter==='rejected'?reviews.length:'—'}</strong><small>Never published</small></Card><Card><span>Approved rating</span><strong>{summary.avg?`${summary.avg.toFixed(1)} / 5`:'—'}</strong><small>Current loaded set</small></Card></div>
    <Card className="gaming-review-trust-note"><ShieldCheck size={18}/><div><strong>Moderated verified-purchase workflow</strong><p>Submission → pending CMS review → approval → automatic public availability. Rejected reviews stay private; staff cannot manufacture a “Verified purchase” review.</p></div></Card>
    <Card>
      <div className="gaming-review-toolbar"><div><strong>Moderation queue</strong><span>{reviews.length} review{reviews.length===1?'':'s'}</span></div><div className="gaming-review-filter" role="group" aria-label="Review status filter">{FILTERS.map(item=><button type="button" key={item.value} className={filter===item.value?'is-active':''} aria-pressed={filter===item.value} onClick={()=>setFilter(item.value)}>{item.label}</button>)}</div></div>
      {loading?<StatePanel state="loading" title="Loading reviews" description="Reading the production moderation queue."/>:error?<div className="gaming-review-error"><StatePanel state="error" title="Reviews unavailable" description={error}/><Button variant="secondary" onClick={()=>void load()}><RefreshCw size={14}/>Retry</Button></div>:reviews.length===0?<StatePanel state="empty" title="No reviews in this view" description="Customer reviews will appear here after a completed buyer submits one."/>:<div className="gaming-review-list">{reviews.map(review=><article className="gaming-review-card" key={review.reviewId}>
        <div className="gaming-review-card__top"><div><div className="gaming-review-stars" aria-label={`${review.rating} out of 5 stars`}>{[1,2,3,4,5].map(i=><Star key={i} size={15} fill={i<=review.rating?'currentColor':'none'}/>)}</div><h3>{review.title}</h3><p>{review.text}</p></div><Badge tone={tone(review.status)}>{review.status}</Badge></div>
        <div className="gaming-review-meta"><span><strong>{review.publicName}</strong> · {review.badge}</span><span>{review.productName||'Gaming purchase'}</span><span>Order {review.orderNumber}</span><span>Submitted {fmt(review.submittedAt)}</span>{review.reviewedAt&&<span>Moderated {fmt(review.reviewedAt)}</span>}</div>
        {review.moderationNote&&<div className="gaming-review-note"><strong>Moderation note</strong><span>{review.moderationNote}</span></div>}
        {review.status==='pending'&&<>
          <div className="gaming-review-actions"><Button variant="primary" disabled={busy===review.reviewId} onClick={()=>void decide(review,'approved')}><Check size={14}/>Approve & publish</Button><Button variant="secondary" disabled={busy===review.reviewId} onClick={()=>{setRejectingId(review.reviewId);setNote('');}}><X size={14}/>Reject</Button></div>
          {rejectingId===review.reviewId&&<div className="gaming-review-inline-reject" aria-label="Reject customer review"><div><strong>Reject this review</strong><p>The review will remain private. Add an internal reason for future staff.</p></div><FormField label="Moderation note"><TextInput autoFocus value={note} onChange={e=>setNote(e.target.value)} placeholder="Example: contains personal information or unrelated content"/></FormField><div className="gaming-review-inline-reject__actions"><Button variant="secondary" onClick={closeReject} disabled={busy===review.reviewId}>Cancel</Button><Button variant="secondary" className="gaming-review-reject-button" onClick={()=>void decide(review,'rejected',note)} disabled={busy===review.reviewId}>{busy===review.reviewId?'Rejecting…':'Reject review'}</Button></div></div>}
        </>}
      </article>)}</div>}
    </Card>
  </div>;
}
