/**
 * Navegação de planilha: Enter (ou ↓) desce para a linha de baixo na mesma
 * coluna, Shift+Enter (ou ↑) sobe. No fim da coluna o Enter vai para o topo
 * da próxima coluna; na última célula o foco fica onde está. Também impede que
 * o Enter envie o formulário sem querer.
 * Os campos precisam de data-lin (número da linha) e data-col (nome da coluna).
 */
export function aoTeclarNaPlanilha(evento: React.KeyboardEvent<HTMLInputElement>) {
  const { key, shiftKey } = evento
  if (key !== 'Enter' && key !== 'ArrowDown' && key !== 'ArrowUp') return
  const campo = evento.currentTarget
  const tabela = campo.closest('table')
  if (!tabela) return
  evento.preventDefault()

  const coluna = campo.dataset.col
  const daColuna = [...tabela.querySelectorAll<HTMLInputElement>(`input[data-col="${coluna}"]`)]
  const posicao = daColuna.indexOf(campo)
  const sobe = key === 'ArrowUp' || (key === 'Enter' && shiftKey)
  let destino: HTMLInputElement | undefined = daColuna[posicao + (sobe ? -1 : 1)]

  if (!destino && key === 'Enter' && !sobe) {
    const colunas = [
      ...new Set([...tabela.querySelectorAll<HTMLInputElement>('input[data-col]')].map((c) => c.dataset.col)),
    ]
    const proxima = colunas[colunas.indexOf(coluna) + 1]
    destino = proxima
      ? (tabela.querySelector<HTMLInputElement>(`input[data-col="${proxima}"]`) ?? undefined)
      : undefined
  }

  // no fim da planilha o foco fica onde está (não some da tela)
  if (destino) {
    destino.focus()
    destino.select()
  }
}
