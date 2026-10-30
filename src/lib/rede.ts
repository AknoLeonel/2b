// Dados estáticos da rede usados como reserva quando o Supabase ainda não
// está configurado (build inicial, preview). A fonte oficial é o banco.

export interface PostoEstatico {
  slug: string
  nome: string
  produtos: string[]
}

export const PRODUTOS_ESTATICOS: Record<string, { nome: string; descricao: string }> = {
  comum: {
    nome: 'Gasolina Comum',
    descricao: 'Gasolina tipo C, com etanol anidro na proporção definida pela legislação vigente.',
  },
  aditivada: {
    nome: 'Gasolina Aditivada',
    descricao:
      'Gasolina com aditivos detergentes e dispersantes que ajudam a manter limpo o sistema de alimentação do motor.',
  },
  etanol: { nome: 'Etanol', descricao: 'Etanol hidratado, combustível renovável para veículos flex e a etanol.' },
  s500: {
    nome: 'Diesel S-500',
    descricao: 'Diesel com até 500 mg/kg de enxofre, para veículos e máquinas em que o fabricante permite o seu uso.',
  },
  s10: {
    nome: 'Diesel S-10',
    descricao:
      'Diesel com até 10 mg/kg de enxofre, exigido nos veículos a diesel fabricados a partir de 2012 (Proconve P7) e posteriores.',
  },
  arla_granel: {
    nome: 'Arla 32 a granel',
    descricao: 'Agente redutor líquido (solução de ureia a 32,5%) para veículos a diesel com sistema SCR.',
  },
  arla_balde: { nome: 'Arla 32 em balde', descricao: 'Arla 32 embalado, vendido por unidade.' },
}

export const ORDEM_PRODUTOS = ['comum', 'aditivada', 'etanol', 's500', 's10', 'arla_granel', 'arla_balde']

export const POSTOS_ESTATICOS: PostoEstatico[] = [
  { slug: 'gomes-serpa', nome: 'Posto Gomes Serpa', produtos: ['comum', 's500', 's10'] },
  { slug: 'caripare', nome: 'Posto Caripare', produtos: ['comum', 's500', 's10'] },
  {
    slug: 'nosso-posto',
    nome: 'Nosso Posto',
    produtos: ['comum', 'aditivada', 'etanol', 's500', 's10', 'arla_granel', 'arla_balde'],
  },
  {
    slug: 'matopiba',
    nome: 'Posto Matopiba',
    produtos: ['comum', 'etanol', 's500', 's10', 'arla_granel', 'arla_balde'],
  },
  { slug: 'flex', nome: 'Posto Flex', produtos: ['comum', 'aditivada', 'etanol', 's500', 's10'] },
  {
    slug: 'divisa',
    nome: 'Posto Divisa',
    produtos: ['comum', 'aditivada', 'etanol', 's500', 's10', 'arla_granel', 'arla_balde'],
  },
  {
    slug: 'urucuia',
    nome: 'Posto Urucuia',
    produtos: ['comum', 'aditivada', 'etanol', 's500', 's10', 'arla_granel', 'arla_balde'],
  },
]

// Usuários de pista e gerência seguem o padrão "<papel>-<slug do posto>".
export function usernamePorPosto(papel: 'caixa' | 'gerente', slugPosto: string) {
  return `${papel}-${slugPosto}`
}
