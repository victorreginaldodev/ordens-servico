import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function InfoField({ label, value, wide }: { label: string; value: ReactNode; wide?: boolean }) {
  return (
    <div className={cn('min-w-0 py-3', wide && 'sm:col-span-full')}>
      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground/70">
        {label}
      </p>
      <div className="mt-1 break-words text-sm font-bold text-foreground">
        {value || '—'}
      </div>
    </div>
  );
}

export function FieldGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
      {children}
    </div>
  );
}
