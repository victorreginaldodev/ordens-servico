/** Hoje no formato do campo de data (`AAAA-MM-DD`), no fuso de quem usa: o padrão da data do lançamento. */
export const hoje = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
