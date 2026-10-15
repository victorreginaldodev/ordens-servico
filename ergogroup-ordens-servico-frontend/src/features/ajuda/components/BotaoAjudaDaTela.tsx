import { Link, useLocation } from 'react-router-dom';
import { CircleHelp } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { paginaDaTela, urlDaPagina } from '../conteudo';
import { useAjuda } from '../useAjuda';

/** O "?" no cabeçalho das telas: abre a página da Ajuda daquela tela (o campo `rotas` de cada página). */
export function BotaoAjudaDaTela() {
  const { pathname } = useLocation();
  const pagina = paginaDaTela(pathname, useAjuda());
  if (!pagina) return null;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          to={urlDaPagina(pagina)}
          aria-label={`Ajuda: ${pagina.titulo}`}
          className="grid size-9 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <CircleHelp className="size-4" />
        </Link>
      </TooltipTrigger>
      <TooltipContent>Ajuda: {pagina.titulo}</TooltipContent>
    </Tooltip>
  );
}
