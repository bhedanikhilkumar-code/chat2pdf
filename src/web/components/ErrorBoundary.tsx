import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }


  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught render error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }


  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 flex items-center justify-center">
          <div className="max-w-lg w-full bg-white dark:bg-gray-800 p-xl-6 p-6 rounded-2xl border border-red-200 dark:border-red-800 shadow-lg">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <span className="text-2xl">⚠</span>
              <h3 className="text-lg font-bold">Application Error</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              An unexpected error occurred while loading this page.
            </p>
            <pre className="text-xs bg-red-50 dark:bg-red-950/50 text-red-800 dark:text-red-200 p-3 rounded-lg overflow-x-auto mb-4 font-mono">
              {this.state.error?.message || 'Unknown error'}
            </pre>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }


    return this.props.children;
  }
}
