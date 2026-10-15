import { cn } from '@/lib/utils';

/** Símbolo da ErgoGroup, com a versão do tema escuro (a figura cinza-escura clareada para não sumir no fundo). */
export function MarcaSimbolo({ className }: { className?: string }) {
  return (
    <span className={cn('relative block shrink-0', className)} aria-hidden>
      <img src="/images/logos/logo-ergo.png" alt="" className="size-full object-contain dark:hidden" />
      <img src="/images/logos/logo-ergo-escuro.png" alt="" className="hidden size-full object-contain dark:block" />
    </span>
  );
}

/** Símbolo + nome numa cor só (o verde fica para as ações do sistema). */
export function Marca() {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <MarcaSimbolo className="size-8" />
      <span className="truncate text-base font-bold tracking-tight text-foreground">ERGOGROUP</span>
    </span>
  );
}
