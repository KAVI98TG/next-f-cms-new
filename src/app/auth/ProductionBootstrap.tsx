import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, KeyRound, LoaderCircle, LockKeyhole, RefreshCcw, ShieldCheck } from "lucide-react";
import { initializeDurableStorage, initializeProductionStaffSession, readProductionRuntimeConfig, resetDurableStorageInitialization, resetProductionStaffSessionInitialization } from "../../services/production";

const runtime = readProductionRuntimeConfig();

type BootstrapState = "loading" | "ready" | "error";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "The verified staff session or durable backend could not be initialized.";
}

function LoginPanel({ error, onRetry }: { error: string; onRetry: () => void }) {
  const authorizeUrl = useMemo(() => runtime.mode === "production-api" ? `${runtime.apiBaseUrl}/auth/complete` : "", []);
  return <main className="auth-screen">
    <section className="auth-panel" aria-labelledby="auth-title">
      <div className="auth-brand"><img src="/brand/next-f-mark.svg" alt="NEXT F"/><span>NEXT F CMS</span></div>
      <div className="auth-icon"><LockKeyhole size={23}/></div>
      <span className="auth-eyebrow">Secure staff access</span>
      <h1 id="auth-title">Verify your production session</h1>
      <p className="auth-copy">NEXT F CMS requires a verified Cloudflare Access identity and an active server-side staff binding before any production data is loaded.</p>
      <div className="auth-status auth-status--error" role="alert"><AlertTriangle size={17}/><span><strong>Session verification needs attention</strong><small>{error}</small></span></div>
      <div className="auth-actions">
        {authorizeUrl && <a className="button button--primary auth-button" href={authorizeUrl}><KeyRound size={16}/>Continue with secure login<ArrowRight size={16}/></a>}
        <button className="button auth-button" type="button" onClick={onRetry}><RefreshCcw size={16}/>Retry verification</button>
      </div>
      <div className="auth-assurance">
        <div><ShieldCheck size={16}/><span><strong>Cloudflare Access</strong><small>MFA and application policy remain the authentication boundary.</small></span></div>
        <div><CheckCircle2 size={16}/><span><strong>Fail closed</strong><small>No local staff impersonation or prototype data fallback is permitted in production.</small></span></div>
      </div>
      <footer><span>{runtime.environment.toUpperCase()}</span><span>{runtime.apiBaseUrl || "Local prototype"}</span></footer>
    </section>
  </main>;
}

function LoadingPanel() {
  return <main className="auth-screen"><section className="auth-panel auth-panel--loading" aria-live="polite">
    <div className="auth-brand"><img src="/brand/next-f-mark.svg" alt="NEXT F"/><span>NEXT F CMS</span></div>
    <div className="auth-icon"><LoaderCircle className="auth-spinner" size={24}/></div>
    <span className="auth-eyebrow">Production verification</span>
    <h1>Securing your workspace</h1>
    <p className="auth-copy">Verifying staff identity, permissions and the durable production backend before the CMS opens.</p>
    <div className="auth-progress"><span/><span/><span/></div>
  </section></main>;
}

export function ProductionBootstrap({ children }: { children: ReactNode }) {
  const [state, setState] = useState<BootstrapState>("loading");
  const [error, setError] = useState("");

  const initialize = useCallback(async () => {
    setState("loading"); setError("");
    try {
      await initializeProductionStaffSession();
      await initializeDurableStorage();
      setState("ready");
    } catch (cause) {
      setError(errorMessage(cause));
      setState("error");
    }
  }, []);

  const retry = useCallback(() => {
    resetProductionStaffSessionInitialization();
    resetDurableStorageInitialization();
    void initialize();
  }, [initialize]);

  useEffect(() => { void initialize(); }, [initialize]);
  if (state === "loading") return <LoadingPanel/>;
  if (state === "error") return <LoginPanel error={error} onRetry={retry}/>;
  return children;
}
