'use client'

import { useEffect, useId, useRef, useState, useTransition } from 'react'
import { paraCampo } from '@/components/sistema/campo-numero'
import { MolduraPlanilha } from '@/components/sistema/planilha'
import { aoTeclarNaPlanilha } from '@/components/sistema/teclado-planilha'
import { Aviso } from '@/components/sistema/ui'
import { TOLERANCIA_LMC, variacaoLmc } from '@/lib/estoque'
import { fmtHora, fmtNumero, fmtPct, fmtVolume, tempoDesde } from '@/lib/formato'
import { lerNumero } from '@/lib/numero'
import { relatorioFechamento } from '@/lib/relatorio'
import type { BicoTurno } from '@/lib/tipos'
import { registrarEncerrantes, registrarFechamento } from '../acoes'
import { PainelRelatorio } from './painel-relatorio'

export interface ProdutoTurno {
  codigo: string
  nome: string
  unidade: 'L' | 'un'
  capacidade: number
  ultimaRegua: number | null
  medidoEm: string | null
}

type Linha = { inicial: string; descarga: string; vendido: string; regua: string }

const ROTULO_CAMPO: Record<keyof Linha, string> = {
  inicial: 'estoque inicial',
  descarga: 'descarga',
  vendido: 'vendido',
  regua: 'régua',
}

/** Arredonda para evitar "-0" e restos de ponto flutuante (o banco guarda 2 casas). */
const r2 = (n: number) => Math.round(n * 100) / 100 || 0
const r3 = (n: number) => Math.round(n * 1000) / 1000 || 0

function chaveLeituras(leituras: Record<string, string>) {
  return JSON.stringify(
    Object.entries(leituras)
      .filter(([, v]) => v.trim() !== '')
      .sort(),
  )
}

function estadoInicial(bicos: BicoTurno[], produtos: ProdutoTurno[]) {
  const leituras = Object.fromEntries(bicos.map((b) => [b.bico_id, paraCampo(b.atual)]))
  const salvoEm = bicos
    .map((b) => b.atualEm)
    .filter((d): d is string => Boolean(d))
    .sort()
    .at(-1)
  const linhas = Object.fromEntries(
    produtos.map((p) => [p.codigo, { inicial: paraCampo(p.ultimaRegua), descarga: '', vendido: '', regua: '' }]),
  ) as Record<string, Linha>
  return { leituras, salvoEm: salvoEm ?? null, salvas: chaveLeituras(leituras), linhas }
}

