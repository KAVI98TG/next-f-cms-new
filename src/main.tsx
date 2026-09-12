import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { RouterProvider } from "./app/router/RouterProvider";
import { SessionProvider } from "./app/auth/SessionProvider";
import { AppErrorBoundary } from "./shared/components";
import { ToastProvider } from "./shared/feedback/ToastProvider";
import "./css/index.css";

createRoot(document.getElementById("root")!).render(<StrictMode><AppErrorBoundary><ToastProvider><SessionProvider><RouterProvider><App /></RouterProvider></SessionProvider></ToastProvider></AppErrorBoundary></StrictMode>);
