import { matchPath } from 'react-router-dom';
import { PERMISSOES, type Permissao } from '@/lib/permissoes';
import { MODULOS_DA_AJUDA, type DefinicaoDeModulo } from './modulos';

/**
 * Conteúdo da Ajuda: um arquivo Markdown por página, em `conteudo/<modulo>/<pagina>.md`, com um cabeçalho
 * (frontmatter) simples de `chave: valor`. Convenções em `conteudo/README.md`.
 */

export interface SecaoDaPagina {
  id: string;
  titulo: string;
}

export interface PaginaDaAjuda {
  modulo: string;
  id: string;
  titulo: string;
  /** Uma ou duas frases: o que é. Aparece abaixo do título e na busca. */
  resumo: string;
  /** A página só aparece para quem tem ao menos uma destas; também viram o "Precisa de". */
  permissoes?: Permissao[];
  /** Onde fica a tela no sistema (ex.: "Nova venda"). */
  tela?: string;
  /** Endereço da tela, para o "Abrir a tela". */
  url?: string;
  /** Telas do sistema cuja ajuda é esta página (o "?" do cabeçalho delas leva para cá). */
  rotas: string[];
  /** Páginas do "Ver também": `pagina` (mesmo módulo) ou `modulo/pagina`. */
  ver: string[];
  atualizado?: string;
  corpo: string;
  secoes: SecaoDaPagina[];
}

export interface ModuloDaAjuda extends Omit<DefinicaoDeModulo, 'paginas'> {
  paginas: PaginaDaAjuda[];
}

const arquivos = import.meta.glob('./conteudo/*/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

/** `Condição de pagamento` → `condicao-de-pagamento` (âncora das seções). */
export const slug = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** Texto de um título sem a marcação inline (`código`, **negrito**, [link](x)). */
const textoPuro = (md: string) =>
  md
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[`*_]/g, '')
    .trim();

const lista = (valor?: string) =>
  (valor ?? '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);

function lerArquivo(texto: string) {
  const normalizado = texto.replace(/\r\n/g, '\n');
  const m = /^---\n([\s\S]*?)\n---\n?/.exec(normalizado);
  const campos: Record<string, string> = {};
  if (m) {
    for (const linha of m[1].split('\n')) {
      const i = linha.indexOf(':');
      if (i > 0) campos[linha.slice(0, i).trim()] = linha.slice(i + 1).trim();
    }
  }
  return { campos, corpo: m ? normalizado.slice(m[0].length) : normalizado };
}

/** Os `## títulos` do corpo, fora dos blocos de código: viram as âncoras e o "Nesta página". */
function lerSecoes(corpo: string): SecaoDaPagina[] {
  const secoes: SecaoDaPagina[] = [];
  let emBloco = false;
  for (const linha of corpo.split('\n')) {
    if (linha.startsWith('```')) emBloco = !emBloco;
    else if (!emBloco && linha.startsWith('## ')) {
      const titulo = textoPuro(linha.slice(3));
      secoes.push({ id: slug(titulo), titulo });
    }
  }
  return secoes;
}

const permissoesValidas = (valor?: string): Permissao[] | undefined => {
  const codigos = lista(valor);
  const invalidas = codigos.filter((c) => !(PERMISSOES as readonly string[]).includes(c));
  if (invalidas.length && import.meta.env.DEV) console.warn(`[ajuda] Permissão desconhecida: ${invalidas.join(', ')}`);
  const validas = codigos.filter((c): c is Permissao => (PERMISSOES as readonly string[]).includes(c));
  return validas.length ? validas : undefined;
};

function montarPagina(modulo: string, id: string, texto: string): PaginaDaAjuda {
  const { campos, corpo } = lerArquivo(texto);
  return {
    modulo,
    id,
    titulo: campos.titulo ?? id,
    resumo: campos.resumo ?? '',
    permissoes: permissoesValidas(campos.permissoes),
    tela: campos.tela || undefined,
    url: campos.url || undefined,
    rotas: lista(campos.rotas),
    ver: lista(campos.ver),
    atualizado: campos.atualizado || undefined,
    corpo,
    secoes: lerSecoes(corpo),
  };
}

/** Todos os módulos com as páginas na ordem do índice (sem filtro de permissão). */
export const MODULOS: ModuloDaAjuda[] = MODULOS_DA_AJUDA.map(({ paginas, ...modulo }) => ({
  ...modulo,
  paginas: paginas.flatMap((id) => {
    const texto = arquivos[`./conteudo/${modulo.id}/${id}.md`];
    if (texto === undefined) {
      if (import.meta.env.DEV) console.warn(`[ajuda] Falta o arquivo conteudo/${modulo.id}/${id}.md`);
      return [];
    }
    return [montarPagina(modulo.id, id, texto)];
  }),
}));

if (import.meta.env.DEV) {
  const noIndice = new Set(MODULOS_DA_AJUDA.flatMap((m) => m.paginas.map((p) => `./conteudo/${m.id}/${p}.md`)));
  Object.keys(arquivos)
    .filter((caminho) => !noIndice.has(caminho))
    .forEach((caminho) => console.warn(`[ajuda] ${caminho} não está no índice (modulos.ts)`));
}

export const urlDaPagina = (p: Pick<PaginaDaAjuda, 'modulo' | 'id'>, secao?: string) =>
  `/ajuda/${p.modulo}/${p.id}${secao ? `#${secao}` : ''}`;

/** Filtra módulos e páginas pelas permissões da pessoa (`usePermissoes().podeAlguma`). */
export const modulosVisiveis = (podeAlguma: (p: Permissao[]) => boolean): ModuloDaAjuda[] =>
  MODULOS.filter((m) => !m.permissoes || podeAlguma(m.permissoes))
    .map((m) => ({ ...m, paginas: m.paginas.filter((p) => !p.permissoes || podeAlguma(p.permissoes)) }))
    .filter((m) => m.paginas.length > 0);

/** A página da Ajuda de uma tela do sistema (o "?" do cabeçalho), entre as que a pessoa vê. */
export const paginaDaTela = (pathname: string, modulos: ModuloDaAjuda[]): PaginaDaAjuda | undefined =>
  modulos.flatMap((m) => m.paginas).find((p) => p.rotas.some((rota) => matchPath({ path: rota, end: true }, pathname)));
