import React from 'react';
import styles from './Textarea/Textarea.module.css';

export const Textarea = React.forwardRef(({
  className = '',
  size = 'medium',
  variant = 'default',
  ...props
}, ref) => {
  const textareaClasses = [
    styles.textarea,
    styles[size],
    variant !== 'default' && styles[variant],
    className
  ].filter(Boolean).join(' ');

  return (
    <textarea
      ref={ref}
      className={textareaClasses}
      {...props}
    />
  );
});

Textarea.displayName = 'Textarea';
