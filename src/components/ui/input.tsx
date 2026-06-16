import React from 'react';
import { cn } from '../../lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const inputId = id || label?.replace(/\s+/g, '-');
    return (
      <div className="space-y-1">
        {label && <label htmlFor={inputId} className="block text-sm font-medium text-slate-300">{label}</label>}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400',
            'focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent',
            error && 'border-red-500 focus:ring-red-400',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
