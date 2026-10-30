import { AtualizacaoAoVivo } from '@/components/sistema/atualizacao-ao-vivo'
import { BarraAtalhos, Secao } from '@/components/sistema/secao'
import { Aviso, Vazio } from '@/components/sistema/ui'
import { escolherPosto, type Sessao } from '@/lib/auth'
import { contarEmprestimosPendentes, listarEncerrantesDoTurno, listarEstoque } from '@/lib/dados'
import { FUSO } from '@/lib/env'
import { resumoAlertas } from '@/lib/estoque'
import { pode } from '@/lib/permissoes'
import type { EstoqueAtual, PostoResumo } from '@/lib/tipos'
import { TabelaAtualizacao } from './atualizacao'
import { SecaoEmprestimos } from './emprestimos'
import { diaValido, SecaoHistorico } from './historico'
import { MapaEstoque } from './mapa-estoque'
import { TabelaTanques } from './tanques'
import { TelaTurno } from './turno'

function saudacao() {
  const hora = Number(
    new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, hour: 'numeric', hour12: false }).format(new Date()),
  )
  if (hora < 12) return 'Bom dia'
  if (hora < 18) return 'Boa tarde'
  return 'Boa noite'
}

async function Turno({ sessao, posto, estoque }: { sessao: Sessao; posto: PostoResumo; estoque: EstoqueAtual[] }) {
  const bicos = await listarEncerrantesDoTurno(sessao.supabase, posto.id)
  return (
    <TelaTurno
      posto={{ id: posto.id, nome: posto.nome }}
      bicos={bicos}
      produtos={estoque.map((t) => ({
        codigo: t.produto_codigo,
        nome: t.produto_nome,
        unidade: t.unidade,
        capacidade: t.capacidade,
        ultimaRegua: t.estoque,
        medidoEm: t.medido_em,
      }))}
    />
  )
}

function Alertas({ estoque, pendentes }: { estoque: EstoqueAtual[]; pendentes: number }) {
  const { criticos, atencao } = resumoAlertas(estoque)
  if (!criticos && !atencao && !pendentes) return null
  return (
    <div className="flex flex-wrap gap-2">
      {criticos ? <Aviso tipo="erro">🔴 {criticos} tanque(s) em nível crítico</Aviso> : null}
      {atencao ? <Aviso tipo="atencao">🟡 {atencao} tanque(s) em atenção</Aviso> : null}
      {pendentes ? (
        <a
          href="#emprestimos"
          className="rounded-xl border-2 border-amber-300 bg-amber-50 p-3 text-base font-semibold text-amber-950 underline"
        >
          🔄 {pendentes} empréstimo(s) pendente(s)
        </a>
      ) : null}
    </div>
  )
}

