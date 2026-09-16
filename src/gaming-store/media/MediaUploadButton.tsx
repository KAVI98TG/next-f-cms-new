import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "../../shared/components";
import { mediaUploadsAvailable, uploadMediaFile, type MediaOwner, type MediaPurpose, type ReadyMediaAsset } from "./media";

type Props={purpose:MediaPurpose;owner:MediaOwner;accept?:string;label?:string;disabled?:boolean;onUploaded:(asset:ReadyMediaAsset)=>void|Promise<void>;onError?:(message:string)=>void};
export function MediaUploadButton({purpose,owner,accept="image/jpeg,image/png,image/webp,image/gif",label="Upload media",disabled,onUploaded,onError}:Props){
  const input=useRef<HTMLInputElement>(null);const [busy,setBusy]=useState(false);
  const pick=async(file?:File)=>{if(!file)return;setBusy(true);try{const asset=await uploadMediaFile(file,purpose,owner);await onUploaded(asset);}catch(error){onError?.(error instanceof Error?error.message:"Media upload failed.");}finally{setBusy(false);if(input.current)input.current.value="";}};
  return <><input ref={input} className="visually-hidden" type="file" accept={accept} onChange={(event)=>void pick(event.target.files?.[0])}/><Button type="button" disabled={disabled||busy||!mediaUploadsAvailable} onClick={()=>input.current?.click()}><Upload size={14}/>{busy?"Uploading…":label}</Button></>;
}
