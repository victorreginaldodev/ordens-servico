import { Link } from 'react-router-dom';

/** Número da OS: link para o resumo da venda para quem vê vendas; texto para os demais. */
export function NumeroOS({ os, veVendas }: { os: number; veVendas: boolean }) {
  if (!veVendas) return <span className="tabular-nums text-muted-foreground">{os}</span>;
  return (
    <Link to={`/vendas/${os}`} className="tabular-nums text-primary hover:underline">
      {os}
    </Link>
  );
}
