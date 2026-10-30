import 'server-only'
import { cache } from 'react'
import { ORDEM_PRODUTOS, POSTOS_ESTATICOS, PRODUTOS_ESTATICOS } from './rede'
import { criarClientePublico } from './supabase/publico'

export interface PostoPublico {
  slug: string
  nome: string
  descricao: string | null
  endereco: string | null
  bairro: string | null
  cidade: string | null
  uf: string | null
  cep: string | null
  latitude: number | null
  longitude: number | null
  telefone: string | null
  whatsapp: string | null
  horario: string | null
  horario_schema: string | null
  aberto_24h: boolean
  servicos: string[]
  produtos: { codigo: string; nome: string }[]
  atualizado_em: string | null
}

function postosDeReserva(): PostoPublico[] {
  return POSTOS_ESTATICOS.map((p) => ({
    slug: p.slug,
    nome: p.nome,
    descricao: null,
    endereco: null,
    bairro: null,
    cidade: null,
    uf: null,
    cep: null,
    latitude: null,
    longitude: null,
    telefone: null,
    whatsapp: null,
    horario: null,
    horario_schema: null,
    aberto_24h: false,
    servicos: [],
    produtos: p.produtos.map((codigo) => ({ codigo, nome: PRODUTOS_ESTATICOS[codigo]?.nome ?? codigo })),
    atualizado_em: null,
  }))
}

/** Postos ativos para o site. Usa o banco; se indisponível, os dados estáticos da rede. */
export const listarPostosPublicos = cache(async (): Promise<PostoPublico[]> => {
  const supabase = criarClientePublico()
  if (supabase) {
    const { data, error } = await supabase.rpc('postos_publicos')
    if (!error && Array.isArray(data) && data.length > 0) {
      return (data as PostoPublico[]).map((p) => ({ ...p, servicos: p.servicos ?? [], produtos: p.produtos ?? [] }))
    }
    if (error) console.error('[site] postos_publicos:', error.message)
  }
  return postosDeReserva()
})

export async function obterPostoPublico(slug: string) {
  const postos = await listarPostosPublicos()
  return postos.find((p) => p.slug === slug) ?? null
}

/** Produtos vendidos na rede, cada um com a lista de postos que o oferecem. */
export function produtosDaRede(postos: PostoPublico[]) {
  const mapa = new Map<string, { codigo: string; nome: string; descricao: string; postos: PostoPublico[] }>()
  for (const posto of postos) {
    for (const produto of posto.produtos) {
      const item = mapa.get(produto.codigo) ?? {
        codigo: produto.codigo,
        nome: produto.nome,
        descricao: PRODUTOS_ESTATICOS[produto.codigo]?.descricao ?? '',
        postos: [],
      }
      item.postos.push(posto)
      mapa.set(produto.codigo, item)
    }
  }
  return [...mapa.values()].sort((a, b) => ORDEM_PRODUTOS.indexOf(a.codigo) - ORDEM_PRODUTOS.indexOf(b.codigo))
}

export function enderecoCompleto(p: PostoPublico) {
  const linha1 = [p.endereco, p.bairro].filter(Boolean).join(' – ')
  const linha2 = [p.cidade, p.uf].filter(Boolean).join('/')
  return [linha1, linha2, p.cep ? `CEP ${p.cep}` : null].filter(Boolean).join(', ')
}

export function localidade(p: PostoPublico) {
  return [p.cidade, p.uf].filter(Boolean).join(' – ')
}

export function linkComoChegar(p: PostoPublico) {
  if (p.latitude !== null && p.longitude !== null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${p.latitude},${p.longitude}`
  }
  const endereco = enderecoCompleto(p)
  if (!endereco) return null
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${p.nome}, ${endereco}`)}`
}

export function linkWhatsapp(numero: string | null | undefined, texto?: string) {
  const digitos = (numero ?? '').replace(/\D/g, '')
  if (digitos.length < 10) return null
  const comDdi = digitos.startsWith('55') ? digitos : `55${digitos}`
  return `https://wa.me/${comDdi}${texto ? `?text=${encodeURIComponent(texto)}` : ''}`
}

export function linkTelefone(numero: string | null | undefined) {
  const digitos = (numero ?? '').replace(/\D/g, '')
  return digitos.length >= 8 ? `tel:+${digitos.startsWith('55') ? digitos : `55${digitos}`}` : null
}
