import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[React ErrorBoundary caught error]:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#06070b] flex flex-col items-center justify-center p-6 text-center select-none">
          <div className="w-16 h-16 rounded-3xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center mb-6 shadow-2xl">
            <AlertTriangle size={32} />
          </div>

          <h1 className="text-xl font-black text-white tracking-tight font-sans mb-2">
            Something went wrong
          </h1>
          
          <p className="text-xs text-slate-400 max-w-xs mb-8 leading-relaxed font-medium font-sans">
            {this.state.error?.message || 'An unexpected rendering error occurred.'}
          </p>

          <button
            onClick={this.handleReset}
            className="px-6 py-3.5 rounded-2xl bg-usdt-green text-[#06070b] font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-usdt-green/20 hover:brightness-110 press-feedback transition-all"
          >
            <RefreshCw size={16} />
            <span>Reload Application</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
