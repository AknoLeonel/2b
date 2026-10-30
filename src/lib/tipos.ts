export type Papel = 'gestor' | 'gerente' | 'caixa'
export type TipoLancamento = 'fechamento' | 'atualizacao'
export type StatusEmprestimo = 'pendente' | 'pago' | 'cancelado'
export type Unidade = 'L' | 'un'

export interface Perfil {
  id: string
  username: string
  nome: string
  papel: Papel
  posto_id: string | null
  acesso_total: boolean
  ativo: boolean
}

export interface PostoResumo {
  id: string
  slug: string
  nome: string
  nome_publico: string
}

export interface EstoqueAtual {
  tanque_id: string
  posto_id: string
  produto_codigo: string
  produto_nome: string
  unidade: Unidade
  ordem: number
  capacidade: number
  alerta_critico_pct: number
  alerta_atencao_pct: number
  estoque: number | null
  medido_em: string | null
  medido_tipo: TipoLancamento | null
  medido_por: string | null
  media_diaria: number | null
}

export interface EncerranteAtual {
  bico_id: string
  posto_id: string
  numero: number
  descricao: string
  produto_codigo: string | null
  valor: number | null
  lido_em: string | null
  lido_por: string | null
  valor_anterior: number | null
  lido_em_anterior: string | null
}

/** Bico com a leitura-base do turno (até o último fechamento) e a leitura já lançada no turno aberto. */
export interface BicoTurno {
  bico_id: string
  numero: number
  descricao: string
  produto_codigo: string | null
  base: number | null
  baseEm: string | null
  atual: number | null
  atualEm: string | null
}

export interface LancamentoItem {
  produto_codigo: string
  estoque_inicial: number | null
  descarga: number | null
  vendido: number | null
  regua: number | null
  estoque_final: number | null
  diferenca: number | null
}

export interface Lancamento {
  id: string
  posto_id: string
  tipo: TipoLancamento
  observacao: string | null
  criado_por_nome: string
  criado_em: string
  lancamento_itens: LancamentoItem[]
}

export interface LeituraEncerrantes {
  id: string
  posto_id: string
  observacao: string | null
  criado_por_nome: string
  criado_em: string
  leitura_itens: { valor: number; bicos: { numero: number; descricao: string } | null }[]
}

export interface Emprestimo {
  id: string
  data: string
  origem_posto_id: string
  destino_posto_id: string
  origem_nome: string
  destino_nome: string
  produto_codigo: string
  produto_nome: string
  volume: number
  devolvido: number
  saldo: number
  status: StatusEmprestimo
  observacao: string | null
  criado_por_nome: string
  criado_em: string
  atualizado_por_nome: string | null
  atualizado_em: string | null
  quitado_em: string | null
}

export interface MovimentoEmprestimo {
  id: number
  emprestimo_id: string
  tipo: 'criacao' | 'devolucao' | 'quitacao' | 'cancelamento'
  volume: number | null
  observacao: string | null
  usuario_nome: string
  criado_em: string
}

export interface Produto {
  codigo: string
  nome: string
  descricao: string | null
  unidade: Unidade
  ordem: number
}

export type EstadoAcao<T = undefined> = { ok: true; mensagem: string; dados?: T } | { ok: false; mensagem: string }
