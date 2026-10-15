/** Rola até a seção (`id` do título) dentro da área de rolagem do layout. */
export const rolarAte = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
