import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { useUserRole } from '@/hooks/useUserRole';
import type { OrdemServicoDetalhe, ServicoDetalhe, TarefaDetalhe } from '../services';
import { formatDate, formatDateTime, formatCurrency } from '../utils';

// ── Styles ────────────────────────────────────────────────────────────────────

const c = {
  primary:   '#1e293b',
  secondary: '#64748b',
  border:    '#e2e8f0',
  muted:     '#f8fafc',
  green:     '#16a34a',
  amber:     '#d97706',
  red:       '#dc2626',
  gray:      '#6b7280',
  white:     '#ffffff',
};

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: c.primary,
    paddingTop: 40,
    paddingBottom: 48,
    paddingHorizontal: 40,
    backgroundColor: c.white,
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  headerLeft: { flexDirection: 'column', gap: 3 },
  headerTitle: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: c.primary },
  headerClient: { fontSize: 10, color: c.secondary },
  headerRight: { flexDirection: 'column', alignItems: 'flex-end', gap: 4 },
  headerMeta: { fontSize: 8, color: c.secondary },

  // ── Badges ──
  badgeRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
  },
  badgeAberta:       { backgroundColor: '#fef2f2', color: '#b91c1c' },
  badgeEmAndamento:  { backgroundColor: '#fffbeb', color: '#92400e' },
  badgeConcluida:    { backgroundColor: '#f0fdf4', color: '#15803d' },
  badgeCancelada:    { backgroundColor: '#f1f5f9', color: '#475569' },
  badgePrioridadeAlta: { backgroundColor: '#fef2f2', color: '#b91c1c' },
  badgePrioridadeMedia: { backgroundColor: '#fffbeb', color: '#92400e' },
  badgePrioridadeBaixa: { backgroundColor: '#f1f5f9', color: '#475569' },

  // ── Meta strip ──
  metaStrip: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: c.muted,
  },
  metaCell: { flex: 1, paddingHorizontal: 12, paddingVertical: 8 },
  metaCellBorder: { borderLeftWidth: 1, borderLeftColor: c.border },
  metaLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: c.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  metaValue: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: c.primary },

  // ── Section ──
  section: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: c.primary,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },

  // ── Field grid ──
  fieldGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 6,
    overflow: 'hidden',
  },
  fieldCell: {
    width: '50%',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  fieldCellWide: { width: '100%' },
  fieldLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: c.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  fieldValue: { fontSize: 9, color: c.primary },

  // ── Contrato banner ──
  contratoBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: c.muted,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  contratoBannerLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: c.secondary, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 },
  contratoBannerValue: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: c.primary },
  vigenteBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
    backgroundColor: '#f0fdf4',
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#15803d',
  },

  // ── Cobrança valor ──
  valorBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    backgroundColor: c.muted,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  valorLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: c.secondary, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 3 },
  valorValue: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: c.primary },

  // ── Serviço card ──
  servicoCard: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 8,
    marginBottom: 10,
    overflow: 'hidden',
  },
  servicoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: c.muted,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  servicoNome: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: c.primary },
  servicoTag: { fontSize: 8, color: c.secondary, marginRight: 8 },
  servicoHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  servicoDescricao: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  servicoDescricaoLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: c.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 3,
  },
  servicoDescricaoText: { fontSize: 8.5, color: c.secondary, lineHeight: 1.4 },

  // ── Meta strip do serviço ──
  servicoMeta: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  servicoMetaCell: { flex: 1, paddingHorizontal: 12, paddingVertical: 6 },
  servicoMetaCellBorder: { borderLeftWidth: 1, borderLeftColor: c.border },

  // ── Tarefas ──
  tarefasHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  tarefasHeaderText: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: c.secondary },
  tarefaRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  tarefaDescricao: { flex: 3, fontSize: 8.5, color: c.primary, paddingRight: 6 },
  tarefaResponsavel: { flex: 2, fontSize: 8.5, color: c.secondary },
  tarefaStatus: { flex: 1.5, fontSize: 8, textAlign: 'right' },
  tarefaData: { flex: 1.5, fontSize: 8, color: c.secondary, textAlign: 'right' },
  tarefasEmpty: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 8.5,
    color: c.secondary,
    fontStyle: 'italic',
  },

  // ── Footer ──
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: c.border,
    paddingTop: 8,
  },
  footerText: { fontSize: 7.5, color: c.secondary },

  // ── Empty state ──
  emptySection: {
    borderWidth: 1,
    borderColor: c.border,
    borderStyle: 'dashed',
    borderRadius: 6,
    padding: 16,
    alignItems: 'center',
  },
  emptySectionText: { fontSize: 9, color: c.secondary, fontStyle: 'italic' },

  // ── Observação ──
  obs: {
    marginTop: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 6,
    backgroundColor: '#fffbeb',
  },
  obsLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: c.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 3,
  },
  obsText: { fontSize: 8.5, color: c.primary, lineHeight: 1.4 },
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function statusBadgeStyle(status: string) {
  switch (status) {
    case 'aberta':       return [s.badge, s.badgeAberta];
    case 'em_andamento': return [s.badge, s.badgeEmAndamento];
    case 'concluida':    return [s.badge, s.badgeConcluida];
    default:             return [s.badge, s.badgeCancelada];
  }
}

