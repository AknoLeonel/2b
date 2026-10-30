'use client'

import { useState, useTransition } from 'react'
import { CampoNumero } from '@/components/sistema/campo-numero'
import { Aviso } from '@/components/sistema/ui'
import { lerNumero } from '@/lib/numero'
import type { Produto } from '@/lib/tipos'
import { registrarEmprestimo } from '../acoes'

export function FormEmprestimo({
  postos,
  meusPostos,
  sugerirMeuPosto,
  produtos,
  hoje,
}: {
  postos: { id: string; nome: string }[]
  meusPostos: string[]
  sugerirMeuPosto: boolean
  produtos: Produto[]
  hoje: string
}) {
  const [data, setData] = useState(hoje)
  const [origem, setOrigem] = useState(sugerirMeuPosto ? (meusPostos[0] ?? '') : '')
  const [destino, setDestino] = useState('')
  const [produto, setProduto] = useState(produtos.find((p) => p.codigo === 's10')?.codigo ?? produtos[0]?.codigo ?? '')
  const [volume, setVolume] = useState('')
  const [observacao, setObservacao] = useState('')
  const [mensagem, setMensagem] = useState<{ ok: boolean; texto: string } | null>(null)
  const [salvando, iniciar] = useTransition()

  const envolveMeuPosto = meusPostos.includes(origem) || meusPostos.includes(destino)

  function salvar(evento: React.FormEvent) {
    evento.preventDefault()
    setMensagem(null)
    const litros = lerNumero(volume)
    if (!origem || !destino) return setMensagem({ ok: false, texto: 'Escolha a origem e o destino.' })
    if (origem === destino) return setMensagem({ ok: false, texto: 'Origem e destino devem ser postos diferentes.' })
    if (!envolveMeuPosto)
      return setMensagem({ ok: false, texto: 'O empréstimo precisa envolver um posto sob sua responsabilidade.' })
    if (!litros || Number.isNaN(litros) || litros <= 0) return setMensagem({ ok: false, texto: 'Informe a litragem.' })

    iniciar(async () => {
      const r = await registrarEmprestimo({ data, origem, destino, produto, volume: litros, observacao })
      setMensagem({ ok: r.ok, texto: r.mensagem })
      if (r.ok) {
        setVolume('')
        setObservacao('')
        if (!sugerirMeuPosto) setOrigem('')
        setDestino('')
      }
    })
  }

  return (
    <form onSubmit={salvar} noValidate className="cartao p-4 sm:p-5">
      <h3 className="mb-3 text-xl font-extrabold text-tinta">Registrar novo empréstimo</h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <label htmlFor="emp-data" className="rotulo">
            Data
          </label>
          <input
            id="emp-data"
            type="date"
            className="campo"
            value={data}
            max={hoje}
            onChange={(e) => setData(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="emp-origem" className="rotulo">
            Origem (saiu de)
          </label>
          <select id="emp-origem" className="campo" value={origem} onChange={(e) => setOrigem(e.target.value)} required>
            <option value="">Selecione…</option>
            {postos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="emp-destino" className="rotulo">
            Destino (foi para)
          </label>
          <select
            id="emp-destino"
            className="campo"
            value={destino}
            onChange={(e) => setDestino(e.target.value)}
            required
          >
            <option value="">Selecione…</option>
            {postos
              .filter((p) => p.id !== origem)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
          </select>
        </div>
        <div>
          <label htmlFor="emp-produto" className="rotulo">
            Combustível
          </label>
          <select id="emp-produto" className="campo" value={produto} onChange={(e) => setProduto(e.target.value)}>
            {produtos.map((p) => (
              <option key={p.codigo} value={p.codigo}>
                {p.nome}
              </option>
            ))}
          </select>
        </div>
        <CampoNumero rotulo="Litragem" valor={volume} aoMudar={setVolume} />
      </div>
      <div className="mt-1">
        <label htmlFor="emp-obs" className="rotulo">
          Observação (opcional)
        </label>
        <input
          id="emp-obs"
          className="campo"
          maxLength={500}
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          placeholder="Ex.: motorista, placa do caminhão, nota"
        />
      </div>
      {mensagem ? (
        <Aviso tipo={mensagem.ok ? 'sucesso' : 'erro'} className="mt-3">
          {mensagem.texto}
        </Aviso>
      ) : null}
      <button type="submit" className="botao-primario mt-4 w-full sm:w-auto" disabled={salvando}>
        {salvando ? 'Registrando…' : 'Registrar empréstimo'}
      </button>
    </form>
  )
}
