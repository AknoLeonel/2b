import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { JsonLd } from '@/components/json-ld'
import { SITE_URL } from '@/lib/env'
import { PRODUTOS_ESTATICOS } from '@/lib/rede'
import {
  enderecoCompleto,
  linkComoChegar,
  linkTelefone,
  linkWhatsapp,
  listarPostosPublicos,
  localidade,
  obterPostoPublico,
  type PostoPublico,
} from '@/lib/site'

export const revalidate = 3600
export const dynamicParams = true

export async function generateStaticParams() {
  const postos = await listarPostosPublicos()
  return postos.map((p) => ({ slug: p.slug }))
}

function descricaoDoPosto(p: PostoPublico) {
  const lugar = localidade(p)
  const combustiveis = p.produtos.map((x) => x.nome).join(', ')
  return (
    p.descricao ??
    `${p.nome}${lugar ? ` em ${lugar}` : ''}, da Rede 2B. Combustíveis: ${combustiveis}.${p.aberto_24h ? ' Aberto 24 horas.' : ''}`
  )
}

export async function generateMetadata({ params }: PageProps<'/postos/[slug]'>): Promise<Metadata> {
  const { slug } = await params
  const posto = await obterPostoPublico(slug)
  if (!posto) return { title: 'Posto não encontrado', robots: { index: false } }
  const lugar = localidade(posto)
  const titulo = `${posto.nome}${lugar ? ` – ${lugar}` : ''}`
  const descricao = descricaoDoPosto(posto)
  return {
    title: titulo,
    description: descricao,
    alternates: { canonical: `/postos/${posto.slug}` },
    openGraph: {
      title: `${titulo} | Postos 2B`,
      description: descricao,
      url: `/postos/${posto.slug}`,
      type: 'website',
    },
  }
}

