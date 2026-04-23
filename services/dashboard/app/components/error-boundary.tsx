"use client";

import { Component, type ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--status-error)]/20 bg-[var(--status-error)]/10">
            <AlertCircle size={24} className="text-[var(--status-error)]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Something went wrong</h2>
            <p className="mt-1 max-w-md text-sm text-[var(--text-secondary)]">
              {this.state.error?.message ?? "An unexpected error occurred."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false })}
            className="carbon-button carbon-button-secondary"
          >
            <RefreshCw size={16} />
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
