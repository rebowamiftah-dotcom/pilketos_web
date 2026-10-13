import React from 'react';

interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline';
  children: React.ReactNode;
  className?: string;
}

export default function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  const variantClasses: Record<string, string> = {
    default: 'bg-secondary text-secondary-foreground',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200',
    danger: 'bg-red-50 text-red-700 border border-red-200',
    info: 'bg-accent/10 text-accent border border-accent/20',
    outline: 'bg-transparent text-muted-foreground border border-border',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-600 ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}