'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

/** Troca o posto da tela (parâmetro ?posto=) — só aparece para quem tem mais de um posto. */
export function SeletorPosto({
  postos,
  atual,
  rotulo = 'Posto',
}: {
  postos: { slug: string; nome: string }[]
  atual: string
  rotulo?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  if (postos.length < 2) return null

  return (
    <div className="w-full sm:w-72">
      <label htmlFor="seletor-posto" className="rotulo">
        {rotulo}
      </label>
      <select
        id="seletor-posto"
        className="campo"
        value={atual}
        onChange={(e) => {
          const novo = new URLSearchParams(params.toString())
          novo.set('posto', e.target.value)
          router.push(`${pathname}?${novo.toString()}`)
        }}
      >
        {postos.map((p) => (
          <option key={p.slug} value={p.slug}>
            {p.nome}
          </option>
        ))}
      </select>
    </div>
  )
}
