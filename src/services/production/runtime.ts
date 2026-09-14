export type ProductionRuntimeConfig = {
  apiBaseUrl: string;
  environment: "local" | "staging" | "production";
  mode: "local-prototype" | "production-api";
};

export type RuntimeTruth = ProductionRuntimeConfig & {
  isProduction: boolean;
  isStaging: boolean;
  isLocal: boolean;
  environmentLabel: "Production" | "Staging" | "Local development";
  authMode: "cloudflare-access" | "local-development";
  allowsSimulation: boolean;
};

export function readProductionRuntimeConfig(): ProductionRuntimeConfig {
  const env = import.meta.env as Record<string,string|undefined>;
  const apiBaseUrl=(env.VITE_NEXTF_API_BASE_URL||"").replace(/\/$/,"");
  const environment=(env.VITE_NEXTF_ENVIRONMENT||"local") as ProductionRuntimeConfig["environment"];
  const requested=env.VITE_NEXTF_BACKEND_MODE==="production-api";
  if(requested&&!apiBaseUrl) throw new Error("VITE_NEXTF_API_BASE_URL is required when production backend mode is enabled");
  return { apiBaseUrl, environment, mode: requested?"production-api":"local-prototype" };
}

export function readRuntimeTruth(): RuntimeTruth {
  const config=readProductionRuntimeConfig();
  const isProduction=config.environment==="production"&&config.mode==="production-api";
  const isStaging=config.environment==="staging";
  const isLocal=config.mode==="local-prototype"||config.environment==="local";
  return {
    ...config,
    isProduction,
    isStaging,
    isLocal,
    environmentLabel:isProduction?"Production":isStaging?"Staging":"Local development",
    authMode:config.mode==="production-api"?"cloudflare-access":"local-development",
    allowsSimulation:config.mode==="local-prototype",
  };
}

export function assertLocalPrototype(feature: string) {
  const runtime=readRuntimeTruth();
  if(!runtime.allowsSimulation) throw new Error(`${feature} is available only in local prototype mode`);
}
