import React from 'react';

export function Textarea({ className = '', ...props }) {
  return (
    <textarea
      className={`border rounded px-3 py-2 w-full focus:outline-none focus:ring focus:border-blue-300 ${className}`}
      {...props}
    />
  );
}