export function TelaTurno({
  posto,
  bicos,
  produtos,
}: {
  posto: { id: string; nome: string }
  bicos: BicoTurno[]
  produtos: ProdutoTurno[]
}) {
  const id = useId()
  const [leituras, setLeituras] = useState(() => estadoInicial(bicos, produtos).leituras)
  const [salvas, setSalvas] = useState(() => estadoInicial(bicos, produtos).salvas)
  const [salvoEm, setSalvoEm] = useState(() => estadoInicial(bicos, produtos).salvoEm)
  const [linhas, setLinhas] = useState(() => estadoInicial(bicos, produtos).linhas)
  const [vendidoManual, setVendidoManual] = useState<Record<string, boolean>>({})
  const [obsBicos, setObsBicos] = useState('')
  const [observacao, setObservacao] = useState('')
  const [erroEnc, setErroEnc] = useState<string | null>(null)
  const [erroPlan, setErroPlan] = useState<string | null>(null)
  const [relatorio, setRelatorio] = useState<string | null>(null)
  const [focarInicio, setFocarInicio] = useState(false)
  const passo1 = useRef<HTMLHeadingElement>(null)
  const [salvando, iniciar] = useTransition()

  useEffect(() => {
    if (focarInicio && !relatorio) {
      passo1.current?.focus()
      setFocarInicio(false)
    }
  }, [focarInicio, relatorio])

  // ---- encerrantes -------------------------------------------------
  const leitura = (bicoId: string) => lerNumero(leituras[bicoId])
  const litros = (b: BicoTurno) => {
    const atual = leitura(b.bico_id)
    return atual !== null && !Number.isNaN(atual) && b.base !== null ? r3(atual - b.base) : null
  }
  const encerrantesInvalidos = bicos.some((b) => Number.isNaN(leitura(b.bico_id)))
  const encerrantesPendentes = chaveLeituras(leituras) !== salvas && bicos.some((b) => leitura(b.bico_id) !== null)

  const pelosBicos: Record<string, number> = {}
  for (const b of bicos) {
    const l = litros(b)
    if (l === null || !b.produto_codigo) continue
    pelosBicos[b.produto_codigo] = r2((pelosBicos[b.produto_codigo] ?? 0) + Math.max(0, l))
  }

  // ---- planilha ----------------------------------------------------
  const automatico = (codigo: string) => !vendidoManual[codigo] && pelosBicos[codigo] !== undefined
  const vendidoTexto = (codigo: string) => (automatico(codigo) ? paraCampo(pelosBicos[codigo]) : linhas[codigo].vendido)

  const calculos = Object.fromEntries(
    produtos.map((p) => {
      const l = linhas[p.codigo]
      const inicial = lerNumero(l.inicial)
      const descarga = lerNumero(l.descarga)
      const vendido = lerNumero(vendidoTexto(p.codigo))
      const regua = lerNumero(l.regua)
      const invalido = [inicial, descarga, vendido, regua].some((n) => Number.isNaN(n))
      const temMovimento = inicial !== null || descarga !== null || vendido !== null
      const final = !invalido && temMovimento ? r2((inicial ?? 0) + (descarga ?? 0) - (vendido ?? 0)) : null
      const diferenca = final !== null && regua !== null && !invalido ? r2(regua - final) : null
      const variacao = variacaoLmc(diferenca, inicial, descarga)
      return [
        p.codigo,
        {
          inicial,
          descarga,
          vendido,
          regua,
          invalido,
          final,
          diferenca,
          variacao,
          avisos: [
            final !== null && final < 0 ? 'o vendido ficou maior que o estoque (estoque final negativo).' : null,
            p.capacidade > 0 && regua !== null && !invalido && regua > p.capacidade
              ? 'a régua passou da capacidade do tanque.'
              : null,
            variacao !== null && Math.abs(variacao) > TOLERANCIA_LMC
              ? 'diferença acima de 0,6% (tolerância usual do LMC). Confira a medição e explique na observação.'
              : null,
          ].filter((a): a is string => a !== null),
          // o estoque inicial vem preenchido: sozinho ele não conta como lançamento
          vazio: descarga === null && vendido === null && regua === null,
        },
      ]
    }),
  )
  const totalVendido = r2(
    produtos
      .filter((p) => p.unidade === 'L')
      .reduce((s, p) => s + (Number.isNaN(calculos[p.codigo].vendido) ? 0 : (calculos[p.codigo].vendido ?? 0)), 0),
  )
  const comAviso = produtos.filter((p) => calculos[p.codigo].avisos.length)

  function alterar(codigo: string, campo: keyof Linha, valor: string) {
    // apagar o vendido devolve o cálculo automático pelos encerrantes
    if (campo === 'vendido') setVendidoManual((m) => ({ ...m, [codigo]: valor.trim() !== '' }))
    setLinhas((atual) => ({ ...atual, [codigo]: { ...atual[codigo], [campo]: valor } }))
  }

  async function gravarEncerrantes(): Promise<boolean> {
    setErroEnc(null)
    if (encerrantesInvalidos) {
      setErroEnc('Há leitura com número inválido. Corrija a linha marcada antes de salvar.')
      return false
    }
    const preenchidos = bicos.filter((b) => leitura(b.bico_id) !== null)
    if (!preenchidos.length) {
      setErroEnc('Digite a leitura de pelo menos um bico.')
      return false
    }
    const menores = preenchidos.filter((b) => (litros(b) ?? 0) < 0)
    if (
      menores.length &&
      !window.confirm(
        `ATENÇÃO: a leitura do ${menores.map((b) => `bico ${b.numero}`).join(', ')} ficou MENOR que a anterior.\n\nToque em OK para salvar assim mesmo, ou em Cancelar para corrigir.`,
      )
    ) {
      setErroEnc(
        `Nada foi salvo. Confira a leitura do ${menores.map((b) => `bico ${b.numero}`).join(', ')}: está menor que a anterior.`,
      )
      return false
    }
    const r = await registrarEncerrantes({
      postoId: posto.id,
      observacao: obsBicos,
      itens: preenchidos.map((b) => ({ bico_id: b.bico_id, valor: leitura(b.bico_id) as number })),
    })
    if (!r.ok) {
      setErroEnc(r.mensagem)
      return false
    }
    setSalvas(chaveLeituras(leituras))
    setSalvoEm(new Date().toISOString())
    return true
  }

  function salvarSoEncerrantes() {
    iniciar(async () => {
      await gravarEncerrantes()
    })
  }

  function salvarPlanilha() {
    setErroPlan(null)
    if (produtos.some((p) => calculos[p.codigo].invalido)) {
      setErroPlan('Há número inválido na planilha. Corrija a célula marcada "número inválido".')
      return
    }
    const itens = produtos
      .filter((p) => !calculos[p.codigo].vazio)
      .map((p) => {
        const c = calculos[p.codigo]
        return { produto: p.codigo, inicial: c.inicial, descarga: c.descarga, vendido: c.vendido, regua: c.regua }
      })
    if (!itens.length) {
      setErroPlan('Preencha a planilha: pelo menos o vendido ou a régua de um produto.')
      return
    }

    iniciar(async () => {
      if (encerrantesPendentes && !(await gravarEncerrantes())) {
        setErroPlan('A planilha não foi salva porque os encerrantes têm um problema. Veja o aviso no passo 1.')
        return
      }
      const r = await registrarFechamento({ postoId: posto.id, itens, observacao })
      if (!r.ok) {
        setErroPlan(r.mensagem)
        return
      }
      setRelatorio(
        relatorioFechamento({
          posto: posto.nome,
          quando: new Date(),
          observacao,
          encerrantes: bicos.map((b) => ({ numero: b.numero, valor: leitura(b.bico_id) })),
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
    })
  }

  // Depois de salvar, as props já vêm do servidor com o novo turno:
  // a base passa a ser a leitura recém-salva e nada fica pré-preenchido.
  function novoTurno() {
    const novo = estadoInicial(bicos, produtos)
    setLeituras(novo.leituras)
    setSalvas(novo.salvas)
    setSalvoEm(novo.salvoEm)
    setLinhas(novo.linhas)
    setVendidoManual({})
    setObsBicos('')
    setObservacao('')
    setErroEnc(null)
    setErroPlan(null)
    setRelatorio(null)
    setFocarInicio(true)
  }

  if (relatorio) return <PainelRelatorio texto={relatorio} aoNovo={novoTurno} />

  return (
    <div className="space-y-10">
      {/* PASSO 1 — ENCERRANTES */}
      <div>
        <h3 ref={passo1} tabIndex={-1} className="mb-1 text-xl font-extrabold text-tinta focus:outline-none">
          Passo 1 · Leitura dos encerrantes (bicos)
        </h3>
        <p className="mb-3 text-base text-slate-700">
          Digite a leitura de cada bico e aperte <kbd className="rounded border border-slate-400 px-1">Enter</kbd> para
          descer. Os litros vendidos aparecem sozinhos.
        </p>
        {bicos.length ? (
          <MolduraPlanilha rotulo="Planilha de encerrantes" dicaRolagem={false}>
            <table className="planilha min-w-[22rem]">
              <caption className="sr-only">Encerrantes dos bicos</caption>
              <thead>
                <tr>
                  <th scope="col" className="fixa text-left">
                    Bico
                  </th>
                  <th scope="col">Leitura agora</th>
                  <th scope="col" className="calc">
                    Litros
                  </th>
                  <th scope="col">Leitura anterior</th>
                </tr>
              </thead>
              <tbody>
                {bicos.map((b, i) => {
                  const l = litros(b)
                  const invalido = Number.isNaN(leitura(b.bico_id))
                  const erroId = `${id}-bico-${b.numero}`
                  return (
                    <tr key={b.bico_id}>
                      <th scope="row" className="fixa">
                        Bico {b.numero}
                        <span className="block text-sm font-semibold text-slate-700">{b.descricao}</span>
                      </th>
                      <td className={`entrada ${invalido ? 'invalida' : ''}`}>
                        <input
                          type="text"
                          inputMode="decimal"
                          autoComplete="off"
                          enterKeyHint="next"
                          data-lin={i}
                          data-col="leitura"
                          aria-label={`Bico ${b.numero}, leitura agora`}
                          aria-invalid={invalido || undefined}
                          aria-describedby={invalido ? erroId : undefined}
                          value={leituras[b.bico_id] ?? ''}
                          onChange={(e) => setLeituras((a) => ({ ...a, [b.bico_id]: e.target.value }))}
                          onKeyDown={aoTeclarNaPlanilha}
                        />
                        {invalido ? (
                          <span id={erroId} className="block px-3 pb-1 text-right text-sm font-bold text-red-800">
                            número inválido
                          </span>
                        ) : null}
                      </td>
                      <td className={`calc num ${l !== null && l < 0 ? 'bg-red-100 text-red-800' : ''}`}>
                        {l === null ? '—' : l < 0 ? `⚠ ${fmtNumero(l, 3)} (menor)` : fmtNumero(l, 3)}
                      </td>
                      <td className="num text-slate-800">
                        {b.base === null ? (
                          <span className="text-slate-700">sem leitura</span>
                        ) : (
                          <>
                            {fmtNumero(b.base, 3)}
                            <span className="block text-sm text-slate-700">{tempoDesde(b.baseEm)}</span>
                          </>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </MolduraPlanilha>
        ) : (
          <p className="text-base text-slate-700">Nenhum bico cadastrado para este posto.</p>
        )}

        {Object.keys(pelosBicos).length ? (
          <p className="mt-3 text-base text-slate-800">
            <strong>Vendido pelos bicos:</strong>{' '}
            {produtos
              .filter((p) => pelosBicos[p.codigo] !== undefined)
              .map((p) => `${p.nome}: ${fmtVolume(pelosBicos[p.codigo])}`)
              .join(' · ')}
          </p>
        ) : null}

        <label htmlFor={`${id}-obs-bicos`} className="rotulo mt-4">
          Observação dos bicos (se precisar)
        </label>
        <input
          id={`${id}-obs-bicos`}
          className="campo"
          maxLength={1000}
          value={obsBicos}
          onChange={(e) => setObsBicos(e.target.value)}
          placeholder="Ex.: bico 4 em manutenção"
        />

        {erroEnc ? (
          <Aviso tipo="erro" className="mt-3">
            {erroEnc}
          </Aviso>
        ) : null}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            className="botao-escuro w-full sm:w-auto"
            disabled={salvando || !bicos.length}
            onClick={salvarSoEncerrantes}
          >
            {salvando ? 'Salvando…' : 'Salvar encerrantes'}
          </button>
          <p className="text-base font-semibold text-slate-700" aria-live="polite">
            {encerrantesPendentes
              ? 'Leituras ainda não salvas — também são salvas junto com a planilha.'
              : salvoEm
                ? `✓ Encerrantes deste turno salvos às ${fmtHora(salvoEm)}.`
                : null}
          </p>
        </div>
      </div>

      {/* PASSO 2 — PLANILHA */}
      <div>
        <h3 className="mb-1 text-xl font-extrabold text-tinta">Passo 2 · Planilha de fechamento de turno</h3>
        <p className="mb-3 text-base text-slate-700">
          O estoque inicial já vem da última régua. Confira, preencha a descarga (se teve) e a{' '}
          <strong className="text-marca">régua</strong> de cada tanque.
        </p>
        <MolduraPlanilha rotulo="Planilha de fechamento de turno">
          <table className="planilha min-w-[48rem]">
            <caption className="sr-only">Planilha de fechamento de turno</caption>
            <thead>
              <tr>
                <th scope="col" className="fixa text-left">
                  Conteúdo
                </th>
                <th scope="col">Est. inicial</th>
                <th scope="col">Descarga</th>
                <th scope="col">Vendido</th>
                <th scope="col" className="calc">
                  Est. final
                </th>
                <th scope="col" className="text-marca">
                  Régua
                </th>
                <th scope="col" className="calc">
                  Diferença
                </th>
              </tr>
            </thead>
            <tbody>
              {produtos.map((p, i) => {
                const l = linhas[p.codigo]
                const c = calculos[p.codigo]
                const auto = automatico(p.codigo)
                const celula = (campo: keyof Linha, valor: string) => {
                  const invalido = Number.isNaN(lerNumero(valor))
                  const dica = invalido ? 'número inválido' : campo === 'vendido' && auto ? 'pelos bicos' : null
                  const dicaId = `${id}-${p.codigo}-${campo}`
                  return (
                    <td
                      className={`entrada ${invalido ? 'invalida' : ''} ${campo === 'vendido' && auto ? 'auto' : ''}`}
                    >
                      <input
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        enterKeyHint="next"
                        data-lin={i}
                        data-col={campo}
                        aria-label={`${p.nome}, ${ROTULO_CAMPO[campo]}`}
                        aria-invalid={invalido || undefined}
                        aria-describedby={dica ? dicaId : undefined}
                        value={valor}
                        onChange={(e) => alterar(p.codigo, campo, e.target.value)}
                        onKeyDown={aoTeclarNaPlanilha}
                      />
                      {dica ? (
                        <span
                          id={dicaId}
                          className={`block px-3 pb-1 text-right text-sm font-bold ${invalido ? 'text-red-800' : 'text-sky-900'}`}
                        >
                          {dica}
                        </span>
                      ) : null}
                    </td>
                  )
                }
                return (
                  <tr key={p.codigo}>
                    <th scope="row" className="fixa">
                      {p.nome}
                      {p.unidade === 'un' ? (
                        <span className="block text-sm font-semibold text-slate-700">(unidades)</span>
                      ) : null}
                    </th>
                    {celula('inicial', l.inicial)}
                    {celula('descarga', l.descarga)}
                    {celula('vendido', vendidoTexto(p.codigo))}
                    <td className={`calc num ${c.final !== null && c.final < 0 ? 'bg-red-100 text-red-800' : ''}`}>
                      {c.final === null ? '—' : `${c.final < 0 ? '⚠ ' : ''}${fmtNumero(c.final)}`}
                    </td>
                    {celula('regua', l.regua)}
                    <td
                      className={`calc num ${
                        c.diferenca === null || c.diferenca === 0
                          ? ''
                          : c.diferenca < 0
                            ? 'bg-red-100 text-red-800'
                            : 'bg-emerald-100 text-emerald-900'
                      }`}
                    >
                      {c.diferenca === null ? (
                        '—'
                      ) : (
                        <>
                          {c.avisos.length ? '⚠ ' : ''}
                          {c.diferenca > 0 ? '+' : ''}
                          {fmtNumero(c.diferenca)}
                          {c.variacao !== null ? (
                            <span className="block text-sm font-bold">{fmtPct(c.variacao * 100)}</span>
                          ) : null}
                        </>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row" className="fixa text-left">
                  TOTAL VENDIDO
                </th>
                <td colSpan={2} />
                <td className="num">{fmtNumero(totalVendido)} L</td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          </table>
        </MolduraPlanilha>
        <p className="mt-2 text-sm font-semibold text-slate-700">
          “Pelos bicos” (fundo azul): vendido calculado pelos encerrantes. Você pode trocar o valor; apague para voltar
          ao cálculo. Cinza: calculado pelo sistema.
        </p>

        {comAviso.length ? (
          <Aviso tipo="atencao" className="mt-3">
            <ul className="space-y-1">
              {comAviso.flatMap((p) =>
                calculos[p.codigo].avisos.map((a) => (
                  <li key={`${p.codigo}-${a}`}>
                    <strong>{p.nome}:</strong> {a}
                  </li>
                )),
              )}
            </ul>
          </Aviso>
        ) : null}

        <label htmlFor={`${id}-obs`} className="rotulo mt-5">
          Observação da planilha (se precisar)
        </label>
        <textarea
          id={`${id}-obs`}
          className="campo min-h-24 py-2"
          maxLength={1000}
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          placeholder="Ex.: descarga do caminhão às 14h"
        />

        {erroPlan ? (
          <Aviso tipo="erro" className="mt-3">
            {erroPlan}
          </Aviso>
        ) : null}
        <button
          type="button"
          className="botao-whatsapp mt-4 min-h-16 w-full text-xl"
          disabled={salvando}
          onClick={salvarPlanilha}
        >
          {salvando ? 'Salvando…' : 'Salvar planilha e enviar no WhatsApp'}
        </button>
      </div>
    </div>
  )
}
