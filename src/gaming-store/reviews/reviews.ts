import { ProductionBackendClient } from '../../services/production/httpClient';
import { readProductionRuntimeConfig } from '../../services/production/runtime';

export type LiveGamingReview={
  reviewId:string;accountId:string;orderId:string;orderNumber:string;productId?:string;productName?:string;rating:number;title:string;text:string;publicName:string;badge:'Verified purchase';status:'pending'|'approved'|'rejected';submittedAt:string;reviewedAt?:string;reviewedBy?:string;moderationNote?:string;publishedAt?:string;
};
const runtime=readProductionRuntimeConfig();
const client=runtime.mode==='production-api'?new ProductionBackendClient(runtime.apiBaseUrl):undefined;
export async function loadGamingReviews(status:'all'|'pending'|'approved'|'rejected'='all'){
  if(!client)return {reviews:[] as LiveGamingReview[]};
  const result=await client.execute<{reviews:LiveGamingReview[]}>({operation:'staff.gaming.reviews.list',kind:'query',input:{status}});
  if(!result.ok)throw new Error(`${result.problem.code}: ${result.problem.detail}`);
  return result.data;
}
export async function decideGamingReview(reviewId:string,decision:'approved'|'rejected',note=''){
  if(!client)throw new Error('Review moderation is available only through the production CMS API.');
  const result=await client.execute<LiveGamingReview>({operation:'staff.gaming.review.decision',kind:'command',input:{reviewId,decision,note},idempotencyKey:`gaming-review-decision:${crypto.randomUUID()}`});
  if(!result.ok)throw new Error(`${result.problem.code}: ${result.problem.detail}`);
  return result.data;
}
