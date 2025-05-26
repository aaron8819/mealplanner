import { useEffect } from 'react';

export function useKeyboardShortcuts(shortcuts) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Don't trigger shortcuts when typing in inputs
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
      }

      const key = event.key.toLowerCase();
      const ctrl = event.ctrlKey || event.metaKey;
      const shift = event.shiftKey;
      const alt = event.altKey;

      for (const shortcut of shortcuts) {
        const matches = 
          shortcut.key === key &&
          !!shortcut.ctrl === ctrl &&
          !!shortcut.shift === shift &&
          !!shortcut.alt === alt;

        if (matches) {
          event.preventDefault();
          shortcut.action();
          break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}

// Common keyboard shortcuts
export const SHORTCUTS = {
  ADD_RECIPE: { key: 'n', ctrl: true, description: 'Add new recipe' },
  SEARCH: { key: 'f', ctrl: true, description: 'Focus search' },
  RESET: { key: 'r', ctrl: true, shift: true, description: 'Reset all data' },
  SAVE: { key: 's', ctrl: true, description: 'Save current recipe' },
  ESCAPE: { key: 'escape', description: 'Cancel current action' }
};
