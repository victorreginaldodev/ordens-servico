import { CreditCard, FileText } from 'lucide-react';
import { MoneyValue } from '@/components/common/MoneyValue';
import { useUserRole } from '@/hooks/useUserRole';
import { avatarColor, formatCurrency, formatDate, initials } from '../utils';
import { InfoField } from './InfoField';
import type { OrdemServicoDetalhe } from '../services';

interface OrdemComercialPanelProps {
  ordem: OrdemServicoDetalhe;
}

function FieldsGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-x-7 gap-y-1 px-[22px] py-[22px] sm:grid-cols-2 lg:grid-cols-3">
      {children}
    </div>
  );
}

function DadosVendaCard({ ordem }: OrdemComercialPanelProps) {
  const { canViewOrderValues } = useUserRole();

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center gap-2.5 border-b border-border px-[22px] py-4">
        <CreditCard className="h-[18px] w-[18px] text-muted-foreground" strokeWidth={2} />
        <h3 className="text-[15px] font-bold text-foreground">Dados da venda</h3>
      </div>
      <FieldsGrid>
        {canViewOrderValues && (
          <InfoField
            label="Valor total"
            value={<span className="text-[17px] font-extrabold"><MoneyValue value={ordem.valor} formatter={formatCurrency} /></span>}
          />
        )}
        <InfoField label="Forma de pagamento" value={ordem.forma_pagamento_display} />
        <InfoField label="Parcelas" value={ordem.quantidade_parcelas ? `${ordem.quantidade_parcelas}x` : '—'} />
        <InfoField label="Data da venda" value={formatDate(ordem.data_venda)} />
        <InfoField label="Vendedor" value={ordem.criado_por_nome} />
        <InfoField label="Cobrança imediata" value={ordem.cobranca_imediata ? 'Sim' : 'Não'} />
        <InfoField label="Data acordada de cobrança" value={formatDate(ordem.data_acordada_cobranca)} />
        <InfoField
          label="Contato para envio de NF"
          value={[ordem.nome_contato_envio_nf, ordem.contato_envio_nf].filter(Boolean).join(' · ') || null}
          wide
        />
        <InfoField label="Observação" value={ordem.observacao} wide />
      </FieldsGrid>
    </div>
  );
}

function ContratoCard({ ordem }: OrdemComercialPanelProps) {
  if (!ordem.contrato) {
    return (
      <div className="flex min-h-[220px] flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-border p-10 text-center">
        <div className="mb-1 flex h-[52px] w-[52px] items-center justify-center rounded-[13px] bg-muted text-muted-foreground">
          <FileText className="h-6 w-6" strokeWidth={1.8} />
        </div>
        <h3 className="text-[15px] font-bold text-foreground">Sem contrato vinculado</h3>
        <p className="max-w-[300px] text-[13px] text-muted-foreground">
          Esta venda foi registrada sem contrato vigente.
        </p>
      </div>
    );
  }

  const hoje = new Date();
  const fim = ordem.contrato_data_fim ? new Date(ordem.contrato_data_fim) : null;
  const vigente = !fim || fim >= hoje;

  const gestorNome = ordem.gestor_contrato_nome;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center gap-2.5 border-b border-border px-[22px] py-4">
        <FileText className="h-[18px] w-[18px] text-muted-foreground" strokeWidth={2} />
        <h3 className="text-[15px] font-bold text-foreground">Contrato vinculado</h3>
        <span
          className={
            vigente
              ? 'ml-1 rounded-md bg-green-500/15 px-2.5 py-0.5 text-xs font-semibold text-green-600 dark:text-green-400'
              : 'ml-1 rounded-md bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground'
          }
        >
          {vigente ? 'Vigente' : 'Encerrado'}
        </span>
      </div>

      <div className="flex flex-col gap-5 px-[22px] py-[22px]">
        <InfoField label="Objeto do contrato" value={ordem.objeto_contrato} />

        <div className="grid grid-cols-2 gap-7">
          <InfoField label="Início da vigência" value={formatDate(ordem.contrato_data_inicio)} />
          <InfoField label="Fim da vigência" value={formatDate(ordem.contrato_data_fim)} />
        </div>

        {gestorNome && (
          <div className="border-t border-border pt-[18px]">
            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
              Gestor de contrato (cliente)
            </span>
            <div className="mt-2.5 flex items-center gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${avatarColor(gestorNome)}`}>
                {initials(gestorNome)}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{gestorNome}</p>
                <p className="text-[12.5px] font-medium text-muted-foreground">
                  {[ordem.gestor_contrato_email, ordem.gestor_contrato_telefone].filter(Boolean).join(' · ') || '—'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function OrdemComercialPanel({ ordem }: OrdemComercialPanelProps) {
  return (
    <div className="grid grid-cols-1 items-start gap-[18px] [grid-template-columns:repeat(auto-fit,minmax(400px,1fr))]">
      <DadosVendaCard ordem={ordem} />
      <ContratoCard ordem={ordem} />
    </div>
  );
}
