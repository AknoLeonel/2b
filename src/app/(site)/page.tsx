import Link from 'next/link'
import { JsonLd } from '@/components/json-ld'
import { CONTATO, SITE_URL } from '@/lib/env'
import {
  enderecoCompleto,
  linkTelefone,
  linkWhatsapp,
  listarPostosPublicos,
  localidade,
  produtosDaRede,
} from '@/lib/site'
import { CartaoPostoPublico } from './cartao-posto-publico'

export const revalidate = 3600

export const metadata = {
  alternates: { canonical: '/' },
}

function listaNomes(nomes: string[]) {
  if (nomes.length <= 1) return nomes.join('')
  return `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`
}

export default async function PaginaInicial() {
  const postos = await listarPostosPublicos()
  const produtos = produtosDaRede(postos)
  const total = postos.length
  const comS10 = produtos.find((p) => p.codigo === 's10')?.postos.length ?? 0
  const comArla = new Set(
    produtos.filter((p) => p.codigo.startsWith('arla')).flatMap((p) => p.postos.map((posto) => posto.slug)),
  )
  const postosArla = postos.filter((p) => comArla.has(p.slug))
  const whatsappGeral = linkWhatsapp(CONTATO.whatsapp, 'Olá! Vim pelo site da Rede 2B.')
  const nomesCombustiveis = produtos.filter((p) => !p.codigo.startsWith('arla')).map((p) => p.nome)

  const perguntas = [
    {
      pergunta: 'Quais combustíveis a Rede 2B oferece?',
      resposta: `Trabalhamos com ${listaNomes(nomesCombustiveis)}${postosArla.length ? ', além de Arla 32' : ''}. A disponibilidade varia por posto — veja a lista de cada unidade.`,
    },
    {
      pergunta: 'Qual a diferença entre Diesel S-10 e Diesel S-500?',
      resposta:
        'O número indica o teor máximo de enxofre: até 10 mg/kg no S-10 e até 500 mg/kg no S-500. Veículos a diesel fabricados a partir de 2012 (Proconve P7) exigem o S-10; para os demais, siga a recomendação do fabricante.',
    },
    ...(postosArla.length
      ? [
          {
            pergunta: 'Onde encontro Arla 32?',
            resposta: `O Arla 32 está disponível em ${listaNomes(postosArla.map((p) => p.nome))}.`,
          },
        ]
      : []),
    {
      pergunta: 'Quantos postos tem a rede?',
      resposta: `A Rede 2B tem ${total} postos: ${listaNomes(postos.map((p) => p.nome))}.`,
    },
    {
      pergunta: 'Vocês atendem frotas e empresas?',
      resposta:
        'Sim. Fale com o posto mais próximo ou com a nossa equipe pelos contatos desta página para combinar o abastecimento da sua frota.',
    },
  ]

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organizacao`,
        name: 'Rede de Postos 2B',
        alternateName: 'Postos 2B',
        url: SITE_URL,
        logo: `${SITE_URL}/icones/logo-512.png`,
        ...(CONTATO.email ? { email: CONTATO.email } : {}),
        ...(CONTATO.instagram ? { sameAs: [CONTATO.instagram] } : {}),
        subOrganization: postos.map((p) => ({ '@id': `${SITE_URL}/postos/${p.slug}#posto` })),
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#site`,
        url: SITE_URL,
        name: 'Postos 2B',
        inLanguage: 'pt-BR',
        publisher: { '@id': `${SITE_URL}/#organizacao` },
      },
      {
        '@type': 'ItemList',
        name: 'Postos da Rede 2B',
        itemListElement: postos.map((p, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          item: {
            '@type': 'GasStation',
            '@id': `${SITE_URL}/postos/${p.slug}#posto`,
            name: p.nome,
            url: `${SITE_URL}/postos/${p.slug}`,
            ...(enderecoCompleto(p) ? { address: enderecoCompleto(p) } : {}),
          },
        })),
      },
      {
        '@type': 'FAQPage',
        mainEntity: perguntas.map((q) => ({
          '@type': 'Question',
          name: q.pergunta,
          acceptedAnswer: { '@type': 'Answer', text: q.resposta },
        })),
      },
    ],
  }

  return (
    <main>
      <JsonLd dados={jsonLd} />

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-marca via-marca to-marca-escura text-white">
        <div
          aria-hidden="true"
          className="absolute -right-24 -top-24 size-80 rounded-full border-[28px] border-destaque/30 sm:size-[28rem]"
        />
        <div className="relative mx-auto max-w-6xl px-4 py-14 sm:py-20">
          <p className="mb-3 inline-block rounded-full bg-destaque px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-tinta">
            {total} postos na rede
          </p>
          <h1 className="max-w-3xl text-4xl font-extrabold leading-tight sm:text-5xl">
            Combustível de qualidade e atendimento de confiança em toda a Rede 2B
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-red-50">
            {listaNomes([...nomesCombustiveis, ...(postosArla.length ? ['Arla 32'] : [])])} para o seu carro, caminhão
            ou frota.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href="#postos" className="botao bg-destaque text-tinta shadow-md hover:bg-yellow-300">
              Encontre um posto
            </a>
            {whatsappGeral ? (
              <a
                href={whatsappGeral}
                target="_blank"
                rel="noopener"
                className="botao border-2 border-white/70 hover:bg-white/10"
              >
                Falar no WhatsApp
              </a>
            ) : (
              <a href="#contato" className="botao border-2 border-white/70 hover:bg-white/10">
                Fale com a gente
              </a>
            )}
          </div>
          <dl className="mt-12 grid max-w-3xl grid-cols-3 gap-3 text-center">
            <div className="rounded-2xl bg-white/10 p-3 sm:p-4">
              <dt className="text-xs font-semibold text-red-100 sm:text-sm">Postos</dt>
              <dd className="text-2xl font-extrabold sm:text-3xl">{total}</dd>
            </div>
            <div className="rounded-2xl bg-white/10 p-3 sm:p-4">
              <dt className="text-xs font-semibold text-red-100 sm:text-sm">Com Diesel S-10</dt>
              <dd className="text-2xl font-extrabold sm:text-3xl">{comS10 === total ? 'Todos' : comS10}</dd>
            </div>
            <div className="rounded-2xl bg-white/10 p-3 sm:p-4">
              <dt className="text-xs font-semibold text-red-100 sm:text-sm">Com Arla 32</dt>
              <dd className="text-2xl font-extrabold sm:text-3xl">{postosArla.length}</dd>
            </div>
          </dl>
        </div>
      </section>

      {/* POSTOS */}
      <section id="postos" aria-labelledby="titulo-postos" className="scroll-mt-20 bg-fundo py-14">
        <div className="mx-auto max-w-6xl px-4">
          <h2 id="titulo-postos" className="text-3xl font-extrabold text-tinta">
            Nossos postos
          </h2>
          <p className="mt-2 max-w-2xl text-slate-600">
            Escolha a unidade mais próxima para ver os combustíveis disponíveis, o horário e como chegar.
          </p>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {postos.map((p) => (
              <CartaoPostoPublico key={p.slug} posto={p} />
            ))}
          </div>
        </div>
      </section>

      {/* COMBUSTÍVEIS */}
      <section id="combustiveis" aria-labelledby="titulo-combustiveis" className="scroll-mt-20 py-14">
        <div className="mx-auto max-w-6xl px-4">
          <h2 id="titulo-combustiveis" className="text-3xl font-extrabold text-tinta">
            Combustíveis e Arla 32
          </h2>
          <p className="mt-2 max-w-2xl text-slate-600">Saiba o que cada produto oferece e em quais postos encontrar.</p>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {produtos.map((produto) => (
              <article key={produto.codigo} className="cartao p-5">
                <h3 className="flex items-center gap-2 text-lg font-extrabold text-tinta">
                  <span aria-hidden="true" className="inline-block h-6 w-1.5 rounded-full bg-marca" />
                  {produto.nome}
                </h3>
                <p className="mt-2 text-slate-600">{produto.descricao}</p>
                <p className="mt-3 text-sm text-slate-500">
                  <span className="font-semibold text-slate-700">Disponível em: </span>
                  {produto.postos.map((p, i) => (
                    <span key={p.slug}>
                      {i > 0 ? ', ' : ''}
                      <Link href={`/postos/${p.slug}`} className="text-marca hover:underline">
                        {p.nome}
                      </Link>
                    </span>
                  ))}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* FROTAS */}
      <section id="frotas" aria-labelledby="titulo-frotas" className="scroll-mt-20 bg-tinta py-14 text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 md:grid-cols-2">
          <div>
            <h2 id="titulo-frotas" className="text-3xl font-extrabold">
              Abastecimento para frotas, transportadoras e produtores
            </h2>
            <p className="mt-3 text-slate-300">
              Diesel S-10 em {comS10 === total ? 'todos os postos' : `${comS10} postos`} da rede
              {postosArla.length ? ` e Arla 32 em ${postosArla.length} unidades` : ''}. Fale com a gente para combinar o
              abastecimento da sua operação.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row md:justify-end">
            {whatsappGeral ? (
              <a href={whatsappGeral} target="_blank" rel="noopener" className="botao-whatsapp">
                Conversar no WhatsApp
              </a>
            ) : null}
            <a href="#contato" className="botao bg-destaque text-tinta hover:bg-yellow-300">
              Ver contatos
            </a>
          </div>
        </div>
      </section>

      {/* DÚVIDAS */}
      <section id="duvidas" aria-labelledby="titulo-duvidas" className="scroll-mt-20 py-14">
        <div className="mx-auto max-w-3xl px-4">
          <h2 id="titulo-duvidas" className="text-3xl font-extrabold text-tinta">
            Dúvidas frequentes
          </h2>
          <div className="mt-6 divide-y divide-slate-200 rounded-2xl border border-slate-200">
            {perguntas.map((q) => (
              <details key={q.pergunta} className="group p-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold text-tinta [&::-webkit-details-marker]:hidden">
                  {q.pergunta}
                  <span aria-hidden="true" className="text-xl text-marca transition group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-slate-600">{q.resposta}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CONTATO */}
      <section id="contato" aria-labelledby="titulo-contato" className="scroll-mt-20 bg-fundo py-14">
        <div className="mx-auto max-w-6xl px-4">
          <h2 id="titulo-contato" className="text-3xl font-extrabold text-tinta">
            Contato
          </h2>
          {whatsappGeral || CONTATO.email ? (
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              {whatsappGeral ? (
                <a href={whatsappGeral} target="_blank" rel="noopener" className="botao-whatsapp">
                  WhatsApp da rede
                </a>
              ) : null}
              {CONTATO.email ? (
                <a href={`mailto:${CONTATO.email}`} className="botao-secundario">
                  {CONTATO.email}
                </a>
              ) : null}
            </div>
          ) : null}
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {postos.map((p) => {
              const tel = linkTelefone(p.telefone)
              const zap = linkWhatsapp(p.whatsapp)
              const lugar = localidade(p)
              return (
                <li key={p.slug} className="cartao p-4">
                  <p className="font-extrabold text-tinta">{p.nome}</p>
                  {lugar ? <p className="text-sm text-slate-600">{lugar}</p> : null}
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    {tel ? (
                      <a href={tel} className="font-semibold text-marca hover:underline">
                        {p.telefone}
                      </a>
                    ) : null}
                    {zap ? (
                      <a
                        href={zap}
                        target="_blank"
                        rel="noopener"
                        className="font-semibold text-[#1f7a45] hover:underline"
                      >
                        WhatsApp
                      </a>
                    ) : null}
                    <Link href={`/postos/${p.slug}`} className="font-semibold text-slate-700 hover:underline">
                      Detalhes
                    </Link>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      </section>
    </main>
  )
}
