import React from 'react';
import styles from './Modal.module.css';

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  variant = 'info',
  showCloseButton = true,
  closeOnBackdropClick = true,
  className = ''
}) {
  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (closeOnBackdropClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  const getIcon = () => {
    switch (variant) {
      case 'danger':
        return '🗑️';
      case 'warning':
        return '⚠️';
      case 'success':
        return '✅';
      default:
        return 'ℹ️';
    }
  };

  return (
    <div className={styles.overlay} onClick={handleBackdropClick}>
      <div className={`${styles.modal} ${className}`}>
        <div className={styles.header}>
          <div className={`${styles.iconContainer} ${styles[variant]}`}>
            <span>{getIcon()}</span>
          </div>
          
          <div className={styles.content}>
            {title && <h3 className={styles.title}>{title}</h3>}
            <div className={styles.message}>
              {children}
            </div>
          </div>

          {showCloseButton && (
            <button
              onClick={onClose}
              className={styles.closeButton}
              aria-label="Close modal"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  loading = false,
  className = ''
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      variant={variant}
      showCloseButton={true}
      closeOnBackdropClick={!loading}
      className={className}
    >
      <p className={styles.message}>{message}</p>
      
      <div className={styles.actions}>
        <button
          onClick={onClose}
          disabled={loading}
          className={`${styles.button} ${styles.secondary}`}
        >
          {cancelText}
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className={`${styles.button} ${styles[variant]}`}
        >
          {loading ? 'Processing...' : confirmText}
        </button>
      </div>
    </Modal>
  );
}

export default Modal;
