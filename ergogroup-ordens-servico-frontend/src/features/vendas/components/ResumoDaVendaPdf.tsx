import { Document, Font, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import { ETAPA_DEFS } from '@/components/kit';
import { formatCurrency, formatDate } from '@/lib/format';
import { FORMA_PAGAMENTO_LABEL, LIBERAR_EM_LABEL } from '../condicao';
import type { ResumoDaVenda } from '../services';

/**
 * PDF da OS a partir do resumo da venda (plano R5.6). Mostra o que a pessoa vê na tela:
 * sem `financeiro.ver_valores`, a condição e o financeiro não vêm da API e não entram no PDF.
 */

// Sem hifenização automática: nomes de setor e de cliente não devem ser quebrados no meio.
Font.registerHyphenationCallback((palavra) => [palavra]);

const cor = { texto: '#1e293b', suave: '#64748b', borda: '#e2e8f0', fundo: '#f8fafc' };
const s = StyleSheet.create({
  pagina: { fontFamily: 'Helvetica', fontSize: 9, color: cor.texto, padding: 40 },
  topo: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: cor.borda, paddingBottom: 12, marginBottom: 14 },
  titulo: { fontSize: 18, fontFamily: 'Helvetica-Bold' },
  suave: { color: cor.suave },
  secao: { marginBottom: 14 },
  secaoTitulo: { fontSize: 10, fontFamily: 'Helvetica-Bold', marginBottom: 6 },
  grade: { flexDirection: 'row', flexWrap: 'wrap', borderWidth: 1, borderColor: cor.borda, borderRadius: 6, backgroundColor: cor.fundo },
  celula: { width: '25%', padding: 8 },
  rotulo: { fontSize: 7, color: cor.suave, textTransform: 'uppercase', marginBottom: 2 },
  tabela: { borderWidth: 1, borderColor: cor.borda, borderRadius: 6 },
  linha: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: cor.borda },
  cab: { backgroundColor: cor.fundo },
  col: { padding: 6 },
  negrito: { fontFamily: 'Helvetica-Bold' },
  rodape: { position: 'absolute', bottom: 24, left: 40, right: 40, fontSize: 7, color: cor.suave, flexDirection: 'row', justifyContent: 'space-between' },
});

const LARG = ['30%', '20%', '14%', '22%', '14%'];

export function ResumoDaVendaPdf({ venda, geradoPor }: { venda: ResumoDaVenda; geradoPor: string }) {
  const c = venda.condicoes;
  const f = venda.financeiro;
  const a = venda.andamento;
  return (
    <Document title={`OS ${venda.id} - ${venda.cliente_nome}`}>
      <Page size="A4" style={s.pagina}>
        <View style={s.topo}>
          <View>
            <Text style={s.titulo}>OS {venda.id}</Text>
            <Text style={s.suave}>{venda.cliente_nome}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text>Venda em {formatDate(venda.data_venda)}</Text>
            <Text style={s.suave}>por {venda.vendido_por_nome ?? '—'}</Text>
          </View>
        </View>

        <View style={s.secao}>
          <View style={s.grade}>
            <View style={s.celula}><Text style={s.rotulo}>Status</Text><Text>{venda.status === 'concluida' ? 'Concluída' : venda.status === 'em_andamento' ? 'Em andamento' : venda.status === 'cancelada' ? 'Cancelada' : 'Aberta'}</Text></View>
            <View style={s.celula}><Text style={s.rotulo}>Prioridade</Text><Text>{{ baixa: 'Baixa', media: 'Média', alta: 'Alta' }[venda.prioridade]}</Text></View>
            <View style={s.celula}><Text style={s.rotulo}>Andamento</Text><Text>{a.concluido} de {a.total - a.cancelado} concluídos</Text></View>
            <View style={s.celula}><Text style={s.rotulo}>Para distribuir</Text><Text>{a.novo + a.a_distribuir}</Text></View>
          </View>
        </View>

        {c ? (
          <View style={s.secao}>
            <Text style={s.secaoTitulo}>Condição de pagamento</Text>
            <View style={s.grade}>
              <View style={{ ...s.celula, width: '50%' }}><Text style={s.rotulo}>Condição</Text><Text>{c.condicao_resumo}</Text></View>
              <View style={s.celula}><Text style={s.rotulo}>Valor</Text><Text style={s.negrito}>{formatCurrency(c.valor)}</Text></View>
              <View style={s.celula}><Text style={s.rotulo}>Forma</Text><Text>{FORMA_PAGAMENTO_LABEL[c.forma_pagamento]}</Text></View>
              <View style={{ ...s.celula, width: '50%' }}><Text style={s.rotulo}>Libera para o financeiro</Text><Text>{LIBERAR_EM_LABEL[c.liberar_em]}</Text></View>
              <View style={{ ...s.celula, width: '50%' }}><Text style={s.rotulo}>Contato da NF</Text><Text>{[c.nome_contato_envio_nf, c.contato_envio_nf].filter(Boolean).join(' · ') || '—'}</Text></View>
            </View>
            {c.observacao ? <Text style={{ marginTop: 6 }}>Observações de pagamento: {c.observacao}</Text> : null}
            {f ? (
              <Text style={{ marginTop: 6, color: cor.suave }}>
                {f.liberada_para_cobranca ? `Liberada em ${formatDate(f.liberada_para_cobranca_em)}${f.liberada_para_cobranca_por_nome ? ` por ${f.liberada_para_cobranca_por_nome}` : ''}` : 'Ainda não liberada para o financeiro'}
                {f.cobranca_realizada ? ` · lançada em ${formatDate(f.data_cobranca)}${f.referencia_lancamento ? ` (${f.referencia_lancamento})` : ''}` : ''}
              </Text>
            ) : null}
          </View>
        ) : null}

        <View style={s.secao}>
          <Text style={s.secaoTitulo}>Serviços</Text>
          <View style={s.tabela}>
            <View style={[s.linha, s.cab]}>
              {['Serviço', 'Setor', 'Etapa', 'Responsáveis', 'Prazo / término'].map((t, i) => (
                <Text key={t} style={[s.col, s.rotulo, { width: LARG[i], marginBottom: 0 }]}>{t}</Text>
              ))}
            </View>
            {venda.servicos.map((sv, i) => (
              <View key={sv.id} style={[s.linha, i === venda.servicos.length - 1 ? { borderBottomWidth: 0 } : {}]} wrap={false}>
                <View style={[s.col, { width: LARG[0] }]}><Text style={s.negrito}>{sv.catalogo_nome ?? 'Serviço'}</Text><Text style={s.suave}>{sv.descricao}</Text></View>
                <Text style={[s.col, { width: LARG[1] }]}>{sv.setor_nome ?? '—'}</Text>
                <Text style={[s.col, { width: LARG[2] }]}>{ETAPA_DEFS[sv.etapa].label}</Text>
                <Text style={[s.col, { width: LARG[3] }]}>{sv.responsaveis.map((r) => r.nome).filter(Boolean).join(', ') || '—'}</Text>
                <View style={[s.col, { width: LARG[4] }]}>
                  <Text>{formatDate(sv.prazo) ?? 'Sem prazo'}</Text>
                  {sv.data_termino ? <Text style={s.suave}>Concluído {formatDate(sv.data_termino)}</Text> : null}
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={s.rodape} fixed>
          <Text>Gerado em {formatDate(new Date())} por {geradoPor}</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