const DIAS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default async function PaginaPosto({ params }: PageProps<'/postos/[slug]'>) {
  const { slug } = await params
  const [posto, todos] = await Promise.all([obterPostoPublico(slug), listarPostosPublicos()])
  if (!posto) notFound()

  const url = `${SITE_URL}/postos/${posto.slug}`
  const endereco = enderecoCompleto(posto)
  const lugar = localidade(posto)
  const comoChegar = linkComoChegar(posto)
  const whatsapp = linkWhatsapp(posto.whatsapp, `Olá! Vim pelo site e gostaria de falar com o ${posto.nome}.`)
  const telefone = linkTelefone(posto.telefone)
  const outros = todos.filter((p) => p.slug !== posto.slug)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'GasStation',
        '@id': `${url}#posto`,
        name: posto.nome,
        url,
        description: descricaoDoPosto(posto),
        image: `${SITE_URL}/icones/logo-512.png`,
        parentOrganization: { '@id': `${SITE_URL}/#organizacao` },
        ...(posto.telefone ? { telephone: posto.telefone } : {}),
        ...(posto.endereco || posto.cidade
          ? {
              address: {
                '@type': 'PostalAddress',
                ...(posto.endereco ? { streetAddress: posto.endereco } : {}),
                ...(posto.cidade ? { addressLocality: posto.cidade } : {}),
                ...(posto.uf ? { addressRegion: posto.uf } : {}),
                ...(posto.cep ? { postalCode: posto.cep } : {}),
                addressCountry: 'BR',
              },
            }
          : {}),
        ...(posto.latitude !== null && posto.longitude !== null
          ? { geo: { '@type': 'GeoCoordinates', latitude: posto.latitude, longitude: posto.longitude } }
          : {}),
        ...(posto.aberto_24h
          ? {
              openingHoursSpecification: {
                '@type': 'OpeningHoursSpecification',
                dayOfWeek: DIAS,
                opens: '00:00',
                closes: '23:59',
              },
            }
          : posto.horario_schema
            ? { openingHours: posto.horario_schema }
            : {}),
        ...(comoChegar ? { hasMap: comoChegar } : {}),
        ...(posto.servicos.length
          ? {
              amenityFeature: posto.servicos.map((s) => ({
                '@type': 'LocationFeatureSpecification',
                name: s,
                value: true,
              })),
            }
          : {}),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Início', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'Postos', item: `${SITE_URL}/#postos` },
          { '@type': 'ListItem', position: 3, name: posto.nome, item: url },
        ],
      },
    ],
  }

  return (
    <main className="bg-fundo pb-16">
      <JsonLd dados={jsonLd} />

      <div className="bg-marca text-white">
        <div className="mx-auto max-w-5xl px-4 py-10">
          <nav aria-label="Trilha de navegação" className="text-sm text-red-100">
            <ol className="flex flex-wrap items-center gap-1.5">
              <li>
                <Link href="/" className="hover:text-white hover:underline">
                  Início
                </Link>
              </li>
              <li aria-hidden="true">›</li>
              <li>
                <Link href="/#postos" className="hover:text-white hover:underline">
                  Postos
                </Link>
              </li>
              <li aria-hidden="true">›</li>
              <li aria-current="page" className="font-semibold text-white">
                {posto.nome}
              </li>
            </ol>
          </nav>
          <h1 className="mt-4 text-4xl font-extrabold">{posto.nome}</h1>
          {lugar ? <p className="mt-1 text-lg text-red-50">{lugar}</p> : null}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            {comoChegar ? (
              <a
                href={comoChegar}
                target="_blank"
                rel="noopener"
                className="botao bg-destaque text-tinta hover:bg-yellow-300"
              >
                Como chegar
              </a>
            ) : null}
            {whatsapp ? (
              <a href={whatsapp} target="_blank" rel="noopener" className="botao-whatsapp">
                WhatsApp
              </a>
            ) : null}
            {telefone ? (
              <a href={telefone} className="botao border-2 border-white/70 hover:bg-white/10">
                Ligar: {posto.telefone}
              </a>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-5xl gap-6 px-4 pt-8 md:grid-cols-3">
        <section aria-labelledby="titulo-combustiveis" className="cartao p-6 md:col-span-2">
          <h2 id="titulo-combustiveis" className="text-2xl font-extrabold text-tinta">
            Combustíveis disponíveis
          </h2>
          <ul className="mt-4 divide-y divide-slate-100">
            {posto.produtos.map((p) => (
              <li key={p.codigo} className="py-3">
                <p className="font-bold text-tinta">{p.nome}</p>
                <p className="text-sm text-slate-600">{PRODUTOS_ESTATICOS[p.codigo]?.descricao}</p>
              </li>
            ))}
          </ul>
          {posto.descricao ? <p className="mt-4 text-slate-700">{posto.descricao}</p> : null}
        </section>

        <aside aria-label="Informações do posto" className="space-y-6">
          <section className="cartao p-6">
            <h2 className="text-lg font-extrabold text-tinta">Informações</h2>
            <dl className="mt-3 space-y-3 text-sm">
              {endereco ? (
                <div>
                  <dt className="font-semibold text-slate-500">Endereço</dt>
                  <dd className="text-slate-800">{endereco}</dd>
                </div>
              ) : null}
              {posto.aberto_24h || posto.horario ? (
                <div>
                  <dt className="font-semibold text-slate-500">Horário</dt>
                  <dd className="text-slate-800">{posto.aberto_24h ? 'Aberto 24 horas' : posto.horario}</dd>
                </div>
              ) : null}
              {posto.telefone ? (
                <div>
                  <dt className="font-semibold text-slate-500">Telefone</dt>
                  <dd>
                    <a href={telefone ?? undefined} className="text-marca hover:underline">
                      {posto.telefone}
                    </a>
                  </dd>
                </div>
              ) : null}
              {!endereco && !posto.horario && !posto.aberto_24h && !posto.telefone ? (
                <div>
                  <dd className="text-slate-600">Fale com a gente para mais informações sobre esta unidade.</dd>
                </div>
              ) : null}
            </dl>
          </section>
          {posto.servicos.length ? (
            <section className="cartao p-6">
              <h2 className="text-lg font-extrabold text-tinta">Serviços</h2>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {posto.servicos.map((s) => (
                  <li key={s} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                    {s}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </aside>
      </div>

      <section aria-labelledby="titulo-outros" className="mx-auto mt-10 max-w-5xl px-4">
        <h2 id="titulo-outros" className="text-xl font-extrabold text-tinta">
          Outros postos da rede
        </h2>
        <ul className="mt-4 flex flex-wrap gap-2">
          {outros.map((p) => (
            <li key={p.slug}>
              <Link
                href={`/postos/${p.slug}`}
                className="inline-flex min-h-11 items-center rounded-xl border-2 border-slate-200 bg-white px-4 font-semibold text-slate-800 hover:border-marca hover:text-marca"
              >
                {p.nome}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
