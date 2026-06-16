import React from 'react';
import { cn } from '../../lib/utils';

interface CardProps {
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}

export function Card({ className, children, onClick }: CardProps) {
  return (
    <div
      className={cn('bg-slate-800 rounded-xl border border-slate-700', onClick && 'cursor-pointer hover:border-slate-500 transition-colors', className)}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children }: CardProps) {
  return <div className={cn('px-4 py-3 border-b border-slate-700', className)}>{children}</div>;
}

export function CardContent({ className, children }: CardProps) {
  return <div className={cn('px-4 py-3', className)}>{children}</div>;
}
