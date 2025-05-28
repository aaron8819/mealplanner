import React from 'react';
import { Loader2 } from 'lucide-react';
import styles from './LoadingSpinner/LoadingSpinner.module.css';

export function LoadingSpinner({ size = 'md', className = '', ...props }) {
  const spinnerClasses = [
    styles.spinner,
    styles[size],
    className
  ].filter(Boolean).join(' ');

  return (
    <Loader2
      className={spinnerClasses}
      {...props}
    />
  );
}

export function LoadingButton({ children, loading, disabled, className = '', ...props }) {
  const buttonClasses = [
    styles.loadingButton,
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      disabled={loading || disabled}
      className={buttonClasses}
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
