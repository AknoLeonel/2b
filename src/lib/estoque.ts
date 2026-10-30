export type Nivel = 'sem-dado' | 'sem-capacidade' | 'critico' | 'atencao' | 'ok'

export function nivelDoTanque(
  estoque: number | null,
  capacidade: number,
  criticoPct = 15,
  atencaoPct = 30,
): { nivel: Nivel; pct: number | null } {
  if (estoque === null || estoque === undefined) return { nivel: 'sem-dado', pct: null }
  if (!capacidade || capacidade <= 0) return { nivel: 'sem-capacidade', pct: null }
  const pct = (estoque / capacidade) * 100
  if (pct < criticoPct) return { nivel: 'critico', pct }
  if (pct < atencaoPct) return { nivel: 'atencao', pct }
  return { nivel: 'ok', pct }
}

/** Dias de cobertura do estoque pela média diária de vendas. */
export function diasDeCobertura(estoque: number | null, mediaDiaria: number | null) {
  if (estoque === null || !mediaDiaria || mediaDiaria <= 0) return null
  return estoque / mediaDiaria
}

/** Tolerância usual de perdas/sobras no LMC (0,6% do estoque disponível). */
export const TOLERANCIA_LMC = 0.006

export function variacaoLmc(diferenca: number | null, inicial: number | null, descarga: number | null) {
  const base = (inicial ?? 0) + (descarga ?? 0)
  if (diferenca === null || base <= 0) return null
  return diferenca / base
}
