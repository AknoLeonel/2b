'use client'

import { useMemo, useState, useTransition } from 'react'
import { CampoNumero, paraCampo } from '@/components/sistema/campo-numero'
import { Aviso } from '@/components/sistema/ui'
import { TOLERANCIA_LMC, variacaoLmc } from '@/lib/estoque'
import { fmtDataHora, fmtNumero, fmtPct, fmtVolume } from '@/lib/formato'
import { lerNumero } from '@/lib/numero'
import { relatorioFechamento } from '@/lib/relatorio'
import { registrarFechamento } from '../acoes'
import { PainelRelatorio } from './painel-relatorio'

export interface ProdutoFechamento {
  codigo: string
  nome: string
  unidade: 'L' | 'un'
  capacidade: number
  ultimaRegua: number | null
  medidoEm: string | null
  sugestaoVendido: number | null
}

type Linha = { inicial: string; descarga: string; vendido: string; regua: string }

function calcular(l: Linha) {
  const inicial = lerNumero(l.inicial)
  const descarga = lerNumero(l.descarga)
  const vendido = lerNumero(l.vendido)
  const regua = lerNumero(l.regua)
  const invalido = [inicial, descarga, vendido, regua].some((n) => Number.isNaN(n))
  const temMovimento = inicial !== null || descarga !== null || vendido !== null
  const final = !invalido && temMovimento ? (inicial ?? 0) + (descarga ?? 0) - (vendido ?? 0) : null
  const diferenca = final !== null && regua !== null && !Number.isNaN(regua) ? regua - final : null
  // O estoque inicial vem preenchido: sozinho ele não conta como lançamento do produto.
  const vazio = descarga === null && vendido === null && regua === null
  return { inicial, descarga, vendido, regua, invalido, final, diferenca, vazio }
}

