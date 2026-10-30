import { MolduraPlanilha } from '@/components/sistema/planilha'
import type { Sessao } from '@/lib/auth'
import { listarEmprestimos, listarProdutos } from '@/lib/dados'
import { fmtData, fmtDataHora, fmtNumero, hojeIso } from '@/lib/formato'
import { pode } from '@/lib/permissoes'
import type { Emprestimo, MovimentoEmprestimo } from '@/lib/tipos'
import { AcoesEmprestimo } from './acoes-emprestimo'
import { FormEmprestimo } from './form-emprestimo'

const ROTULO_MOVIMENTO: Record<MovimentoEmprestimo['tipo'], string> = {
  criacao: 'Registrado',
  devolucao: 'Devolução',
  quitacao: 'Quitação',
  cancelamento: 'Cancelado',
}

function Responsavel({ e, movimentos }: { e: Emprestimo; movimentos: MovimentoEmprestimo[] }) {
  return (
    <td className="texto min-w-52 text-sm text-slate-800">
      <span className="font-bold">{e.atualizado_por_nome ?? e.criado_por_nome}</span>
      <span className="block text-slate-700">{fmtDataHora(e.atualizado_em ?? e.criado_em)}</span>
      {movimentos.length > 1 ? (
        <details className="mt-1">
          <summary className="cursor-pointer font-bold text-marca underline">Ver tudo ({movimentos.length})</summary>
          <ol className="mt-1 space-y-1">
            {movimentos.map((m) => (
              <li key={m.id}>
                {fmtDataHora(m.criado_em)} · {ROTULO_MOVIMENTO[m.tipo]}
                {m.volume !== null ? ` ${fmtNumero(m.volume)} L` : ''} · {m.usuario_nome}
                {m.observacao ? ` — “${m.observacao}”` : ''}
              </li>
            ))}
          </ol>
        </details>
      ) : null}
    </td>
  )
}

function Identificacao({ e }: { e: Emprestimo }) {
  return (
    <th scope="row" className="fixa min-w-36">
      {e.produto_nome}
      <span className="block text-sm font-semibold text-slate-700">{fmtData(e.data)}</span>
      {e.observacao ? <span className="mt-1 block text-sm font-medium text-slate-800">“{e.observacao}”</span> : null}
    </th>
  )
}

/** No celular cada empréstimo vira um quadro de planilha vertical (rótulo | valor), sem arrastar para o lado. */
function QuadroEmprestimo({
  e,
  movimentos,
  acoes,
}: {
  e: Emprestimo
  movimentos: MovimentoEmprestimo[]
  acoes?: React.ReactNode
}) {
  const linha = 'grid grid-cols-[8.5rem_1fr] border-b border-slate-300'
  const rotulo = 'bg-slate-100 px-3 py-2.5 text-base font-bold text-slate-800'
  const valor = 'px-3 py-2.5 text-right text-lg font-bold tabular'
  return (
    <li className="overflow-hidden rounded-xl border border-slate-400 bg-white">
      <p className="flex items-center justify-between gap-2 bg-slate-200 px-3 py-2.5 text-lg font-extrabold text-tinta">
        {e.produto_nome}
        <span className="text-base font-bold text-slate-800">{fmtData(e.data)}</span>
      </p>
      <dl>
        <div className={linha}>
          <dt className={rotulo}>Saiu de</dt>
          <dd className={`${valor} text-red-800`}>{e.origem_nome}</dd>
        </div>
        <div className={linha}>
          <dt className={rotulo}>Foi para</dt>
          <dd className={`${valor} text-emerald-800`}>{e.destino_nome}</dd>
        </div>
        <div className={linha}>
          <dt className={rotulo}>Emprestado</dt>
          <dd className={valor}>{fmtNumero(e.volume)} L</dd>
        </div>
        <div className={linha}>
          <dt className={rotulo}>Devolvido</dt>
          <dd className={`${valor} text-emerald-800`}>{fmtNumero(e.devolvido)} L</dd>
        </div>
        {e.status === 'pendente' ? (
          <div className={linha}>
            <dt className={rotulo}>Faltam</dt>
            <dd className={`${valor} bg-amber-100 text-xl text-red-800`}>{fmtNumero(e.saldo)} L</dd>
          </div>
        ) : (
          <div className={linha}>
            <dt className={rotulo}>Situação</dt>
            <dd className={`${valor} ${e.status === 'pago' ? 'bg-emerald-100 text-emerald-900' : 'text-slate-800'}`}>
              {e.status === 'pago' ? 'Quitado' : 'Cancelado'}
            </dd>
          </div>
        )}
        {e.observacao ? (
          <div className="border-b border-slate-300 px-3 py-2.5 text-base text-slate-800">
            <span className="font-bold">Observação:</span> {e.observacao}
          </div>
        ) : null}
      </dl>
      <table className="w-full [&_td]:px-3 [&_td]:py-2.5">
        <tbody>
          <tr>
            <Responsavel e={e} movimentos={movimentos} />
          </tr>
        </tbody>
      </table>
      {acoes ? <div className="border-t border-slate-300 p-3">{acoes}</div> : null}
    </li>
  )
}