function prioridadeBadgeStyle(prioridade: string) {
  switch (prioridade) {
    case 'alta':  return [s.badge, s.badgePrioridadeAlta];
    case 'media': return [s.badge, s.badgePrioridadeMedia];
    default:      return [s.badge, s.badgePrioridadeBaixa];
  }
}

function statusServicoBadgeStyle(status: string) {
  switch (status) {
    case 'em_andamento': return [s.badge, s.badgeEmAndamento];
    case 'concluida':    return [s.badge, s.badgeConcluida];
    case 'cancelado':
    case 'cancelada':    return [s.badge, s.badgeCancelada];
    default:             return [s.badge, s.badgeAberta];
  }
}

function tarefaStatusColor(status: string): string {
  switch (status) {
    case 'em_andamento': return c.amber;
    case 'concluida':    return c.green;
    case 'cancelada':    return c.gray;
    default:             return c.red;
  }
}

function billingBadgeStyle(ordem: OrdemServicoDetalhe) {
  if (ordem.cobranca_realizada) return [s.badge, s.badgeConcluida];
  if (ordem.liberada_para_cobranca) return [s.badge, s.badgeEmAndamento];
  return [s.badge, s.badgeCancelada];
}

function billingLabel(ordem: OrdemServicoDetalhe) {
  if (ordem.cobranca_realizada) return 'Cobrança realizada';
  if (ordem.liberada_para_cobranca) return 'Liberada para cobrança';
  return 'Não liberada';
}

// Protege o layout do PDF (Yoga, síncrono na thread principal) contra campos
// de texto livre anormalmente grandes.
const MAX_PDF_TEXT_LENGTH = 4000;

function truncateForPdf(value?: string | null): string | undefined {
  if (!value) return value ?? undefined;
  if (value.length <= MAX_PDF_TEXT_LENGTH) return value;
  return `${value.slice(0, MAX_PDF_TEXT_LENGTH)}… (texto truncado — consulte o sistema para o conteúdo completo)`;
}

// ── Field helpers ─────────────────────────────────────────────────────────────

function FieldCell({ label, value, wide }: { label: string; value?: string | null; wide?: boolean }) {
  return (
    <View style={[s.fieldCell, wide ? s.fieldCellWide : {}]}>
      <Text style={s.fieldLabel}>{label}</Text>
      <Text style={s.fieldValue}>{value || '—'}</Text>
    </View>
  );
}

