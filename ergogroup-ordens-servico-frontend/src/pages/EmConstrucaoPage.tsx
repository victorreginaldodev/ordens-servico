import { Hammer } from 'lucide-react';
import { EmptyState, PageHeader } from '@/components/kit';

interface EmConstrucaoPageProps {
  titulo: string;
  descricao: string;
  /** O que a página vai mostrar, em uma frase. */
  conteudo: string;
}

/**
 * Lugar das páginas novas que ainda vão ser construídas (plano-redesenho-fluxos-e-telas.md, R4 a R6).
 * A rota, o menu e a permissão já valem; só o conteúdo falta.
 */
export default function EmConstrucaoPage({ titulo, descricao, conteudo }: EmConstrucaoPageProps) {
  return (
    <>
      <PageHeader title={titulo} description={descricao} />
      <div className="rounded-xl border border-dashed">
        <EmptyState icon={Hammer} title="Esta página está sendo construída" description={conteudo} />
      </div>
    </>
  );
}
