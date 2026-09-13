import { Component, type ErrorInfo, type ReactNode } from "react";
import { RetryState } from "./StatePanel";

type AppErrorBoundaryProps = {
  children: ReactNode;
  resetKey?: string;
  scope?: "app" | "route";
};

type AppErrorBoundaryState = { failed: boolean };

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("NEXT F CMS render error", error, info);
  }

  componentDidUpdate(previous: AppErrorBoundaryProps) {
    if (this.state.failed && previous.resetKey !== this.props.resetKey) {
      this.setState({ failed: false });
    }
  }

  render() {
    if (!this.state.failed) return this.props.children;
    const routeScoped = this.props.scope === "route";
    return (
      <div className={routeScoped ? "route-error-boundary" : "page page--center"}>
        <RetryState onRetry={() => this.setState({ failed: false })} />
      </div>
    );
  }
}
