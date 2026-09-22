import { ProductionBackendClient } from "../../services/production/httpClient";
import { readProductionRuntimeConfig } from "../../services/production/runtime";

export type MediaPurpose="gaming_product_artwork"|"gaming_family_artwork"|"gaming_family_hero"|"gaming_storefront_hero"|"gaming_storefront_video"|"support_evidence";
export type ReadyMediaAsset={assetId:string;purpose:MediaPurpose;visibility:"public"|"private";status:"ready";objectKey:string;fileName:string;contentType:string;declaredSizeBytes:number;sizeBytes:number;etag?:string;publicUrl?:string;owner:{type:string;id:string;orderId?:string};createdAt:string;createdBy:string;uploadExpiresAt:string;finalizedAt:string};
export type MediaOwner={ownerId:string;orderId?:string};
const runtime=readProductionRuntimeConfig();
const client=runtime.mode==="production-api"?new ProductionBackendClient(runtime.apiBaseUrl):undefined;

async function command<T>(operation:string,input:Record<string,unknown>){
  if(!client)throw new Error("NEXT F Media uploads are available only through the production CMS API.");
  const result=await client.execute<T>({operation,kind:"command",input,idempotencyKey:`media:${crypto.randomUUID()}`});
  if(!result.ok)throw new Error(`${result.problem.code}: ${result.problem.detail}`);
  return result.data;
}
export async function uploadMediaFile(file:File,purpose:MediaPurpose,owner:MediaOwner):Promise<ReadyMediaAsset>{
  const created=await command<{assetId:string;uploadUrl:string;expiresAt:string;contentType:string;publicUrl?:string}>("staff.media.upload.create",{purpose,fileName:file.name,contentType:file.type,sizeBytes:file.size,...owner});
  const uploaded=await fetch(created.uploadUrl,{method:"PUT",headers:{"Content-Type":created.contentType},body:file});
  if(!uploaded.ok)throw new Error(`R2_UPLOAD_FAILED: Direct media upload failed with HTTP ${uploaded.status}.`);
  return command<ReadyMediaAsset>("staff.media.upload.finalize",{assetId:created.assetId});
}
export function privateMediaDownloadUrl(assetId:string){return `${runtime.apiBaseUrl.replace(/\/$/,"")}/v1/staff/media/${encodeURIComponent(assetId)}/download`;}
export const mediaUploadsAvailable=runtime.mode==="production-api";
