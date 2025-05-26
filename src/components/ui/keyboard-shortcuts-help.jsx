import React, { useState } from 'react';
import { Keyboard, X } from 'lucide-react';
import { Button } from './button';
import { SHORTCUTS } from '@/hooks/useKeyboardShortcuts';

export function KeyboardShortcutsHelp() {
  const [isOpen, setIsOpen] = useState(false);

  const formatShortcut = (shortcut) => {
    const keys = [];
    if (shortcut.ctrl) keys.push('Ctrl');
    if (shortcut.shift) keys.push('Shift');
    if (shortcut.alt) keys.push('Alt');
    keys.push(shortcut.key.toUpperCase());
    return keys.join(' + ');
  };

  if (!isOpen) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-40 bg-white shadow-lg border"
        title="Keyboard shortcuts"
      >
        <Keyboard className="w-4 h-4" />
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
      />
      
      {/* Dialog */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Keyboard className="w-5 h-5" />
            Keyboard Shortcuts
          </h3>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="space-y-3">
          {Object.entries(SHORTCUTS).map(([key, shortcut]) => (
            <div key={key} className="flex justify-between items-center">
              <span className="text-sm text-gray-600">{shortcut.description}</span>
              <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">
                {formatShortcut(shortcut)}
              </kbd>
            </div>
          ))}
        </div>
        
        <div className="mt-4 pt-4 border-t text-xs text-gray-500">
          <p>Note: Shortcuts don't work when typing in input fields.</p>
        </div>
      </div>
    </div>
  );
}
