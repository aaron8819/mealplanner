import React from 'react';
import { AlertCircle, X } from 'lucide-react';

export function ErrorMessage({ 
  message, 
  onDismiss, 
  variant = 'error',
  className = '',
  ...props 
}) {
  if (!message) return null;

  const variants = {
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800'
  };

  return (
    <div 
      className={`flex items-center gap-2 p-3 border rounded-md ${variants[variant]} ${className}`}
      {...props}
    >
      <AlertCircle className="w-4 h-4 flex-shrink-0" />
      <span className="flex-1 text-sm">{message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="flex-shrink-0 hover:opacity-70 transition-opacity"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export function ErrorBoundary({ children, fallback }) {
  const [hasError, setHasError] = React.useState(false);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    const handleError = (error) => {
      setHasError(true);
      setError(error);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleError);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleError);
    };
  }, []);

  if (hasError) {
    return fallback || (
      <ErrorMessage 
        message="Something went wrong. Please refresh the page and try again."
        variant="error"
      />
    );
  }

  return children;
}