function MetaCell({ label, value, border }: { label: string; value: string; border?: boolean }) {
  return (
    <View style={[s.metaCell, border ? s.metaCellBorder : {}]}>
      <Text style={s.metaLabel}>{label}</Text>
      <Text style={s.metaValue}>{value}</Text>
    </View>
  );
}

// ── Sections ──────────────────────────────────────────────────────────────────

function DadosSection({ ordem }: { ordem: OrdemServicoDetalhe }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Dados da OS</Text>
      <View style={s.fieldGrid}>
        <FieldCell label="Criado por"         value={ordem.criado_por_nome} />
        <FieldCell label="Registrado em"      value={formatDateTime(ordem.criada_em)} />
        <FieldCell label="Data da venda"      value={formatDate(ordem.data_venda)} />
        <FieldCell label="Última atualização" value={formatDateTime(ordem.data_atualizacao)} />
        <FieldCell label="Prioridade"         value={ordem.prioridade_display} />
        <FieldCell
          label="Conclusão da OS"
          value={
            ordem.data_conclusao_os
              ? `${formatDate(ordem.data_conclusao_os)}${ordem.finalizador_nome ? ` por ${ordem.finalizador_nome}` : ''}`
              : undefined
          }
        />
      </View>
    </View>
  );
}

function ContratoSection({ ordem }: { ordem: OrdemServicoDetalhe }) {
  if (!ordem.contrato) {
    return (
      <View style={s.section}>
        <Text style={s.sectionTitle}>Contrato</Text>
        <View style={s.emptySection}>
          <Text style={s.emptySectionText}>OS sem contrato vinculado</Text>
        </View>
      </View>
    );
  }

  const vigencia =
    ordem.contrato_data_inicio || ordem.contrato_data_fim
      ? `${formatDate(ordem.contrato_data_inicio) ?? '—'} → ${formatDate(ordem.contrato_data_fim) ?? '—'}`
      : '—';

  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Contrato</Text>
      <View style={s.contratoBanner}>
        <View>
          <Text style={s.contratoBannerLabel}>Vigência</Text>
          <Text style={s.contratoBannerValue}>{vigencia}</Text>
        </View>
        <Text style={s.vigenteBadge}>Vigente</Text>
      </View>
      <View style={s.fieldGrid}>
        <FieldCell label="Gestor"            value={ordem.gestor_contrato_nome} />
        <FieldCell label="E-mail do gestor"  value={ordem.gestor_contrato_email} />
        <FieldCell label="Telefone do gestor" value={ordem.gestor_contrato_telefone} />
        <FieldCell label="Objeto"            value={truncateForPdf(ordem.objeto_contrato)} wide />
      </View>
    </View>
  );
}

function CobrancaSection({ ordem }: { ordem: OrdemServicoDetalhe }) {
  const { canViewOrderValues } = useUserRole();
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Cobrança</Text>
      <View style={s.valorBanner}>
        <View>
          <Text style={s.valorLabel}>Valor total</Text>
          <Text style={s.valorValue}>{canViewOrderValues ? formatCurrency(ordem.valor) : '—'}</Text>
        </View>
        <Text style={billingBadgeStyle(ordem)}>{billingLabel(ordem)}</Text>
      </View>
      <View style={s.fieldGrid}>
        <FieldCell
          label={ordem.cliente_detail?.tipo_inscricao?.toUpperCase() ?? 'Documento'}
          value={ordem.cliente_detail?.numero_inscricao}
        />
        <FieldCell label="Forma de pagamento" value={ordem.forma_pagamento_display} />
        <FieldCell label="Parcelas"           value={ordem.quantidade_parcelas ? `${ordem.quantidade_parcelas}x` : undefined} />
        <FieldCell label="Cobrança imediata"  value={ordem.cobranca_imediata ? 'Sim' : 'Não'} />
        <FieldCell
          label="Liberação para cobrança"
          value={
            ordem.liberada_para_cobranca
              ? formatDateTime(ordem.liberada_para_cobranca_em) ?? 'Sim'
              : 'Não'
          }
        />
        <FieldCell label="Liberada por" value={ordem.liberada_para_cobranca_por_nome} />
        <FieldCell
          label="Cobrança realizada"
          value={
            ordem.cobranca_realizada
              ? `Sim${ordem.data_cobranca ? ` — ${formatDate(ordem.data_cobranca)}` : ''}`
              : 'Não'
          }
        />
        <FieldCell label="Número NF"    value={ordem.numero_nf ? String(ordem.numero_nf) : undefined} />
        <FieldCell label="Registrada por" value={ordem.cobranca_realizada_por_nome} />
        <FieldCell
          label="Contato para envio de NF"
          value={[ordem.nome_contato_envio_nf, ordem.contato_envio_nf].filter(Boolean).join(' · ') || undefined}
          wide
        />
      </View>
      {ordem.observacao && (
        <View style={s.obs}>
          <Text style={s.obsLabel}>Observação de cobrança</Text>
          <Text style={s.obsText}>{truncateForPdf(ordem.observacao)}</Text>
        </View>
      )}
    </View>
  );
}

