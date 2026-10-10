import { useState } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { ev2Features } from '@/data/ev2Updates';

interface EV2UpdatesModalProps {
  open: boolean;
  onDismiss: () => void;
}

export function EV2UpdatesModal({ open, onDismiss }: EV2UpdatesModalProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const feature = ev2Features[activeIndex];
  const Icon = feature.icon;
  const isFirst = activeIndex === 0;
  const isLast = activeIndex === ev2Features.length - 1;

  const goNext = () => setActiveIndex((i) => Math.min(i + 1, ev2Features.length - 1));
  const goPrev = () => setActiveIndex((i) => Math.max(i - 1, 0));

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-5xl h-[88vh] flex flex-col p-0 gap-0 overflow-hidden [&>button.absolute]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">Novidades do Sistema — EV2</DialogTitle>
        <DialogDescription className="sr-only">
          Resumo das melhorias operacionais implementadas na evolução EV2 do sistema.
        </DialogDescription>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="relative flex-shrink-0 px-6 py-4 pr-14 border-b bg-gradient-to-r from-primary/8 via-primary/4 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold leading-none">Novidades do Sistema</span>
                <Badge
                  variant="outline"
                  className="text-[10px] font-bold px-1.5 py-0 h-4 bg-primary/10 text-primary border-primary/25"
                >
                  EV2
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {ev2Features.length} melhorias operacionais implementadas
              </p>
            </div>
          </div>
        </div>

        {/* ── Body ───────────────────────────────────────────────────────── */}
        <div className="flex flex-1 min-h-0">

          {/* Sidebar */}
          <aside className="w-56 flex-shrink-0 border-r bg-muted/20">
            <ScrollArea className="h-full">
              <div className="p-2 space-y-0.5">
                {ev2Features.map((f, i) => {
                  const FIcon = f.icon;
                  const isActive = i === activeIndex;
                  return (
                    <button
                      key={f.id}
                      onClick={() => setActiveIndex(i)}
                      className={cn(
                        'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all duration-150',
                        isActive
                          ? 'bg-background shadow-sm border border-border/60'
                          : 'hover:bg-background/70 text-muted-foreground hover:text-foreground',
                      )}
                    >
                      <div
                        className={cn(
                          'w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0',
                          f.iconBg,
                        )}
                      >
                        <FIcon className={cn('w-3.5 h-3.5', f.iconColor)} />
                      </div>
                      <span
                        className={cn(
                          'text-xs font-medium leading-tight flex-1 min-w-0',
                          isActive ? 'text-foreground' : '',
                        )}
                      >
                        {f.title}
                      </span>
                      {isActive && (
                        <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </aside>

          {/* Content */}
          <ScrollArea className="flex-1 min-w-0">
            <div
              key={activeIndex}
              className="p-8 animate-in fade-in-0 duration-200"
            >
              {/* Feature header */}
              <div className="flex items-start gap-4 mb-6">
                <div
                  className={cn(
                    'w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 border',
                    feature.iconBg,
                  )}
                >
                  <Icon className={cn('w-7 h-7', feature.iconColor)} />
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <h3 className="text-xl font-semibold leading-none">{feature.title}</h3>
                    <Badge variant="outline" className={cn('text-xs', feature.badgeColor)}>
                      {feature.badge}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{feature.summary}</p>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm leading-relaxed text-foreground/80 mb-6">
                {feature.description}
              </p>

              {/* Video embed */}
              {feature.videoUrl && (
                <div className="rounded-xl overflow-hidden border border-border/60 shadow-sm">
                  <iframe
                    className="w-full aspect-video"
                    src={feature.videoUrl}
                    title={feature.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
              )}

              {/* Highlights */}
              {feature.highlights.length > 0 && (
                <div className="space-y-3">
                  {feature.highlights.map((h, i) => (
                    <div
                      key={i}
                      className="flex gap-3 p-3.5 rounded-xl bg-muted/40 border border-border/50"
                    >
                      <div
                        className={cn(
                          'w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
                          feature.iconBg,
                        )}
                      >
                        <CheckCircle2 className={cn('w-3 h-3', feature.iconColor)} />
                      </div>
                      <div>
                        <p className="text-sm font-medium leading-snug">{h.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                          {h.detail}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Step counter */}
              <p className="text-xs text-muted-foreground/60 text-right mt-6">
                {activeIndex + 1} / {ev2Features.length}
              </p>
            </div>
          </ScrollArea>
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 border-t bg-muted/10 px-6 py-3 flex items-center justify-between gap-4">
          {/* Progress dots */}
          <div className="flex items-center gap-1.5">
            {ev2Features.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveIndex(i)}
                aria-label={`Ir para ${ev2Features[i].title}`}
                className={cn(
                  'rounded-full transition-all duration-200',
                  i === activeIndex
                    ? 'w-5 h-2 bg-primary'
                    : 'w-2 h-2 bg-muted-foreground/25 hover:bg-muted-foreground/50',
                )}
              />
            ))}
          </div>

          {/* Navigation + Dismiss */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goPrev}
              disabled={isFirst}
              className="gap-1 h-8"
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </Button>

            {!isLast ? (
              <Button size="sm" onClick={goNext} className="gap-1 h-8">
                Próximo
                <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button size="sm" onClick={onDismiss} className="gap-1.5 h-8">
                <CheckCircle2 className="w-4 h-4" />
                Entendi, não mostrar novamente
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
