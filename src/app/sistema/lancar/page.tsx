import type { Metadata } from 'next'
import Link from 'next/link'
import { ClipboardList, Gauge, Ruler } from 'lucide-react'
import { TituloPagina } from '@/components/sistema/ui'
import { exigirSessao } from '@/lib/auth'
import { pode } from '@/lib/permissoes'

export const metadata: Metadata = { title: 'Lançar' }

export default async function Lancar() {
  const { perfil, postos } = await exigirSessao()
  const opcoes = [
    pode.encerrantes(perfil) && {
      href: '/sistema/encerrantes',
      titulo: '1. Encerrantes dos bicos',
      texto: 'Leitura de cada bico no fim do turno. Calcula os litros vendidos automaticamente.',
      icone: Gauge,
    },
    pode.fechamento(perfil) && {
      href: '/sistema/fechamento',
      titulo: '2. Fechamento de turno',
      texto: 'Estoque inicial, descarga, vendido e régua. Gera o relatório para o WhatsApp.',
      icone: ClipboardList,
    },
    pode.atualizacao(perfil) && {
      href: '/sistema/atualizacao',
      titulo: 'Atualização rápida de estoque',
      texto: 'Atualiza só a régua dos tanques, fora do horário de fechamento.',
      icone: Ruler,
    },
  ].filter(Boolean) as { href: string; titulo: string; texto: string; icone: typeof Gauge }[]

  return (
    <>
      <TituloPagina titulo="Lançar" descricao={postos[0] ? postos[0].nome : undefined} />
      <ul className="grid gap-3 md:grid-cols-3">
        {opcoes.map(({ href, titulo, texto, icone: Icone }) => (
          <li key={href}>
            <Link href={href} className="cartao flex h-full gap-4 p-5 hover:border-marca">
              <Icone aria-hidden="true" className="size-8 shrink-0 text-marca" />
              <span>
                <span className="block text-lg font-extrabold text-tinta">{titulo}</span>
                <span className="mt-1 block text-sm text-slate-600">{texto}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
