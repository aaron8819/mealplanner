import React, { useState } from 'react';
import { Keyboard, X } from 'lucide-react';
import { Button } from './button';
import { SHORTCUTS } from '@/hooks/useKeyboardShortcuts';
import styles from './KeyboardShortcutsHelp/KeyboardShortcutsHelp.module.css';

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
        className={styles.triggerButton}
        title="Keyboard shortcuts"
      >
        <Keyboard className={styles.triggerIcon} />
      </Button>
    );
  }

  return (
    <div className={styles.overlay}>
      {/* Backdrop */}
      <div
        className={styles.backdrop}
        onClick={() => setIsOpen(false)}
      />

      {/* Dialog */}
      <div className={styles.dialog}>
        <div className={styles.header}>
          <h3 className={styles.title}>
            <Keyboard className={styles.titleIcon} />
            Keyboard Shortcuts
          </h3>
          <button
            onClick={() => setIsOpen(false)}
            className={styles.closeButton}
          >
            <X className={styles.closeIcon} />
          </button>
        </div>

        <div className={styles.shortcutsList}>
          {Object.entries(SHORTCUTS).map(([key, shortcut]) => (
            <div key={key} className={styles.shortcutItem}>
              <span className={styles.shortcutDescription}>{shortcut.description}</span>
              <kbd className={styles.shortcutKeys}>
                {formatShortcut(shortcut)}
              </kbd>
            </div>
          ))}
        </div>

        <div className={styles.footer}>
          <p>Note: Shortcuts don't work when typing in input fields.</p>
        </div>
      </div>
    </div>
  );
}
