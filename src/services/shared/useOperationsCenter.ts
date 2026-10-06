import { useEffect, useState } from "react";
import { useSession } from "../../app/auth/SessionProvider";
import type { PlatformNotification } from "../../platform/services/platformStore";
import { getOperationsNotifications } from "./operationsCenter";

export function useOperationsCenter(){
  const { user }=useSession();
  const [items,setItems]=useState<PlatformNotification[]>(()=>getOperationsNotifications(user.id));
  useEffect(()=>{
    const refresh=()=>setItems(getOperationsNotifications(user.id));
    const events=["storage","nextf:platform-store","nextf:digital-store","nextf:software-store","nextf:operations-center","nextf:durable-state"];
    refresh();
    events.forEach((name)=>window.addEventListener(name,refresh as EventListener));
    return()=>events.forEach((name)=>window.removeEventListener(name,refresh as EventListener));
  },[user.id]);
  return items;
}
