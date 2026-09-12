import { Component, type ErrorInfo, type ReactNode } from "react";
import { RetryState } from "./StatePanel";

export class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error("NEXT F CMS render error", error, info); }
  render() { return this.state.failed ? <div className="page page--center"><RetryState onRetry={() => this.setState({ failed: false })}/></div> : this.props.children; }
}
