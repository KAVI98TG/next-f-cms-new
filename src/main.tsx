import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { RouterProvider } from "./app/router/RouterProvider";
import { SessionProvider } from "./app/auth/SessionProvider";
import { AppErrorBoundary } from "./shared/components";
import { ToastProvider } from "./shared/feedback/ToastProvider";
import { ThemeProvider } from "./app/theme/ThemeProvider";
import { initializeDurableStorage, initializeProductionStaffSession } from "./services/production";
import "./css/index.css";

const rootElement = document.getElementById("root")!;

async function bootstrap() {
  await initializeProductionStaffSession();
  await initializeDurableStorage();
  createRoot(rootElement).render(<StrictMode><AppErrorBoundary><ThemeProvider><ToastProvider><SessionProvider><RouterProvider><App /></RouterProvider></SessionProvider></ToastProvider></ThemeProvider></AppErrorBoundary></StrictMode>);
}

bootstrap().catch((error) => {
  const detail = error instanceof Error ? error.message : "The production data service could not be initialized.";
  rootElement.innerHTML = `<main style="max-width:760px;margin:12vh auto;padding:24px;font-family:Inter,system-ui,sans-serif"><h1>NEXT F CMS could not start</h1><p>The CMS failed closed because its verified staff identity or durable backend is unavailable.</p><pre style="white-space:pre-wrap;padding:14px;border:1px solid #d7dde7;border-radius:12px">${detail.replace(/[&<>"']/g,(value)=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[value]||value))}</pre></main>`;
});