export function FormFechamento({
  posto,
  produtos,
  encerrantes,
}: {
  posto: { id: string; nome: string }
  produtos: ProdutoFechamento[]
  encerrantes: { numero: number; valor: number | null }[]
}) {
  const inicial = () =>
    Object.fromEntries(
      produtos.map((p) => [p.codigo, { inicial: paraCampo(p.ultimaRegua), descarga: '', vendido: '', regua: '' }]),
    ) as Record<string, Linha>

  const [linhas, setLinhas] = useState<Record<string, Linha>>(inicial)
  const [observacao, setObservacao] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [relatorio, setRelatorio] = useState<string | null>(null)
  const [salvando, iniciar] = useTransition()

  const calculos = useMemo(
    () => Object.fromEntries(produtos.map((p) => [p.codigo, calcular(linhas[p.codigo])])),
    [linhas, produtos],
  )
  const totalVendido = produtos
    .filter((p) => p.unidade === 'L')
    .reduce((soma, p) => soma + (calculos[p.codigo].vendido || 0), 0)

  function alterar(codigo: string, campo: keyof Linha, valor: string) {
    setLinhas((atual) => ({ ...atual, [codigo]: { ...atual[codigo], [campo]: valor } }))
  }

  function salvar(evento: React.FormEvent) {
    evento.preventDefault()
    setErro(null)
    if (produtos.some((p) => calculos[p.codigo].invalido)) {
      setErro('Corrija os campos marcados em vermelho.')
      return
    }
    const itens = produtos
      .filter((p) => !calculos[p.codigo].vazio)
      .map((p) => {
        const c = calculos[p.codigo]
        return { produto: p.codigo, inicial: c.inicial, descarga: c.descarga, vendido: c.vendido, regua: c.regua }
      })
    if (!itens.length) {
      setErro('Preencha ao menos um produto.')
      return
    }

    iniciar(async () => {
      const resultado = await registrarFechamento({ postoId: posto.id, itens, observacao })
      if (!resultado.ok) {
        setErro(resultado.mensagem)
        return
      }
      setRelatorio(
        relatorioFechamento({
          posto: posto.nome,
          quando: new Date(),
          observacao,
          encerrantes,
          linhas: produtos
            .filter((p) => !calculos[p.codigo].vazio)
            .map((p) => {
              const c = calculos[p.codigo]
              return {
                nome: p.nome,
                unidade: p.unidade,
                inicial: c.inicial,
                descarga: c.descarga,
                vendido: c.vendido,
                regua: c.regua,
                diferenca: c.diferenca,
              }
            }),
        }),
      )
      window.scrollTo({ top: 0, behavior: 'smooth' })
    })
  }

  if (relatorio) {
    return (
      <PainelRelatorio
        texto={relatorio}
        aoNovo={() => {
          setRelatorio(null)
          setLinhas(inicial())
          setObservacao('')
        }}
      />
    )
  }

  return (
    <form onSubmit={salvar} noValidate className="pb-28 md:pb-0">
      <div className="grid gap-4 lg:grid-cols-2">
        {produtos.map((p) => {
          const l = linhas[p.codigo]
          const c = calculos[p.codigo]
          const variacao = variacaoLmc(c.diferenca, c.inicial, c.descarga)
          const acimaTolerancia = variacao !== null && Math.abs(variacao) > TOLERANCIA_LMC
          const acimaCapacidade =
            p.capacidade > 0 && c.regua !== null && !Number.isNaN(c.regua) && c.regua > p.capacidade
          const vendidoNegativo = c.final !== null && c.final < 0

          return (
            <fieldset key={p.codigo} className="cartao p-4">
              <legend className="sr-only">{p.nome}</legend>
              <div className="mb-3 flex items-baseline justify-between gap-2">
                <h2 className="text-base font-extrabold text-tinta">{p.nome}</h2>
                {p.capacidade > 0 ? (
                  <span className="tabular text-xs text-slate-500">
                    Capacidade {fmtVolume(p.capacidade, p.unidade)}
                  </span>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                <CampoNumero
                  rotulo="Estoque inicial"
                  unidade={p.unidade}
                  valor={l.inicial}
                  aoMudar={(v) => alterar(p.codigo, 'inicial', v)}
                  dica={
                    p.ultimaRegua !== null ? (
                      <span className="text-slate-500">Última régua {fmtDataHora(p.medidoEm)}</span>
                    ) : null
                  }
                />
                <CampoNumero
                  rotulo="Descarga"
                  unidade={p.unidade}
                  valor={l.descarga}
                  aoMudar={(v) => alterar(p.codigo, 'descarga', v)}
                />
                <CampoNumero
                  rotulo="Vendido"
                  unidade={p.unidade}
                  valor={l.vendido}
                  aoMudar={(v) => alterar(p.codigo, 'vendido', v)}
                  dica={
                    p.sugestaoVendido !== null && lerNumero(l.vendido) !== p.sugestaoVendido ? (
                      <button
                        type="button"
                        className="font-bold text-marca underline"
                        onClick={() => alterar(p.codigo, 'vendido', paraCampo(p.sugestaoVendido))}
                      >
                        Usar encerrantes: {fmtNumero(p.sugestaoVendido)}
                      </button>
                    ) : null
                  }
                />
                <CampoNumero
                  rotulo="Régua (medição)"
                  unidade={p.unidade}
                  valor={l.regua}
                  aoMudar={(v) => alterar(p.codigo, 'regua', v)}
                  destaque
                />
              </div>

              <dl className="mt-2 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-sm">
                <div>
                  <dt className="text-xs font-semibold text-slate-500">Estoque final calculado</dt>
                  <dd className={`tabular font-extrabold ${vendidoNegativo ? 'text-red-700' : 'text-tinta'}`}>
                    {fmtVolume(c.final, p.unidade)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-slate-500">Diferença (régua − final)</dt>
                  <dd
                    className={`tabular font-extrabold ${
                      c.diferenca === null ? 'text-slate-400' : c.diferenca < 0 ? 'text-red-700' : 'text-emerald-700'
                    }`}
                  >
                    {c.diferenca === null
                      ? '—'
                      : `${c.diferenca > 0 ? '+' : ''}${fmtVolume(c.diferenca, p.unidade)}${
                          variacao !== null ? ` (${fmtPct(variacao * 100)})` : ''
                        }`}
                  </dd>
                </div>
              </dl>

              {acimaTolerancia ? (
                <Aviso tipo="atencao" className="mt-2">
                  Variação acima de 0,6% (tolerância usual do LMC). Confira a medição e explique na observação.
                </Aviso>
              ) : null}
              {acimaCapacidade ? (
                <Aviso tipo="atencao" className="mt-2">
                  Régua maior que a capacidade do tanque.
                </Aviso>
              ) : null}
              {vendidoNegativo ? (
                <Aviso tipo="erro" className="mt-2">
                  Vendido maior que o estoque disponível.
                </Aviso>
              ) : null}
            </fieldset>
          )
        })}
      </div>

      <div className="cartao mt-4 p-4">
        <label htmlFor="observacao" className="rotulo">
          Observação (opcional)
        </label>
        <textarea
          id="observacao"
          className="campo min-h-20 py-2"
          maxLength={1000}
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          placeholder="Ex.: descarga do caminhão às 14h, aferição de bomba…"
        />
      </div>

      {erro ? (
        <Aviso tipo="erro" className="mt-4">
          {erro}
        </Aviso>
      ) : null}

      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-slate-200 bg-white/95 p-3 backdrop-blur md:static md:mt-4 md:rounded-2xl md:border md:p-4">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-500">Total vendido</p>
            <p className="tabular truncate text-xl font-extrabold text-tinta">{fmtVolume(totalVendido)}</p>
          </div>
          <button type="submit" className="botao-primario flex-1" disabled={salvando}>
            {salvando ? 'Salvando…' : 'Salvar fechamento'}
          </button>
        </div>
      </div>
    </form>
  )
}
