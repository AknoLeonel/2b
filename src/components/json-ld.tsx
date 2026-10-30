/** Dados estruturados (schema.org). O "<" é escapado para impedir injeção de HTML. */
export function JsonLd({ dados }: { dados: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(dados).replace(/</g, '\\u003c') }}
    />
  )
}
