import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeftRight, ClipboardList, Gauge, Ruler } from 'lucide-react'
import { CartaoPosto, resumoAlertas } from '@/components/sistema/cartao-posto'
import { AtualizacaoAoVivo } from '@/components/sistema/atualizacao-ao-vivo'
import { Aviso, TituloPagina, Vazio } from '@/components/sistema/ui'
import { exigirSessao } from '@/lib/auth'
import { FUSO } from '@/lib/env'
import { contarEmprestimosPendentes, listarEstoque } from '@/lib/dados'
import { fmtVolume } from '@/lib/formato'
import { pode } from '@/lib/permissoes'
import type { EstoqueAtual } from '@/lib/tipos'

export const metadata: Metadata = { title: 'Painel' }

function saudacao() {
  const hora = Number(
    new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, hour: 'numeric', hour12: false }).format(new Date()),
  )
  if (hora < 12) return 'Bom dia'
  if (hora < 18) return 'Boa tarde'
  return 'Boa noite'
}

export default async function Painel() {
  const { perfil, postos, supabase } = await exigirSessao()
  const [estoque, pendentes] = await Promise.all([
    listarEstoque(supabase),
    pode.emprestimos(perfil) ? contarEmprestimosPendentes(supabase) : Promise.resolve(0),
  ])

  const porPosto = new Map<string, EstoqueAtual[]>()
  for (const t of estoque) porPosto.set(t.posto_id, [...(porPosto.get(t.posto_id) ?? []), t])

  const alertas = resumoAlertas(estoque)
  const visaoRede = postos.length > 1

  // Totais da rede por produto (somente tanques com medição)
  const totais = new Map<string, { nome: string; unidade: string; estoque: number; capacidade: number }>()
  for (const t of estoque) {
    if (t.estoque === null) continue
    const atual = totais.get(t.produto_codigo) ?? {
      nome: t.produto_nome,
      unidade: t.unidade,
      estoque: 0,
      capacidade: 0,
    }
    atual.estoque += t.estoque
    atual.capacidade += t.capacidade
    totais.set(t.produto_codigo, atual)
  }

  const acoesRapidas = [
    pode.fechamento(perfil) && { href: '/sistema/fechamento', rotulo: 'Fechamento de turno', icone: ClipboardList },
    pode.encerrantes(perfil) && { href: '/sistema/encerrantes', rotulo: 'Encerrantes', icone: Gauge },
    pode.atualizacao(perfil) && { href: '/sistema/atualizacao', rotulo: 'Atualização rápida', icone: Ruler },
    pode.emprestimos(perfil) && { href: '/sistema/emprestimos', rotulo: 'Empréstimos', icone: ArrowLeftRight },
  ].filter(Boolean) as { href: string; rotulo: string; icone: typeof ClipboardList }[]

  return (
    <>
      <TituloPagina
        titulo={`${saudacao()}, ${perfil.nome.split(' ')[0]}`}
        descricao={visaoRede ? 'Situação dos tanques da rede em tempo real.' : 'Situação dos tanques do seu posto.'}
        acoes={<AtualizacaoAoVivo tabelas={['lancamentos', 'emprestimos']} />}
      />

      {acoesRapidas.length ? (
        <nav aria-label="Ações rápidas" className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {acoesRapidas.map(({ href, rotulo, icone: Icone }) => (
            <Link
              key={href}
              href={href}
              className="cartao flex min-h-20 flex-col items-start justify-center gap-1.5 p-4 font-bold text-tinta hover:border-marca hover:text-marca"
            >
              <Icone aria-hidden="true" className="size-6 text-marca" />
              {rotulo}
            </Link>
          ))}
        </nav>
      ) : null}

      <div className="mb-6 flex flex-wrap gap-2">
        {alertas.criticos ? <Aviso tipo="erro">{alertas.criticos} tanque(s) em nível crítico</Aviso> : null}
        {alertas.atencao ? <Aviso tipo="atencao">{alertas.atencao} tanque(s) em atenção</Aviso> : null}
        {pendentes ? (
          <Link
            href="/sistema/emprestimos"
            className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm font-medium text-amber-900 hover:underline"
          >
            {pendentes} empréstimo(s) pendente(s)
          </Link>
        ) : null}
        {!alertas.criticos && !alertas.atencao && estoque.length ? (
          <Aviso tipo="sucesso">Nenhum tanque em nível de alerta.</Aviso>
        ) : null}
      </div>

      {visaoRede && totais.size ? (
        <section aria-labelledby="titulo-totais" className="mb-8">
          <h2 id="titulo-totais" className="mb-3 text-lg font-extrabold text-tinta">
            Estoque total da rede
          </h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[...totais.entries()].map(([codigo, t]) => (
              <li key={codigo} className="cartao p-3">
                <p className="text-xs font-semibold text-slate-500">{t.nome}</p>
                <p className="tabular text-lg font-extrabold text-tinta">{fmtVolume(t.estoque, t.unidade)}</p>
                {t.capacidade > 0 ? (
                  <p className="tabular text-xs text-slate-500">
                    {Math.round((t.estoque / t.capacidade) * 100)}% de {fmtVolume(t.capacidade, t.unidade)}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {postos.length === 0 ? (
        <Vazio>Nenhum posto vinculado ao seu usuário. Fale com um gestor.</Vazio>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {postos.map((p) => (
            <CartaoPosto key={p.id} posto={p} tanques={porPosto.get(p.id) ?? []} />
          ))}
        </div>
      )}
    </>
  )
}
