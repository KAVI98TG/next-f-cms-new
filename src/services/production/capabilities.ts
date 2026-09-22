import { readRuntimeTruth } from "./runtime";

export type ExternalCapability =
  | "gaming.public-storefront"
  | "gaming.payment"
  | "gaming.supplier-fulfillment"
  | "gaming.live-pricing"
  | "software.payment"
  | "software.license-delivery"
  | "software.update-service"
  | "digital.site-check"
  | "digital.workflow-execution";

export type CapabilityReadiness = {
  capability: ExternalCapability;
  available: boolean;
  simulation: boolean;
  label: string;
  detail: string;
  href?: string;
};

const labels: Record<ExternalCapability,string> = {
  "gaming.public-storefront":"Gaming public storefront",
  "gaming.payment":"Gaming payment gateway",
  "gaming.supplier-fulfillment":"Gaming supplier fulfillment",
  "gaming.live-pricing":"Gaming live pricing",
  "software.payment":"Software payment gateway",
  "software.license-delivery":"Software license delivery",
  "software.update-service":"Software update service",
  "digital.site-check":"Digital site checks",
  "digital.workflow-execution":"Digital workflow execution",
};

export function readExternalCapability(capability: ExternalCapability): CapabilityReadiness {
  const runtime=readRuntimeTruth();
  if(runtime.allowsSimulation){
    return { capability, available:true, simulation:true, label:labels[capability], detail:"Local simulation", href: capability === "gaming.public-storefront" ? "/gaming" : undefined };
  }
  if(capability === "gaming.public-storefront") {
    const configured=(import.meta.env as Record<string,string|undefined>).VITE_GAMING_STOREFRONT_URL?.trim();
    if(configured){
      try {
        const url=new URL(configured);
        if(url.protocol === "https:") return { capability, available:true, simulation:false, label:labels[capability], detail:"Production storefront connected", href:url.toString() };
      } catch { /* fail closed below */ }
    }
  }
  return { capability, available:false, simulation:false, label:labels[capability], detail:"Integration not connected" };
}
