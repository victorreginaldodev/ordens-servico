import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useOrdemDetalhe } from '@/features/ordens/hooks';
import { OrdemComercialPanel } from '@/features/ordens/components/OrdemComercialPanel';
import { OrdemCobrancaPanel } from '@/features/ordens/components/OrdemCobrancaPanel';
import { OrdemAuditoriaTimeline } from '@/features/ordens/components/OrdemAuditoriaTimeline';

export function OrdemBillingSheet({
  orderId,
  open,
  onOpenChange,
  tab,
  onTabChange,
}: {
  orderId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tab: 'cobranca' | 'historico';
  onTabChange: (tab: 'cobranca' | 'historico') => void;
}) {
  const { data: orderDetail, isLoading: isDetailLoading, isError: isDetailError } =
    useOrdemDetalhe(orderId ?? undefined);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-[760px]">

        {/* Header */}
        <SheetHeader className="flex-row items-start justify-between gap-4 border-b border-border px-6 py-4 pr-14 space-y-0">
          <div className="min-w-0">
            <SheetTitle className="truncate text-base">
              {orderDetail?.cliente_detail?.nome ?? `OS #${orderId}`}
            </SheetTitle>
            <p className="mt-0.5 text-sm text-muted-foreground">OS #{orderId}</p>
          </div>
          <Link
            to={`/ordens/${orderId}`}
            onClick={() => onOpenChange(false)}
            className="flex shrink-0 items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Ver OS
          </Link>
        </SheetHeader>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={(v) => onTabChange(v as 'cobranca' | 'historico')} className="flex min-h-0 flex-1 flex-col">
          <TabsList className="h-auto w-full justify-start gap-0 rounded-none border-b border-border bg-transparent px-6 pt-1">
            <TabsTrigger value="cobranca" className="rounded-none border-b-2 border-transparent bg-transparent px-4 pb-2.5 pt-2 text-sm font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none">
              Cobrança
            </TabsTrigger>
            <TabsTrigger value="historico" className="rounded-none border-b-2 border-transparent bg-transparent px-4 pb-2.5 pt-2 text-sm font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none">
              Histórico
            </TabsTrigger>
          </TabsList>

          {/* ── Aba Cobrança ── */}
          <TabsContent value="cobranca" className="m-0 flex-1 overflow-y-auto">
            {isDetailLoading && (
              <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                Carregando...
              </div>
            )}
            {isDetailError && !isDetailLoading && (
              <div className="flex items-center justify-center py-12 text-sm text-destructive">
                Não foi possível carregar os detalhes.
              </div>
            )}
            {!isDetailLoading && !isDetailError && orderDetail && (
              <div className="space-y-5 px-6 py-5">
                <OrdemComercialPanel ordem={orderDetail} />
                <OrdemCobrancaPanel ordem={orderDetail} />
              </div>
            )}
          </TabsContent>

          {/* ── Aba Histórico ── */}
          <TabsContent value="historico" className="m-0 flex-1 overflow-y-auto px-6">
            {orderId && <OrdemAuditoriaTimeline ordemId={orderId} />}
          </TabsContent>
        </Tabs>

      </SheetContent>
    </Sheet>
  );
}
