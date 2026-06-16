import React from 'react';
import { cn } from '../../lib/utils';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const textareaId = id || label?.replace(/\s+/g, '-');
    return (
      <div className="space-y-1">
        {label && <label htmlFor={textareaId} className="block text-sm font-medium text-slate-300">{label}</label>}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            'w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400',
            'focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent',
            'min-h-[80px] resize-y',
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

Textarea.displayName = 'Textarea';
