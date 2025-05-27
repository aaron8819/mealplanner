
import styles from './Button/Button.module.css';
import { LoadingSpinner } from './loading-spinner';

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  leftIcon = null,
  rightIcon = null,
  className = '',
  ...props
}) {
  const buttonClasses = [
    styles.button,
    styles[variant],
    styles[size],
    loading && styles.loading,
    (leftIcon || rightIcon) && styles.hasIcon,
    className
  ].filter(Boolean).join(' ');

  const isDisabled = disabled || loading;

  return (
    <button
      className={buttonClasses}
      disabled={isDisabled}
      {...props}
    >
      {loading && (
        <div className={styles.spinner}>
          <LoadingSpinner size="sm" />
        </div>
      )}

      <div className={loading ? styles.content : ''}>
        {leftIcon && <span className={styles.iconLeft}>{leftIcon}</span>}
        {children}
        {rightIcon && <span className={styles.iconRight}>{rightIcon}</span>}
      </div>
    </button>
  );
}
