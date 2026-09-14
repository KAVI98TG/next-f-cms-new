import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { RouterProvider } from "./app/router/RouterProvider";
import { SessionProvider } from "./app/auth/SessionProvider";
import { ProductionBootstrap } from "./app/auth/ProductionBootstrap";
import { AppErrorBoundary } from "./shared/components";
import { ToastProvider } from "./shared/feedback/ToastProvider";
import { ThemeProvider } from "./app/theme/ThemeProvider";
import "./css/index.css";

const rootElement = document.getElementById("root")!;
createRoot(rootElement).render(
  <StrictMode>
    <AppErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <ProductionBootstrap>
            <SessionProvider>
              <RouterProvider><App /></RouterProvider>
            </SessionProvider>
          </ProductionBootstrap>
        </ToastProvider>
      </ThemeProvider>
    </AppErrorBoundary>
  </StrictMode>
);
