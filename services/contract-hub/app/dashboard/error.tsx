'use client';

import { useEffect, useState } from 'react';

interface ErrorPageProps {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}

export default function ErrorPage({ error, unstable_retry }: ErrorPageProps) {
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Log the error to console for debugging
    console.error('Dashboard Error:', error);
  }, [error]);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-gray-900 rounded-xl border border-gray-800 shadow-xl overflow-hidden">
        {/* Header with branding */}
        <div className="bg-gray-800/50 px-6 py-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Contract Hub</h1>
              <p className="text-xs text-gray-400">Something went wrong</p>
            </div>
          </div>
        </div>

        {/* Error content */}
        <div className="px-6 py-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              Connection failed
            </h2>
            <p className="text-gray-400 text-sm">
              Something went wrong while loading this page. 
              Please try again or contact support if the problem persists.
            </p>
          </div>

          {/* Try Again Button */}
          <button
            onClick={unstable_retry}
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Try Again
          </button>

          {/* Error Details Toggle */}
          <div className="mt-4">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="w-full py-2 px-4 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <svg 
                className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              {showDetails ? 'Hide Error Details' : 'Show Error Details'}
            </button>

            {showDetails && (
              <div className="mt-3 p-4 bg-gray-950 rounded-lg border border-gray-800">
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-500">Error Message:</span>
                    <p className="text-red-400 font-mono mt-1 break-all">{error.message}</p>
                  </div>
                  {error.digest && (
                    <div>
                      <span className="text-gray-500">Error ID:</span>
                      <p className="text-gray-400 font-mono mt-1">{error.digest}</p>
                    </div>
                  )}
                  {error.stack && (
                    <div>
                      <span className="text-gray-500">Stack Trace:</span>
                      <pre className="text-gray-400 font-mono mt-1 text-xs overflow-x-auto whitespace-pre-wrap">
                        {error.stack}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-gray-800/30 border-t border-gray-800">
          <p className="text-xs text-gray-500 text-center">
            Corporate Carbon Group Australia
          </p>
        </div>
      </div>
    </div>
  );
}
