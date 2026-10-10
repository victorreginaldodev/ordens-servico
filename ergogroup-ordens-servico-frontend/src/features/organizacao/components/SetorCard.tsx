import { Package, Users } from 'lucide-react';
import { AtivoBadge, AvatarStack } from '@/components/kit';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { ResumoSetor } from '../useResumoSetores';

interface SetorCardProps {
  resumo: ResumoSetor;
  detalhesCarregando?: boolean;
  onAbrir: () => void;
}

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

export function SetorCard({ resumo, detalhesCarregando, onAbrir }: SetorCardProps) {
  const { setor, membros, gestores, catalogos } = resumo;
  return (
    <button
      type="button"
      onClick={onAbrir}
      className={cn(
        'flex h-full flex-col gap-3 rounded-lg border bg-card p-4 text-left shadow-sm transition-colors',
        'hover:border-primary/40 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        !setor.ativo && 'opacity-70',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-base font-semibold leading-snug">{setor.nome}</h2>
        {!setor.ativo && <AtivoBadge ativo={false} />}
      </div>

      <p className={cn('line-clamp-2 text-sm', setor.descricao ? 'text-muted-foreground' : 'italic text-muted-foreground/70')}>
        {setor.descricao || 'Sem descrição'}
      </p>

      <div className="mt-auto flex items-end justify-between gap-3 border-t pt-3">
        {detalhesCarregando ? (
          <Skeleton className="h-4 w-32" />
        ) : (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Users className="size-3.5" aria-hidden />
              {plural(membros.length, 'pessoa', 'pessoas')}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Package className="size-3.5" aria-hidden />
              {plural(catalogos.length, 'catálogo', 'catálogos')}
            </span>
          </div>
        )}
        {gestores.length > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="text-2xs text-muted-foreground">Gestão</span>
            <AvatarStack nomes={gestores.map((g) => g.usuario_nome)} max={3} />
          </span>
        )}
      </div>
    </button>
  );
}
