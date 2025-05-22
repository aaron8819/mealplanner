import React from 'react';
export function Card({ children, ...props }) {
  return <div className="border rounded-lg bg-white shadow-sm p-4" {...props}>{children}</div>;
}
export function CardContent({ children, ...props }) {
  return <div {...props}>{children}</div>;
}
