import { AlertTriangle, Inbox, LoaderCircle, RotateCcw } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./Button";

export function StatePanel({ state, title, description, action }: { state: "empty" | "loading" | "error"; title: string; description: string; action?: ReactNode }) {
  const Icon = state === "loading" ? LoaderCircle : state === "error" ? AlertTriangle : Inbox;
  return <div className={`state-panel state-panel--${state}`} role={state === "error" ? "alert" : "status"}><Icon size={26} className={state === "loading" ? "is-spinning" : ""}/><strong>{title}</strong><p>{description}</p>{action}</div>;
}

export function RetryState({ onRetry }: { onRetry: () => void }) { return <StatePanel state="error" title="Something went wrong" description="The local module could not be rendered. Retry the operation or return to another workspace." action={<Button onClick={onRetry}><RotateCcw size={15}/>Retry</Button>} />; }
