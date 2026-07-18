import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BrutalButton({
  variant = 'primary',
  className,
  children,
  ...props
}: { variant?: 'primary' | 'yellow' } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        'brutal-btn',
        variant === 'primary' ? 'brutal-btn-primary' : 'brutal-btn-yellow',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function BrutalCard({
  yellow,
  className,
  children,
}: {
  yellow?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('brutal-card p-6', yellow && 'bg-brand-yellow dot-pattern', className)}>
      {children}
    </div>
  );
}

export function StatBadge({
  icon: Icon,
  label,
  tone = 'positive',
}: {
  icon: LucideIcon;
  label: string;
  tone?: 'positive' | 'emergency';
}) {
  return (
    <span
      className={cn(
        'brutal-badge',
        tone === 'positive' ? 'bg-brand-sage text-black' : 'bg-brand-danger text-white',
      )}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={2.75} /> {label}
    </span>
  );
}
