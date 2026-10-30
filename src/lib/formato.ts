import { FUSO } from './env'

const numero = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 })
const numero3 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 })
const pct = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })

export function fmtNumero(valor: number | null | undefined, casas: 2 | 3 = 2) {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return '—'
  return (casas === 3 ? numero3 : numero).format(valor)
}

export function fmtVolume(valor: number | null | undefined, unidade: string = 'L') {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return '—'
  return `${numero.format(valor)} ${unidade}`
}

export function fmtPct(valor: number | null | undefined) {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return '—'
  return `${pct.format(valor)}%`
}

export function fmtDataHora(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(iso),
  )
}

export function fmtHora(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
}

/** "2026-10-30" -> "30/10/2026" */
export function fmtData(dataIso: string | null | undefined) {
  if (!dataIso) return '—'
  const [ano, mes, dia] = dataIso.slice(0, 10).split('-')
  return `${dia}/${mes}/${ano}`
}

/** Data de hoje (yyyy-mm-dd) no fuso de Brasília. */
export function hojeIso(base: Date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    base,
  )
}

/** Intervalo UTC [início, fim) de um dia local (yyyy-mm-dd) no fuso de Brasília (UTC-3, sem horário de verão). */
export function intervaloDoDia(dataIso: string) {
  const inicio = new Date(`${dataIso}T00:00:00-03:00`)
  const fim = new Date(inicio.getTime() + 24 * 60 * 60 * 1000)
  return { inicio: inicio.toISOString(), fim: fim.toISOString() }
}

export function tempoDesde(iso: string | null | undefined, agora: number = Date.now()) {
  if (!iso) return 'sem registro'
  const minutos = Math.round((agora - new Date(iso).getTime()) / 60000)
  if (minutos < 1) return 'agora'
  if (minutos < 60) return `há ${minutos} min`
  const horas = Math.round(minutos / 60)
  if (horas < 24) return `há ${horas} h`
  const dias = Math.round(horas / 24)
  return dias === 1 ? 'há 1 dia' : `há ${dias} dias`
}

export function horasDesde(iso: string | null | undefined, agora: number = Date.now()) {
  if (!iso) return Infinity
  return (agora - new Date(iso).getTime()) / 3_600_000
}
