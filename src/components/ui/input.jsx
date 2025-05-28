import React from 'react';
import styles from './Input/Input.module.css';

export const Input = React.forwardRef(({
  className = '',
  size = 'medium',
  variant = 'default',
  ...props
}, ref) => {
  const inputClasses = [
    styles.input,
    styles[size],
    variant !== 'default' && styles[variant],
    className
  ].filter(Boolean).join(' ');

  return (
    <input
      ref={ref}
      className={inputClasses}
      {...props}
    />
  );
});

Input.displayName = 'Input';
