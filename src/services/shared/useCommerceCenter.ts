import { useEffect, useState } from "react";
import { commerceCenter } from "./commerceCenter";

export function useCommerceAccounts() {
  const [value, setValue] = useState(() => commerceCenter.getAccounts());
  useEffect(() => { const refresh = () => setValue(commerceCenter.getAccounts()); const events=["storage","nextf:digital-store","nextf:gaming-store","nextf:software-store"]; events.forEach((event)=>window.addEventListener(event,refresh as EventListener)); return()=>events.forEach((event)=>window.removeEventListener(event,refresh as EventListener)); }, []);
  return value;
}
export function useCommercePayments() {
  const [value, setValue] = useState(() => commerceCenter.getPayments());
  useEffect(() => { const refresh = () => setValue(commerceCenter.getPayments()); const events=["storage","nextf:digital-store","nextf:gaming-store","nextf:software-store"]; events.forEach((event)=>window.addEventListener(event,refresh as EventListener)); return()=>events.forEach((event)=>window.removeEventListener(event,refresh as EventListener)); }, []);
  return value;
}
