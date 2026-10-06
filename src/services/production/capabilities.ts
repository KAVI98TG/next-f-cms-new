import { readRuntimeTruth } from "./runtime";

export type ExternalCapability =
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
  "software.payment":"Software payment gateway",
  "software.license-delivery":"Software license delivery",
  "software.update-service":"Software update service",
  "digital.site-check":"Digital site checks",
  "digital.workflow-execution":"Digital workflow execution",
};

export function readExternalCapability(capability: ExternalCapability): CapabilityReadiness {
  const runtime=readRuntimeTruth();
  if(runtime.allowsSimulation){
    return { capability, available:true, simulation:true, label:labels[capability], detail:"Local simulation" };
  }
  return { capability, available:false, simulation:false, label:labels[capability], detail:"Integration not connected" };
}