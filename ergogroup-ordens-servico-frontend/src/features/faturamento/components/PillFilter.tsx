import { cn } from '@/lib/utils';

export type PillOption<T extends string> = { value: T; label: string };

export function PillFilter<T extends string>({
  options,
  value,
  onChange,
}: {
  options: PillOption<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'px-2.5 py-1 rounded-full text-xs font-medium transition-colors border',
            value === opt.value
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-secondary text-muted-foreground border-border hover:text-foreground',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
