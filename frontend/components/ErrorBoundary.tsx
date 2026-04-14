"use client";

import { Component, ReactNode } from "react";

interface Props { children: ReactNode; }
interface State { hasError: boolean; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("ErrorBoundary caught:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
            <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <div>
            <p className="text-[14px] font-semibold text-gray-800 mb-1">Something went wrong</p>
            <p className="text-[12px] text-gray-400">Please reload the page to try again.</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="text-[12.5px] font-medium text-white bg-[#3b6cf5] hover:bg-[#2b5ce0] px-4 py-2.5 rounded-xl transition-colors min-h-[44px]"
          >
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
