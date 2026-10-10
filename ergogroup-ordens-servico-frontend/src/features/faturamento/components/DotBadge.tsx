export const DotBadge = ({ colorClass, label }: { colorClass: string; label: string }) => (
  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-foreground">
    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${colorClass}`} />
    {label}
  </span>
);
