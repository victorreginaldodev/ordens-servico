import { Checkbox } from '@/components/ui/checkbox';

/**
 * As duas caixas ao mudar o setor do catálogo (revisão de 16/10/2026): o serviço vendido guarda o setor da época, e
 * quem muda escolhe o que vai junto. Cada caixa só aparece quando há serviços nela; as duas começam desmarcadas.
 * Os concluídos e cancelados nunca mudam.
 */
export interface MoverServicos {
  emAberto: boolean;
  comTarefas: boolean;
}

interface CaixasDeServicosVendidosProps {
  /** Novos ou a distribuir que iriam junto. */
  emAberto: number;
  /** Distribuídos ou em andamento que iriam junto. */
  comTarefas: number;
  /** Setor para onde vão (o do catálogo). */
  destino?: string | null;
  /** Setor onde estão hoje, quando se sabe qual é. */
  origem?: string | null;
  valor: MoverServicos;
  onMudar: (valor: MoverServicos) => void;
}

export function CaixasDeServicosVendidos({ emAberto, comTarefas, destino, origem, valor, onMudar }: CaixasDeServicosVendidosProps) {
  const para = destino || 'o novo setor';
  return (
    <div className="space-y-2">
      {emAberto > 0 && (
        <Caixa
          marcada={valor.emAberto}
          onMudar={(v) => onMudar({ ...valor, emAberto: v })}
          titulo={`Mover ${emAberto === 1 ? 'o serviço ainda não distribuído' : `os ${emAberto} serviços ainda não distribuídos`}`}
          descricao={`Novos ou a distribuir. Vão para ${para} como "novo" e quem organiza ${para} recebe o aviso de chegada.`}
        />
      )}
      {comTarefas > 0 && (
        <Caixa
          marcada={valor.comTarefas}
          onMudar={(v) => onMudar({ ...valor, comTarefas: v })}
          titulo={`Mover ${comTarefas === 1 ? 'o serviço já distribuído ou em andamento' : `os ${comTarefas} serviços já distribuídos ou em andamento`}`}
          descricao={`Vão para ${para} com as tarefas e os técnicos atuais. ${origem || 'O setor antigo'} deixa de vê-${comTarefas === 1 ? 'lo' : 'los'} e ${para} pode redistribuir.`}
        />
      )}
      {emAberto + comTarefas > 0 && <p className="text-xs text-muted-foreground">Os concluídos e cancelados ficam no setor em que foram feitos.</p>}
    </div>
  );
}

function Caixa({ marcada, onMudar, titulo, descricao }: { marcada: boolean; onMudar: (v: boolean) => void; titulo: string; descricao: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 rounded-md border bg-background px-3 py-2.5 text-foreground hover:bg-muted/40">
      <Checkbox className="mt-0.5" checked={marcada} onCheckedChange={(v) => onMudar(v === true)} />
      <span className="space-y-0.5">
        <span className="block text-sm font-medium">{titulo}</span>
        <span className="block text-xs text-muted-foreground">{descricao}</span>
      </span>
    </label>
  );
}
