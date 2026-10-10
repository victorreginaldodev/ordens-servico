import { Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

interface ComponentUnderDevelopmentProps {
  children: React.ReactNode;
  className?: string;
}

export default function ComponentUnderDevelopment({ children, className }: ComponentUnderDevelopmentProps) {
  return (
    <div className={cn("relative group overflow-hidden rounded-xl", className)}>
      <div className="pointer-events-none select-none opacity-40 blur-[2px] transition-all duration-300 group-hover:opacity-30 group-hover:blur-[3px]">
        {children}
      </div>
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-4 text-center">
        <div className="rounded-full bg-background/90 p-3 shadow-lg ring-1 ring-border/50 backdrop-blur-sm transition-transform duration-300 group-hover:scale-110">
          <Wrench className="h-6 w-6 text-primary" />
        </div>
        <div className="mt-3 rounded-md bg-background/80 px-3 py-1 font-medium text-sm text-foreground/80 backdrop-blur-md shadow-sm ring-1 ring-border/50">
          Em desenvolvimento
        </div>
      </div>
    </div>
  );
}