function TarefasList({ tarefas }: { tarefas: TarefaDetalhe[] }) {
  if (!tarefas.length) {
    return <Text style={s.tarefasEmpty}>Nenhuma tarefa registrada neste serviço.</Text>;
  }

  return (
    <>
      <View style={s.tarefasHeader}>
        <Text style={[s.tarefasHeaderText, { flex: 3 }]}>Descrição</Text>
        <Text style={[s.tarefasHeaderText, { flex: 2 }]}>Responsável</Text>
        <Text style={[s.tarefasHeaderText, { flex: 1.5, textAlign: 'right' }]}>Status</Text>
        <Text style={[s.tarefasHeaderText, { flex: 1.5, textAlign: 'right' }]}>Início</Text>
      </View>
      {tarefas.map((t) => (
        <View key={t.id} style={s.tarefaRow}>
          <Text style={s.tarefaDescricao}>{truncateForPdf(t.descricao) || '—'}</Text>
          <Text style={s.tarefaResponsavel}>{t.responsavel_nome || '—'}</Text>
          <Text style={[s.tarefaStatus, { color: tarefaStatusColor(t.status) }]}>
            {t.status_display}
          </Text>
          <Text style={s.tarefaData}>{formatDate(t.data_inicio) ?? '—'}</Text>
        </View>
      ))}
    </>
  );
}

function ServicoSection({
  servico,
  index,
  tarefas,
}: {
  servico: ServicoDetalhe;
  index: number;
  tarefas: TarefaDetalhe[];
}) {
  const nome = servico.catalogo_detail?.nome ?? servico.catalogo_nome ?? `Serviço #${servico.id}`;
  const serviceTag = `#S-${String(servico.id).padStart(2, '0')}`;
  const STATUS_TEXT: Record<string, string> = {
    aberto: 'Aberto', em_andamento: 'Em andamento', concluida: 'Concluído',
    cancelado: 'Cancelado', cancelada: 'Cancelado',
  };

  return (
    <View style={s.servicoCard} wrap={false}>
      {/* Header */}
      <View style={s.servicoHeader}>
        <Text style={s.servicoNome}>{index}. {nome}</Text>
        <View style={s.servicoHeaderRight}>
          <Text style={s.servicoTag}>{serviceTag}</Text>
          <Text style={statusServicoBadgeStyle(servico.status)}>
            {STATUS_TEXT[servico.status] ?? servico.status_display}
          </Text>
        </View>
      </View>

      {/* Descrição */}
      {servico.descricao && (
        <View style={s.servicoDescricao}>
          <Text style={s.servicoDescricaoLabel}>Descrição</Text>
          <Text style={s.servicoDescricaoText}>{truncateForPdf(servico.descricao)}</Text>
        </View>
      )}

      {/* Meta */}
      <View style={s.servicoMeta}>
        {[
          { label: 'Início',      value: formatDate(servico.data_inicio)  ?? '—' },
          { label: 'Término',     value: formatDate(servico.data_termino) ?? '—' },
          { label: 'Responsável', value: servico.terminado_por_nome       ?? '—' },
          { label: 'Tarefas',     value: String(tarefas.length) },
        ].map((m, i) => (
          <View key={m.label} style={[s.servicoMetaCell, i > 0 ? s.servicoMetaCellBorder : {}]}>
            <Text style={s.metaLabel}>{m.label}</Text>
            <Text style={s.metaValue}>{m.value}</Text>
          </View>
        ))}
      </View>

      {/* Tarefas */}
      <TarefasList tarefas={tarefas} />
    </View>
  );
}