export async function SecaoEmprestimos({ sessao }: { sessao: Sessao }) {
  const { perfil, postos, supabase } = sessao
  const [{ pendentes, encerrados, movimentos }, produtos, todosPostos] = await Promise.all([
    listarEmprestimos(supabase),
    listarProdutos(supabase),
    supabase.from('postos').select('id, nome').eq('ativo', true).order('ordem'),
  ])
  const porEmprestimo = new Map<string, MovimentoEmprestimo[]>()
  for (const m of movimentos) porEmprestimo.set(m.emprestimo_id, [...(porEmprestimo.get(m.emprestimo_id) ?? []), m])
  const totalFaltando = pendentes.reduce((s, e) => s + e.saldo, 0)

  return (
    <div className="space-y-8">
      <div>
        <h3 className="mb-2 text-xl font-extrabold text-tinta">
          <span className="mr-2 rounded-lg bg-amber-200 px-2 py-0.5 text-amber-950">Pendentes</span>
          {pendentes.length
            ? `${pendentes.length} empréstimo(s) · faltam ${fmtNumero(totalFaltando)} L`
            : 'Nenhum pendente 🎉'}
        </h3>
        {pendentes.length ? (
          <ul className="grid gap-4 md:hidden">
            {pendentes.map((e) => (
              <QuadroEmprestimo
                key={e.id}
                e={e}
                movimentos={porEmprestimo.get(e.id) ?? []}
                acoes={<AcoesEmprestimo emprestimo={e} podeCancelar={pode.cancelarEmprestimo(perfil)} />}
              />
            ))}
          </ul>
        ) : null}
        {pendentes.length ? (
          <div className="hidden md:block">
            <MolduraPlanilha rotulo="Empréstimos pendentes" dicaRolagem={false}>
              <table className="planilha min-w-[66rem]">
                <caption className="sr-only">Empréstimos pendentes</caption>
                <thead>
                  <tr>
                    <th scope="col" className="fixa text-left">
                      Combustível / data
                    </th>
                    <th scope="col">Saiu de</th>
                    <th scope="col">Foi para</th>
                    <th scope="col">Emprestado</th>
                    <th scope="col">Devolvido</th>
                    <th scope="col" className="calc">
                      Faltam
                    </th>
                    <th scope="col">Responsável</th>
                    <th scope="col">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {pendentes.map((e) => (
                    <tr key={e.id}>
                      <Identificacao e={e} />
                      <td className="texto font-bold text-red-800">{e.origem_nome}</td>
                      <td className="texto font-bold text-emerald-800">{e.destino_nome}</td>
                      <td className="num font-bold">{fmtNumero(e.volume)} L</td>
                      <td className="num text-emerald-800">{fmtNumero(e.devolvido)} L</td>
                      <td className="calc num bg-amber-100 text-lg text-red-800">{fmtNumero(e.saldo)} L</td>
                      <Responsavel e={e} movimentos={porEmprestimo.get(e.id) ?? []} />
                      <td className="texto">
                        <AcoesEmprestimo emprestimo={e} podeCancelar={pode.cancelarEmprestimo(perfil)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </MolduraPlanilha>
          </div>
        ) : null}
      </div>

      <FormEmprestimo
        postos={(todosPostos.data ?? []) as { id: string; nome: string }[]}
        meusPostos={postos.map((p) => p.id)}
        sugerirMeuPosto={perfil.papel === 'gerente'}
        produtos={produtos.filter((p) => p.unidade === 'L')}
        hoje={hojeIso()}
      />

      {encerrados.length ? (
        <div>
          <h3 className="mb-2 text-xl font-extrabold text-tinta">
            <span className="mr-2 rounded-lg bg-emerald-200 px-2 py-0.5 text-emerald-950">Quitados</span>
            Últimos encerrados
          </h3>
          <ul className="grid gap-4 md:hidden">
            {encerrados.map((e) => (
              <QuadroEmprestimo key={e.id} e={e} movimentos={porEmprestimo.get(e.id) ?? []} />
            ))}
          </ul>
          <div className="hidden md:block">
            <MolduraPlanilha rotulo="Últimos empréstimos encerrados" dicaRolagem={false}>
              <table className="planilha min-w-[54rem]">
                <caption className="sr-only">Últimos empréstimos quitados ou cancelados</caption>
                <thead>
                  <tr>
                    <th scope="col" className="fixa text-left">
                      Combustível / data
                    </th>
                    <th scope="col">Saiu de</th>
                    <th scope="col">Foi para</th>
                    <th scope="col">Volume</th>
                    <th scope="col">Situação</th>
                    <th scope="col">Responsável</th>
                  </tr>
                </thead>
                <tbody>
                  {encerrados.map((e) => (
                    <tr key={e.id}>
                      <Identificacao e={e} />
                      <td className="texto">{e.origem_nome}</td>
                      <td className="texto">{e.destino_nome}</td>
                      <td className="num font-bold">{fmtNumero(e.volume)} L</td>
                      <td
                        className={`texto font-bold ${e.status === 'pago' ? 'bg-emerald-100 text-emerald-900' : 'bg-slate-100 text-slate-800'}`}
                      >
                        {e.status === 'pago' ? 'Quitado' : 'Cancelado'}
                      </td>
                      <Responsavel e={e} movimentos={porEmprestimo.get(e.id) ?? []} />
                    </tr>
                  ))}
                </tbody>
              </table>
            </MolduraPlanilha>
          </div>
        </div>
      ) : null}
    </div>
  )
}
