/**
 * Converte o que o usuário digitou (padrão brasileiro ou não) em número.
 *   "30950" -> 30950 | "30.950" -> 30950 | "1.234,5" -> 1234.5
 *   "123456,789" -> 123456.789 | "123456.789" -> 123456.789
 * Retorna null para vazio e NaN para texto inválido.
 */
export function lerNumero(texto: string | null | undefined): number | null {
  if (texto === null || texto === undefined) return null
  let t = String(texto).trim().replace(/\s/g, '')
  if (t === '') return null
  if (!/^[0-9.,]+$/.test(t)) return Number.NaN

  const temPonto = t.includes('.')
  const temVirgula = t.includes(',')
  if (temPonto && temVirgula) {
    t = t.replace(/\./g, '').replace(',', '.')
  } else if (temVirgula) {
    if ((t.match(/,/g) ?? []).length > 1) return Number.NaN
    t = t.replace(',', '.')
  } else if (temPonto && /^\d{1,3}(\.\d{3})+$/.test(t)) {
    t = t.replace(/\./g, '')
  }

  const n = Number(t)
  return Number.isFinite(n) ? n : Number.NaN
}
