import { fmtNumero } from './formato'

export interface LinhaRelatorio {
  nome: string
  unidade: string
  inicial: number | null
  descarga: number | null
  vendido: number | null
  regua: number | null
  diferenca: number | null
}

/** Texto do fechamento no mesmo formato usado nos grupos de WhatsApp da rede. */
export function relatorioFechamento({
  posto,
  quando,
  linhas,
  encerrantes,
  observacao,
}: {
  posto: string
  quando: Date
  linhas: LinhaRelatorio[]
  encerrantes: { numero: number; valor: number | null }[]
  observacao?: string | null
}) {
  const dataHora = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(quando)

  let texto = `📊 *FECHAMENTO - 2B*\n🏢 Posto: ${posto}\n🕒 Horário: ${dataHora}\n\n`
  let totalVendido = 0

  for (const l of linhas) {
    if (l.inicial === null && l.descarga === null && l.vendido === null && l.regua === null) continue
    const u = l.unidade
    if (l.unidade === 'L') totalVendido += l.vendido ?? 0
    texto += `⛽ *${l.nome.toUpperCase()}*\n`
    texto += `Inicial: ${fmtNumero(l.inicial ?? 0)} ${u} | Descarga: ${fmtNumero(l.descarga ?? 0)} ${u}\n`
    texto += `Vendido: ${fmtNumero(l.vendido ?? 0)} ${u} | Régua: ${fmtNumero(l.regua ?? 0)} ${u}\n`
    if (l.diferenca !== null) {
      texto += `*Diferença:* ${l.diferenca < 0 ? '🔴' : '🟢'} ${fmtNumero(l.diferenca)} ${u}\n`
    }
    texto += '\n'
  }

  const lidos = encerrantes.filter((e) => e.valor !== null)
  if (lidos.length) {
    texto += '🔢 *ENCERRANTES DOS BICOS*\n'
    for (const e of lidos) texto += `Bico ${e.numero}: ${fmtNumero(e.valor, 3)}\n`
    texto += '\n'
  }

  if (observacao) texto += `📝 ${observacao}\n\n`
  texto += `💰 *TOTAL VENDIDO:* ${fmtNumero(totalVendido)} L`
  return texto
}
