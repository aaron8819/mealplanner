import React from 'react';
import styles from './Card/Card.module.css';

export function Card({ children, className = '', ...props }) {
  const cardClasses = [styles.card, className].filter(Boolean).join(' ');
  return <div className={cardClasses} {...props}>{children}</div>;
}

export function CardContent({ children, className = '', ...props }) {
  const contentClasses = [styles.cardContent, className].filter(Boolean).join(' ');
  return <div className={contentClasses} {...props}>{children}</div>;
}
