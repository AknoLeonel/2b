import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/env'
import { listarPostosPublicos } from '@/lib/site'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const postos = await listarPostosPublicos()
  const maisRecente = postos
    .map((p) => p.atualizado_em)
    .filter((d): d is string => Boolean(d))
    .sort()
    .at(-1)

  return [
    {
      url: SITE_URL,
      lastModified: maisRecente ? new Date(maisRecente) : undefined,
      changeFrequency: 'weekly',
      priority: 1,
    },
    ...postos.map((p) => ({
      url: `${SITE_URL}/postos/${p.slug}`,
      lastModified: p.atualizado_em ? new Date(p.atualizado_em) : undefined,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
  ]
}
