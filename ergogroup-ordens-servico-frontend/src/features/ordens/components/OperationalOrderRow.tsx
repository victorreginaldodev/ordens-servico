import { ArrowRight, Receipt } from 'lucide-react';
import { TableCell, TableRow } from '@/components/ui/table';
import { avatarColor, initials } from '@/lib/avatar';
import { OperationalOrderItem } from '../servicesOperacional';
import { STATUS_DOT, getStatusLabel } from '../utilsOperacional';
import { formatDate } from '../utils';

const dotBadge = (dotClass: string, label: string) => (
  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-foreground">
    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClass}`} />
    {label}
  </span>
);

interface OperationalOrderRowProps {
  item: OperationalOrderItem;
  canManage: boolean;
  onEdit: (item: OperationalOrderItem) => void;
  /** Ausente para quem não pode registrar cobrança (`financeiro.registrar_cobranca`). */
  onRegistrarCobranca?: (item: OperationalOrderItem) => void;
}

export function OperationalOrderRow({ item, canManage, onEdit, onRegistrarCobranca }: OperationalOrderRowProps) {
  const cobrancaPendente = item.geraCobranca && !item.cobrancaRealizada;

  return (
    <TableRow
      className={`border-border transition-colors group ${canManage ? 'cursor-pointer hover:bg-muted/40' : ''}`}
      onClick={() => { if (canManage) onEdit(item); }}
    >
      <TableCell className="py-3 px-3">
        <div>
          <span className="text-sm font-semibold uppercase">{item.clienteNome || '—'}</span>
          <div className="flex items-center gap-3 mt-1.5">
            {dotBadge(STATUS_DOT[item.status] ?? 'bg-muted-foreground', getStatusLabel(item.status))}
            {dotBadge(
              item.cobrancaRealizada ? 'bg-green-600' : 'bg-muted-foreground',
              item.cobrancaRealizada ? `Cobrança realizada${item.numeroNf ? ` · NF ${item.numeroNf}` : ''}` : 'Cobrança pendente',
            )}
            <span className="font-mono text-[10px] text-muted-foreground">#{item.id}</span>
          </div>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-[11px] text-muted-foreground uppercase truncate max-w-[200px]">
              {item.catalogoOperacionalNome || '—'}
            </span>
            {item.responsavelNome && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/60 py-0.5 pl-0.5 pr-2 text-[11px] font-medium text-foreground/80">
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${avatarColor(item.responsavelNome)}`}
                >
                  {initials(item.responsavelNome)}
                </span>
                {item.responsavelNome}
              </span>
            )}
          </div>
        </div>
      </TableCell>

      <TableCell className="py-3 px-3">
        <span className="text-xs tabular-nums text-muted-foreground">
          {formatDate(item.dataRecebimento) ?? '—'}
        </span>
      </TableCell>

      <TableCell className="py-3 px-3">
        <div className="flex justify-end items-center gap-1">
          {cobrancaPendente && onRegistrarCobranca && (
            <button
              type="button"
              className="p-1 rounded hover:bg-muted"
              aria-label="Registrar cobrança"
              title="Registrar cobrança"
              onClick={(e) => { e.stopPropagation(); onRegistrarCobranca(item); }}
            >
              <Receipt className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
          <button
            type="button"
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted"
            aria-label="Ver detalhes"
            title="Ver detalhes"
          >
            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      </TableCell>
    </TableRow>
  );
}
