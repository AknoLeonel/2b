import 'server-only'
import type { Sessao } from './auth'
import type {
  BicoTurno,
  Emprestimo,
  EncerranteAtual,
  EstoqueAtual,
  Lancamento,
  LeituraEncerrantes,
  MovimentoEmprestimo,
  Produto,
} from './tipos'

type Cliente = Sessao['supabase']

export async function listarEstoque(supabase: Cliente, postoId?: string) {
  let consulta = supabase.from('v_estoque_atual').select('*').order('ordem')
  if (postoId) consulta = consulta.eq('posto_id', postoId)
  const { data, error } = await consulta
  if (error) console.error('[estoque]', error.message)
  return (data ?? []) as EstoqueAtual[]
}

export async function listarEncerrantes(supabase: Cliente, postoId: string) {
  const { data, error } = await supabase
    .from('v_encerrantes_atuais')
    .select('*')
    .eq('posto_id', postoId)
    .order('numero')
  if (error) console.error('[encerrantes]', error.message)
  return (data ?? []) as EncerranteAtual[]
}

/**
 * Leituras do turno aberto. O turno começa no último fechamento salvo: a
 * base de cada bico é a última leitura feita até esse fechamento; leituras
 * posteriores já pertencem ao turno aberto (o caixa voltou à tela).
 */
export async function listarEncerrantesDoTurno(supabase: Cliente, postoId: string): Promise<BicoTurno[]> {
  const [bicos, fechamento, leituras] = await Promise.all([
    listarEncerrantes(supabase, postoId),
    supabase
      .from('lancamentos')
      .select('criado_em')
      .eq('posto_id', postoId)
      .eq('tipo', 'fechamento')
      .order('criado_em', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('leituras_encerrantes')
      .select('criado_em, leitura_itens (bico_id, valor)')
      .eq('posto_id', postoId)
      .order('criado_em', { ascending: false })
      .limit(40),
  ])
  const inicioTurno = (fechamento.data as { criado_em: string } | null)?.criado_em ?? null
  const lista = (leituras.data ?? []) as unknown as {
    criado_em: string
    leitura_itens: { bico_id: string; valor: number }[]
  }[]

  return bicos.map((b) => {
    let base: { valor: number; em: string } | null = null
    let atual: { valor: number; em: string } | null = null
    for (const l of lista) {
      const item = l.leitura_itens.find((i) => i.bico_id === b.bico_id)
      if (!item) continue
      const doTurnoAberto = inicioTurno !== null && l.criado_em > inicioTurno
      if (doTurnoAberto) atual ??= { valor: item.valor, em: l.criado_em }
      else {
        base = { valor: item.valor, em: l.criado_em }
        break
      }
    }
    // leitura-base mais antiga que a janela consultada
    if (!base && b.valor !== null && b.lido_em && (inicioTurno === null || b.lido_em <= inicioTurno) && !atual) {
      base = { valor: b.valor, em: b.lido_em }
    }
    return {
      bico_id: b.bico_id,
      numero: b.numero,
      descricao: b.descricao,
      produto_codigo: b.produto_codigo,
      base: base?.valor ?? null,
      baseEm: base?.em ?? null,
      atual: atual?.valor ?? null,
      atualEm: atual?.em ?? null,
    }
  })
}

const SELECT_LANCAMENTO =
  'id, posto_id, tipo, observacao, criado_por_nome, criado_em, lancamento_itens (produto_codigo, estoque_inicial, descarga, vendido, regua, estoque_final, diferenca)'

export async function listarLancamentos(
  supabase: Cliente,
  filtro: { postoId: string; inicio?: string; fim?: string; limite?: number },
) {
  let consulta = supabase
    .from('lancamentos')
    .select(SELECT_LANCAMENTO)
    .eq('posto_id', filtro.postoId)
    .order('criado_em', { ascending: false })
    .limit(filtro.limite ?? 200)
  if (filtro.inicio) consulta = consulta.gte('criado_em', filtro.inicio)
  if (filtro.fim) consulta = consulta.lt('criado_em', filtro.fim)
  const { data, error } = await consulta
  if (error) console.error('[lancamentos]', error.message)
  return (data ?? []) as unknown as Lancamento[]
}

export async function listarLeituras(supabase: Cliente, filtro: { postoId: string; inicio: string; fim: string }) {
  const { data, error } = await supabase
    .from('leituras_encerrantes')
    .select('id, posto_id, observacao, criado_por_nome, criado_em, leitura_itens (valor, bicos (numero, descricao))')
    .eq('posto_id', filtro.postoId)
    .gte('criado_em', filtro.inicio)
    .lt('criado_em', filtro.fim)
    .order('criado_em', { ascending: false })
    .limit(200)
  if (error) console.error('[leituras]', error.message)
  return (data ?? []) as unknown as LeituraEncerrantes[]
}

export async function listarProdutos(supabase: Cliente) {
  const { data } = await supabase.from('produtos').select('codigo, nome, descricao, unidade, ordem').order('ordem')
  return (data ?? []) as Produto[]
}

export async function listarEmprestimos(supabase: Cliente) {
  const [pendentes, encerrados] = await Promise.all([
    supabase.from('v_emprestimos').select('*').eq('status', 'pendente').order('data', { ascending: false }).limit(200),
    supabase
      .from('v_emprestimos')
      .select('*')
      .neq('status', 'pendente')
      .order('atualizado_em', { ascending: false, nullsFirst: false })
      .limit(10),
  ])
  if (pendentes.error) console.error('[emprestimos]', pendentes.error.message)
  const lista = [...(pendentes.data ?? []), ...(encerrados.data ?? [])] as Emprestimo[]

  const ids = lista.map((e) => e.id)
  let movimentos: MovimentoEmprestimo[] = []
  if (ids.length) {
    const { data } = await supabase
      .from('emprestimo_movimentos')
      .select('id, emprestimo_id, tipo, volume, observacao, usuario_nome, criado_em')
      .in('emprestimo_id', ids)
      .order('criado_em')
    movimentos = (data ?? []) as MovimentoEmprestimo[]
  }

  return {
    pendentes: (pendentes.data ?? []) as Emprestimo[],
    encerrados: (encerrados.data ?? []) as Emprestimo[],
    movimentos,
  }
}

export async function contarEmprestimosPendentes(supabase: Cliente) {
  const { count } = await supabase
    .from('emprestimos')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pendente')
  return count ?? 0
}
