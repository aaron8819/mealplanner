import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from './button';

export function ConfirmationDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Confirm Action",
  message = "Are you sure you want to proceed?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "destructive",
  loading = false
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Dialog */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
          </div>
          
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {title}
            </h3>
            <p className="text-gray-600 mb-4">
              {message}
            </p>
            
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                {cancelText}
              </Button>
              <Button
                variant={variant}
                onClick={onConfirm}
                disabled={loading}
              >
                {loading ? 'Processing...' : confirmText}
              </Button>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function useConfirmation() {
  const [dialog, setDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    variant: 'destructive'
  });

  const confirm = (options) => {
    return new Promise((resolve) => {
      setDialog({
        isOpen: true,
        title: options.title || "Confirm Action",
        message: options.message || "Are you sure?",
        variant: options.variant || 'destructive',
        onConfirm: () => {
          setDialog(prev => ({ ...prev, isOpen: false }));
          resolve(true);
        }
      });
    });
  };

  const close = () => {
    setDialog(prev => ({ ...prev, isOpen: false }));
  };

  const ConfirmationComponent = () => (
    <ConfirmationDialog
      {...dialog}
      onClose={close}
    />
  );

  return { confirm, ConfirmationComponent };
}
