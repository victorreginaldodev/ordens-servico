import { Link } from 'react-router-dom';
import { getIniciais } from '@/lib/format';

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/** Cabeçalho do grupo por pessoa: quem é, a função e a carga naquele recorte. */
export function CabecalhoPessoa({ nome, funcao, quantidade, atrasados, unidade = ['serviço', 'serviços'] }: { nome: string | null; funcao?: string | null; quantidade: number; atrasados?: number; unidade?: [string, string] }) {
  if (!nome) return <span className="text-sm font-semibold">Sem responsável</span>;
  return (
    <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm">
      <span className="grid size-6 place-items-center rounded-full bg-primary/15 text-2xs font-bold text-primary">{getIniciais(nome)}</span>
      <span className="font-semibold">{nome}</span>
      {funcao ? <span className="text-muted-foreground">{funcao}</span> : null}
      <span className="text-xs tabular-nums text-muted-foreground">
        {plural(quantidade, ...unidade)}
        {atrasados ? <span className="text-danger-strong"> · {plural(atrasados, 'atrasado', 'atrasados')}</span> : null}
      </span>
    </span>
  );
}

/** Cabeçalho do grupo por OS: número, cliente e o link para o resumo da venda (quando a pessoa vê vendas). */
export function CabecalhoOS({ os, cliente, quantidade, veVendas, extra }: { os: number; cliente: string; quantidade: number; veVendas: boolean; extra?: React.ReactNode }) {
  return (
    <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-sm">
      <span className="font-semibold tabular-nums">OS {os}</span>
      <span>{cliente}</span>
      <span className="text-xs text-muted-foreground">{plural(quantidade, 'serviço aqui', 'serviços aqui')}</span>
      {extra}
      {veVendas ? (
        <Link to={`/vendas/${os}`} className="text-xs font-medium text-primary hover:underline">
          Resumo da venda
        </Link>
      ) : null}
    </span>
  );
}

export function CabecalhoSimples({ titulo, quantidade }: { titulo: string; quantidade: number }) {
  return (
    <span className="flex items-center gap-2.5 text-sm">
      <span className="font-semibold">{titulo}</span>
      <span className="text-xs tabular-nums text-muted-foreground">{plural(quantidade, 'serviço', 'serviços')}</span>
    </span>
  );
}

/** Número da OS: link para o resumo da venda para quem vê vendas; texto para os demais. */
export function NumeroOS({ os, veVendas }: { os: number; veVendas: boolean }) {
  if (!veVendas) return <span className="tabular-nums text-muted-foreground">{os}</span>;
  return (
    <Link to={`/vendas/${os}`} className="tabular-nums text-primary hover:underline">
      {os}
    </Link>
  );
}
