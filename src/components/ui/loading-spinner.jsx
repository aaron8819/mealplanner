import React from 'react';
import { Loader2 } from 'lucide-react';

export function LoadingSpinner({ size = 'md', className = '', ...props }) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  return (
    <Loader2 
      className={`animate-spin ${sizes[size]} ${className}`} 
      {...props} 
    />
  );
}

export function LoadingButton({ children, loading, disabled, ...props }) {
  return (
    <button 
      disabled={loading || disabled} 
      className={`inline-flex items-center gap-2 ${props.className || ''}`}
      {...props}
    >
      {loading && <LoadingSpinner size="sm" />}
      {children}
    </button>
  );
}

export function LoadingOverlay({ loading, children, message = "Loading..." }) {
  if (!loading) return children;

  return (
    <div className="relative">
      <div className="opacity-50 pointer-events-none">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-2">
          <LoadingSpinner size="lg" />
          <p className="text-sm text-gray-600">{message}</p>
        </div>
      </div>
    </div>
  );
}
