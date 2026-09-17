import type { HTMLAttributes, ReactNode } from 'react';

export function GlassCard({
  children,
  className = '',
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div className={`glass-card ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}