// ── Main Document ─────────────────────────────────────────────────────────────

export interface OrdemPdfDocumentProps {
  ordem: OrdemServicoDetalhe;
  servicos: ServicoDetalhe[];
  tarefasPorServico: Record<number, TarefaDetalhe[]>;
}

export function OrdemPdfDocument({ ordem, servicos, tarefasPorServico }: OrdemPdfDocumentProps) {
  const { canViewOrderValues } = useUserRole();
  const geradoEm = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date());

  const totalTarefas = Object.values(tarefasPorServico).reduce((acc, t) => acc + t.length, 0);

  return (
    <Document
      title={`OS #${ordem.id} — ${ordem.cliente_detail.nome}`}
      author="Ergogroup"
      subject="Ordem de Serviço"
    >
      <Page size="A4" style={s.page}>
        {/* ── Cabeçalho ── */}
        <View style={s.header} fixed>
          <View style={s.headerLeft}>
            <Text style={s.headerTitle}>OS #{ordem.id}</Text>
            <Text style={s.headerClient}>{ordem.cliente_detail.nome}</Text>
            <View style={s.badgeRow}>
              <Text style={statusBadgeStyle(ordem.status)}>{ordem.status_display}</Text>
              <Text style={prioridadeBadgeStyle(ordem.prioridade)}>
                Prioridade {ordem.prioridade_display}
              </Text>
            </View>
          </View>
          <View style={s.headerRight}>
            <Text style={s.headerMeta}>Gerado em {geradoEm}</Text>
            <Text style={s.headerMeta}>Ergogroup</Text>
          </View>
        </View>

        {/* ── Meta strip ── */}
        <View style={s.metaStrip}>
          <MetaCell label="Venda"       value={formatDate(ordem.data_venda) ?? '—'} />
          <MetaCell label="Criado por"  value={ordem.criado_por_nome ?? '—'} border />
          <MetaCell label="Serviços"    value={`${servicos.length} serviço${servicos.length !== 1 ? 's' : ''}`} border />
          <MetaCell label="Tarefas"     value={`${totalTarefas} tarefa${totalTarefas !== 1 ? 's' : ''}`} border />
          <MetaCell label="Valor total" value={canViewOrderValues ? formatCurrency(ordem.valor) : '—'} border />
        </View>

        {/* ── Dados ── */}
        <DadosSection ordem={ordem} />

        {/* ── Contrato ── */}
        <ContratoSection ordem={ordem} />

        {/* ── Cobrança ── */}
        <CobrancaSection ordem={ordem} />

        {/* ── Serviços ── */}
        {servicos.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>
              Serviços ({servicos.length})
            </Text>
            {servicos.map((servico, i) => (
              <ServicoSection
                key={servico.id}
                servico={servico}
                index={i + 1}
                tarefas={tarefasPorServico[servico.id] ?? []}
              />
            ))}
          </View>
        )}

        {/* ── Footer ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>OS #{ordem.id} — {ordem.cliente_detail.nome}</Text>
          <Text
            style={s.footerText}
            render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
