import { NextResponse, type NextRequest } from 'next/server'
import { obterSessao } from '@/lib/auth'
import { listarLancamentos, listarProdutos } from '@/lib/dados'
import { hojeIso, intervaloDoDia } from '@/lib/formato'

const MAX_DIAS = 93

function celula(valor: unknown) {
  if (valor === null || valor === undefined) return ''
  const texto = typeof valor === 'number' ? String(valor).replace('.', ',') : String(valor)
  // evita injeção de fórmulas em planilhas (=, +, -, @)
  const seguro = /^[=+\-@\t\r]/.test(texto) && typeof valor !== 'number' ? `'${texto}` : texto
  return /[;"\n\r]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro
}

export async function GET(request: NextRequest) {
  const sessao = await obterSessao()
  if (!sessao || sessao === 'sem-perfil') return new NextResponse('Não autorizado', { status: 401 })

  const p = request.nextUrl.searchParams
  const posto = sessao.postos.find((x) => x.slug === p.get('posto'))
  if (!posto) return new NextResponse('Posto inválido', { status: 400 })

  const hoje = hojeIso()
  const de = p.get('de') ?? ''
  const ate = p.get('ate') ?? ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(de) || !/^\d{4}-\d{2}-\d{2}$/.test(ate) || de > ate || ate > hoje) {
    return new NextResponse('Período inválido', { status: 400 })
  }
  const dias = (new Date(ate).getTime() - new Date(de).getTime()) / 86_400_000
  if (dias > MAX_DIAS) return new NextResponse(`Período máximo: ${MAX_DIAS} dias`, { status: 400 })

  const [lancamentos, produtos] = await Promise.all([
    listarLancamentos(sessao.supabase, {
      postoId: posto.id,
      inicio: intervaloDoDia(de).inicio,
      fim: intervaloDoDia(ate).fim,
      limite: 5000,
    }),
    listarProdutos(sessao.supabase),
  ])
  const nome = new Map(produtos.map((x) => [x.codigo, x.nome]))
  const dataHora = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'short',
    timeStyle: 'medium',
  })

  const linhas = [
    [
      'Data/hora',
      'Posto',
      'Tipo',
      'Responsável',
      'Produto',
      'Estoque inicial',
      'Descarga',
      'Vendido',
      'Estoque final calc.',
      'Régua',
      'Diferença',
      'Observação',
    ],
  ]
  for (const l of [...lancamentos].reverse()) {
    for (const i of l.lancamento_itens) {
      linhas.push(
        [
          dataHora.format(new Date(l.criado_em)),
          posto.nome,
          l.tipo === 'fechamento' ? 'Fechamento' : 'Atualização',
          l.criado_por_nome,
          nome.get(i.produto_codigo) ?? i.produto_codigo,
          i.estoque_inicial,
          i.descarga,
          i.vendido,
          i.estoque_final,
          i.regua,
          i.diferenca,
          l.observacao,
        ].map(celula),
      )
    }
  }

  const csv = '\uFEFF' + linhas.map((l) => l.join(';')).join('\r\n')
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="lancamentos-${posto.slug}-${de}-a-${ate}.csv"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
