import React from 'react';
import { cn } from '../../lib/utils';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
  error?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, error, className, id, ...props }, ref) => {
    const selectId = id || label?.replace(/\s+/g, '-');
    return (
      <div className="space-y-1">
        {label && <label htmlFor={selectId} className="block text-sm font-medium text-slate-300">{label}</label>}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            'w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white',
            'focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent',
            error && 'border-red-500 focus:ring-red-400',
            className
          )}
          {...props}
        >
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
