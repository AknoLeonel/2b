/** Moldura com rolagem lateral para tabelas no formato de planilha. */
export function MolduraPlanilha({
  rotulo,
  children,
  dicaRolagem = true,
}: {
  rotulo: string
  children: React.ReactNode
  dicaRolagem?: boolean
}) {
  return (
    <div>
      {dicaRolagem ? (
        <p className="mb-1.5 text-sm font-semibold text-slate-700 md:hidden" aria-hidden="true">
          ↔ Arraste a tabela para o lado para ver todas as colunas
        </p>
      ) : null}
      <div className="moldura-planilha" role="region" aria-label={rotulo} tabIndex={0}>
        {children}
      </div>
    </div>
  )
}
