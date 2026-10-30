import type { Papel } from './tipos'

interface QuemAcessa {
  papel: Papel
  acesso_total: boolean
}

// Espelha as regras das funções do banco (a autorização real é feita lá).
export const pode = {
  fechamento: (p: QuemAcessa) => p.papel === 'caixa' || p.papel === 'gerente',
  encerrantes: (p: QuemAcessa) => p.papel === 'caixa' || p.papel === 'gerente',
  atualizacao: (p: QuemAcessa) => p.papel === 'gerente' || p.papel === 'gestor',
  emprestimos: (p: QuemAcessa) => p.papel === 'gerente' || p.papel === 'gestor',
  cancelarEmprestimo: (p: QuemAcessa) => p.papel === 'gestor',
  usuarios: (p: QuemAcessa) => p.papel === 'gestor' && p.acesso_total,
}

export const ROTULO_PAPEL: Record<Papel, string> = {
  gestor: 'Gestor',
  gerente: 'Gerente',
  caixa: 'Caixa / Pista',
}
