import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { AtualizacaoAoVivo } from '@/components/sistema/atualizacao-ao-vivo'
import { TituloPagina, Vazio } from '@/components/sistema/ui'
import { exigirSessao } from '@/lib/auth'
import { listarEmprestimos, listarProdutos } from '@/lib/dados'
import { fmtData, fmtDataHora, fmtVolume, hojeIso } from '@/lib/formato'
import { pode } from '@/lib/permissoes'
import type { Emprestimo, MovimentoEmprestimo } from '@/lib/tipos'
import { AcoesEmprestimo } from './acoes-emprestimo'
import { FormEmprestimo } from './form-emprestimo'

export const metadata: Metadata = { title: 'Empréstimos' }

const ROTULO_MOVIMENTO: Record<MovimentoEmprestimo['tipo'], string> = {
  criacao: 'Registrado',
  devolucao: 'Devolução parcial',
  quitacao: 'Quitação',
  cancelamento: 'Cancelado',
}

function Movimentos({ lista }: { lista: MovimentoEmprestimo[] }) {
  if (!lista.length) return null
  return (
    <details className="mt-3 rounded-xl bg-slate-50 p-3 text-xs">
      <summary className="cursor-pointer font-bold text-slate-600">Auditoria ({lista.length})</summary>
      <ol className="mt-2 space-y-1.5">
        {lista.map((m) => (
          <li key={m.id} className="text-slate-600">
            <span className="font-semibold text-slate-800">{fmtDataHora(m.criado_em)}</span> ·{' '}
            {ROTULO_MOVIMENTO[m.tipo]}
            {m.volume !== null ? ` de ${fmtVolume(m.volume)}` : ''} por {m.usuario_nome}
            {m.observacao ? ` — “${m.observacao}”` : ''}
          </li>
        ))}
      </ol>
    </details>
  )
}

function CartaoEmprestimo({
  e,
  movimentos,
  acoes,
}: {
  e: Emprestimo
  movimentos: MovimentoEmprestimo[]
  acoes?: React.ReactNode
}) {
  const pct = e.volume > 0 ? Math.round((e.devolvido / e.volume) * 100) : 0
  return (
    <li className="cartao p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-slate-500">{fmtData(e.data)}</p>
          <p className="text-base font-extrabold text-tinta">{e.produto_nome}</p>
        </div>
        <p className="tabular text-right">
          <span className="block text-xs font-semibold text-slate-500">Saldo</span>
          <span className={`text-lg font-extrabold ${e.status === 'pendente' ? 'text-marca' : 'text-slate-500'}`}>
            {fmtVolume(e.saldo)}
          </span>
        </p>
      </div>
      <p className="mt-2 flex flex-wrap items-center gap-1.5 text-sm font-bold">
        <span className="rounded-lg bg-red-50 px-2 py-1 text-marca">{e.origem_nome}</span>
        <span aria-label="emprestou para">→</span>
        <span className="rounded-lg bg-emerald-50 px-2 py-1 text-emerald-800">{e.destino_nome}</span>
      </p>
      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200"
        role="meter"
        aria-label="Devolvido"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
      >
        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
      </div>
      <p className="tabular mt-1 text-xs text-slate-600">
        Devolvido {fmtVolume(e.devolvido)} de {fmtVolume(e.volume)} ({pct}%)
      </p>
      {e.observacao ? <p className="mt-2 text-sm text-slate-600">“{e.observacao}”</p> : null}
      <p className="mt-2 text-xs text-slate-500">
        Última ação: {e.atualizado_por_nome ?? e.criado_por_nome} · {fmtDataHora(e.atualizado_em ?? e.criado_em)}
      </p>
      {acoes}
      <Movimentos lista={movimentos} />
    </li>
  )
}

export default async function Emprestimos() {
  const { perfil, postos, supabase } = await exigirSessao()
  if (!pode.emprestimos(perfil)) redirect('/sistema')

  const [{ pendentes, encerrados, movimentos }, produtos, todosPostos] = await Promise.all([
    listarEmprestimos(supabase),
    listarProdutos(supabase),
    supabase.from('postos').select('id, nome').eq('ativo', true).order('ordem'),
  ])
  const porEmprestimo = new Map<string, MovimentoEmprestimo[]>()
  for (const m of movimentos) porEmprestimo.set(m.emprestimo_id, [...(porEmprestimo.get(m.emprestimo_id) ?? []), m])

  const totalPendente = pendentes.reduce((s, e) => s + e.saldo, 0)

  return (
    <>
      <TituloPagina
        titulo="Empréstimos de combustível"
        descricao="Transferências entre postos da rede, com devoluções parciais e auditoria de cada ação."
        acoes={<AtualizacaoAoVivo tabelas={['emprestimos']} />}
      />

      <FormEmprestimo
        postos={(todosPostos.data ?? []) as { id: string; nome: string }[]}
        meusPostos={postos.map((p) => p.id)}
        sugerirMeuPosto={perfil.papel === 'gerente'}
        produtos={produtos.filter((p) => p.unidade === 'L')}
        hoje={hojeIso()}
      />

      <section aria-labelledby="titulo-pendentes" className="mt-8">
        <h2 id="titulo-pendentes" className="mb-3 flex flex-wrap items-center gap-2 text-lg font-extrabold text-tinta">
          <span className="rounded-lg bg-amber-100 px-2 py-0.5 text-sm text-amber-900">Pendentes</span>
          {pendentes.length} empréstimo(s) · {fmtVolume(totalPendente)} a devolver
        </h2>
        {pendentes.length ? (
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {pendentes.map((e) => (
              <CartaoEmprestimo
                key={e.id}
                e={e}
                movimentos={porEmprestimo.get(e.id) ?? []}
                acoes={<AcoesEmprestimo emprestimo={e} podeCancelar={pode.cancelarEmprestimo(perfil)} />}
              />
            ))}
          </ul>
        ) : (
          <Vazio>Nenhum empréstimo pendente. 🎉</Vazio>
        )}
      </section>

      <section aria-labelledby="titulo-encerrados" className="mt-10">
        <h2 id="titulo-encerrados" className="mb-3 flex items-center gap-2 text-lg font-extrabold text-tinta">
          <span className="rounded-lg bg-emerald-100 px-2 py-0.5 text-sm text-emerald-800">Encerrados</span>
          Últimos quitados e cancelados
        </h2>
        {encerrados.length ? (
          <ul className="grid gap-3 opacity-90 md:grid-cols-2 xl:grid-cols-3">
            {encerrados.map((e) => (
              <CartaoEmprestimo
                key={e.id}
                e={e}
                movimentos={porEmprestimo.get(e.id) ?? []}
                acoes={
                  <p
                    className={`mt-2 inline-block rounded px-2 py-0.5 text-xs font-bold ${
                      e.status === 'pago' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {e.status === 'pago' ? `Quitado ${fmtDataHora(e.quitado_em)}` : 'Cancelado'}
                  </p>
                }
              />
            ))}
          </ul>
        ) : (
          <Vazio>Nenhum empréstimo encerrado ainda.</Vazio>
        )}
      </section>
    </>
  )
}
