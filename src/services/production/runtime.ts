export type ProductionRuntimeConfig = {
  apiBaseUrl: string;
  environment: "local" | "staging" | "production";
  mode: "local-prototype" | "production-api";
};
export function readProductionRuntimeConfig(): ProductionRuntimeConfig {
  const env = import.meta.env as Record<string,string|undefined>;
  const apiBaseUrl=(env.VITE_NEXTF_API_BASE_URL||"").replace(/\/$/,"");
  const environment=(env.VITE_NEXTF_ENVIRONMENT||"local") as ProductionRuntimeConfig["environment"];
  const requested=env.VITE_NEXTF_BACKEND_MODE==="production-api";
  if(requested&&!apiBaseUrl) throw new Error("VITE_NEXTF_API_BASE_URL is required when production backend mode is enabled");
  return { apiBaseUrl, environment, mode: requested?"production-api":"local-prototype" };
}