export async function ConteudoInicio({
  sessao,
  params,
}: {
  sessao: Sessao
  params: { dia?: string | string[]; posto?: string | string[] }
}) {
  const { perfil, postos, supabase } = sessao
  const dia = diaValido(params.dia)

  if (!postos.length) return <Vazio>Nenhum posto vinculado ao seu usuário. Fale com um gestor.</Vazio>

  const [estoque, pendentes] = await Promise.all([
    listarEstoque(supabase),
    pode.emprestimos(perfil) ? contarEmprestimosPendentes(supabase) : Promise.resolve(0),
  ])
  const titulo = (
    <div className="pb-2 pt-6">
      <h1 className="text-3xl font-extrabold text-tinta">
        {saudacao()}, {perfil.nome.split(' ')[0]}!
      </h1>
    </div>
  )

  // ------------------------------------------------------------------ GESTOR
  if (perfil.papel === 'gestor') {
    const postoHistorico = escolherPosto(sessao, params.posto)!
    return (
      <>
        {titulo}
        <BarraAtalhos
          itens={[
            { id: 'estoque', rotulo: 'Estoque da rede' },
            { id: 'emprestimos', rotulo: 'Empréstimos' },
            { id: 'historico', rotulo: 'Histórico' },
          ]}
        />
        <Secao
          id="estoque"
          numero={1}
          titulo="Estoque da rede"
          descricao="Toque no nome do posto para ver os detalhes e atualizar a régua."
          acoes={<AtualizacaoAoVivo tabelas={['lancamentos', 'emprestimos']} />}
        >
          <div className="mb-4">
            <Alertas estoque={estoque} pendentes={pendentes} />
          </div>
          <MapaEstoque postos={postos} estoque={estoque} />
        </Secao>
        <Secao id="emprestimos" numero={2} titulo="Empréstimos entre postos">
          <SecaoEmprestimos sessao={sessao} />
        </Secao>
        <Secao id="historico" numero={3} titulo="Histórico (LMC)" descricao="Escolha o posto e o dia.">
          <SecaoHistorico sessao={sessao} posto={postoHistorico} dia={dia} caminho="/sistema" podeTrocarPosto />
        </Secao>
      </>
    )
  }

  // ------------------------------------------------------- GERENTE E CAIXA
  const posto = postos[0]
  const tanques = estoque.filter((t) => t.posto_id === posto.id)

  if (perfil.papel === 'gerente') {
    return (
      <>
        {titulo}
        <BarraAtalhos
          itens={[
            { id: 'tanques', rotulo: 'Tanques' },
            { id: 'atualizacao', rotulo: 'Atualizar régua' },
            { id: 'turno', rotulo: 'Fechamento' },
            { id: 'emprestimos', rotulo: 'Empréstimos' },
            { id: 'historico', rotulo: 'Histórico' },
          ]}
        />
        <Secao
          id="tanques"
          numero={1}
          titulo={`Situação do ${posto.nome}`}
          acoes={<AtualizacaoAoVivo tabelas={['lancamentos', 'emprestimos']} />}
        >
          <div className="mb-4">
            <Alertas estoque={tanques} pendentes={pendentes} />
          </div>
          <TabelaTanques tanques={tanques} />
        </Secao>
        <Secao
          id="atualizacao"
          numero={2}
          titulo="Atualização rápida da régua"
          descricao="Para atualizar o estoque fora do horário de fechamento."
        >
          <TabelaAtualizacao postoId={posto.id} tanques={tanques} />
        </Secao>
        <Secao
          id="turno"
          numero={3}
          titulo="Fechamento de turno"
          descricao="Use quando você mesmo fizer o fechamento no lugar do caixa."
        >
          <Turno sessao={sessao} posto={posto} estoque={tanques} />
        </Secao>
        <Secao id="emprestimos" numero={4} titulo="Empréstimos do posto">
          <SecaoEmprestimos sessao={sessao} />
        </Secao>
        <Secao id="historico" numero={5} titulo="Histórico (LMC)">
          <SecaoHistorico sessao={sessao} posto={posto} dia={dia} caminho="/sistema" podeTrocarPosto={false} />
        </Secao>
      </>
    )
  }

  // CAIXA
  return (
    <>
      {titulo}
      <p className="mb-2 max-w-3xl text-lg text-slate-800">
        Faça de cima para baixo: <strong>1)</strong> leitura dos bicos, <strong>2)</strong> planilha com a régua e{' '}
        <strong>3)</strong> envie no WhatsApp.
      </p>
      <BarraAtalhos
        itens={[
          { id: 'turno', rotulo: 'Fechamento' },
          { id: 'tanques', rotulo: 'Tanques' },
          { id: 'historico', rotulo: 'Histórico' },
        ]}
      />
      <Secao id="turno" numero={1} titulo={`Fechamento de turno · ${posto.nome}`}>
        <Turno sessao={sessao} posto={posto} estoque={tanques} />
      </Secao>
      <Secao
        id="tanques"
        numero={2}
        titulo="Situação dos tanques"
        acoes={<AtualizacaoAoVivo tabelas={['lancamentos']} />}
      >
        <TabelaTanques tanques={tanques} />
      </Secao>
      <Secao id="historico" numero={3} titulo="Histórico do posto">
        <SecaoHistorico sessao={sessao} posto={posto} dia={dia} caminho="/sistema" podeTrocarPosto={false} />
      </Secao>
    </>
  )
}
