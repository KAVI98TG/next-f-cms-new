export type ProductionRuntimeConfig = {
  apiBaseUrl: string;
  environment: "local" | "staging" | "production";
  mode: "local-prototype" | "production-api";
  isProduction: boolean;
  isStaging: boolean;
  isLocal: boolean;
  backendMode: "local-prototype" | "production-api";
  authMode: "local-preview" | "cloudflare-access";
  label: string;
};

export function readProductionRuntimeConfig(): ProductionRuntimeConfig {
  const env = import.meta.env as Record<string, string | undefined>;
  const apiBaseUrl = (env.VITE_NEXTF_API_BASE_URL || "").replace(/\/$/, "");
  const rawEnvironment = env.VITE_NEXTF_ENVIRONMENT || "local";
  const environment = (["local", "staging", "production"].includes(rawEnvironment) ? rawEnvironment : "local") as ProductionRuntimeConfig["environment"];
  const requested = env.VITE_NEXTF_BACKEND_MODE === "production-api";
  if (requested && !apiBaseUrl) throw new Error("VITE_NEXTF_API_BASE_URL is required when production backend mode is enabled");
  const mode: ProductionRuntimeConfig["mode"] = requested ? "production-api" : "local-prototype";
  const isProduction = environment === "production" && mode === "production-api";
  const isStaging = environment === "staging";
  const isLocal = !isProduction && !isStaging;
  const label = isProduction ? "Production" : isStaging ? "Staging" : "Local preview";
  return { apiBaseUrl, environment, mode, isProduction, isStaging, isLocal, backendMode: mode, authMode: mode === "production-api" ? "cloudflare-access" : "local-preview", label };
}

export function getEnvironmentLabel(config = readProductionRuntimeConfig()) {
  return config.label;
}

export function signOutStaffSession() {
  const config = readProductionRuntimeConfig();
  if (config.mode === "production-api") {
    window.location.assign("/cdn-cgi/access/logout");
    return;
  }
  window.location.reload();
}