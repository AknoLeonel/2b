#!/usr/bin/env node
// =====================================================================
// Converte a exportação JSON do Firebase Realtime Database (sistema
// antigo) em um arquivo SQL para importar no Supabase.
//
//   1. Firebase Console → Realtime Database → ⋮ → "Exportar JSON"
//   2. npm run firebase:sql -- caminho/rede-2b-export.json importacao-firebase.sql
//   3. Supabase → SQL Editor → cole o conteúdo do .sql e execute
//
// Importa: postos_2b_historico (fechamentos, atualizações e encerrantes)
// e postos_2b_emprestimos. É idempotente (id_externo): pode rodar de novo.
// O arquivo gerado contém dados operacionais — não versione.
// =====================================================================
import { readFile, writeFile } from 'node:fs/promises'

const PRODUTO_ANTIGO = {
  s10: 's10',
  s500: 's500',
  comum: 'comum',
  vpower: 'aditivada',
  etanol: 'etanol',
  arla_g: 'arla_granel',
  arla_b: 'arla_balde',
}

const PRODUTO_EMPRESTIMO = {
  'DIESEL S-10': 's10',
  'DIESEL S-500': 's500',
  'GAS. COMUM': 'comum',
  'GAS. ADITIVADA': 'aditivada',
  ETANOL: 'etanol',
}

const avisos = []

function texto(valor) {
  if (valor === null || valor === undefined) return 'null'
  return `'${String(valor).replace(/'/g, "''")}'`
}

function numero(valor, contexto) {
  if (valor === null || valor === undefined || String(valor).trim() === '') return null
  const n = Number(String(valor).replace(',', '.'))
  if (!Number.isFinite(n)) {
    avisos.push(`valor não numérico ignorado (${contexto}): ${valor}`)
    return null
  }
  if (n < 0) {
    avisos.push(`valor negativo ignorado (${contexto}): ${valor}`)
    return null
  }
  return Math.round(n * 1000) / 1000
}

function sqlNumero(n) {
  return n === null ? 'null::numeric' : `${n}::numeric`
}

function quando(ts) {
  return `to_timestamp(${Number(ts)} / 1000.0)`
}

function idPosto(nome) {
  return `(select id from public.postos where nome = ${texto(nome)})`
}

function tipoDoEnvio(tipoEnvio) {
  return String(tipoEnvio ?? '')
    .toLowerCase()
    .startsWith('atualiza')
    ? 'atualizacao'
    : 'fechamento'
}

function lancamentoSql(posto, ts, snap) {
  const tipo = tipoDoEnvio(snap.tipoEnvio)
  const itens = []
  for (const [chave, v] of Object.entries(snap.valores ?? {})) {
    const produto = PRODUTO_ANTIGO[chave]
    if (!produto || !v) continue
    const ctx = `${posto} ${ts} ${chave}`
    const regua = numero(v.regua, ctx)
    const inicial = tipo === 'fechamento' ? numero(v.inicial, ctx) : null
    const descarga = tipo === 'fechamento' ? numero(v.descarga, ctx) : null
    const vendido = tipo === 'fechamento' ? numero(v.vendido, ctx) : null
    if ([regua, inicial, descarga, vendido].every((x) => x === null)) continue
    itens.push(
      `(${texto(produto)}, ${sqlNumero(inicial)}, ${sqlNumero(descarga)}, ${sqlNumero(vendido)}, ${sqlNumero(regua)})`,
    )
  }
  if (!itens.length) return null
  const autor = `${snap.tipoEnvio || 'Sistema antigo'} (importado)`
  return `with l as (
  insert into public.lancamentos (posto_id, tipo, criado_por_nome, criado_em, id_externo)
  select ${idPosto(posto)}, '${tipo}', ${texto(autor)}, ${quando(ts)}, ${texto(`firebase:lanc:${posto}:${ts}`)}
  on conflict (id_externo) do nothing
  returning id, posto_id
)
insert into public.lancamento_itens (lancamento_id, produto_codigo, estoque_inicial, descarga, vendido, regua)
select l.id, v.produto, v.inicial, v.descarga, v.vendido, v.regua
from l cross join (values
  ${itens.join(',\n  ')}
) as v (produto, inicial, descarga, vendido, regua)
where exists (select 1 from public.tanques t where t.posto_id = l.posto_id and t.produto_codigo = v.produto);`
}

function leituraSql(posto, ts, snap) {
  const itens = []
  for (const [bico, valor] of Object.entries(snap.encerrantes ?? {})) {
    const n = numero(valor, `${posto} ${ts} bico ${bico}`)
    if (n === null || !/^\d+$/.test(bico)) continue
    itens.push(`(${Number(bico)}, ${n}::numeric)`)
  }
  if (!itens.length) return null
  return `with l as (
  insert into public.leituras_encerrantes (posto_id, criado_por_nome, criado_em, id_externo)
  select ${idPosto(posto)}, 'Sistema antigo (importado)', ${quando(ts)}, ${texto(`firebase:leit:${posto}:${ts}`)}
  on conflict (id_externo) do nothing
  returning id, posto_id
)
insert into public.leitura_itens (leitura_id, bico_id, valor)
select l.id, b.id, v.valor
from l
cross join (values
  ${itens.join(',\n  ')}
) as v (numero, valor)
join public.bicos b on b.posto_id = l.posto_id and b.numero = v.numero;`
}

function emprestimoSql(id, e) {
  const produto = PRODUTO_EMPRESTIMO[String(e.produto ?? '').toUpperCase()]
  const volume = numero(e.volume, `empréstimo ${id}`)
  if (
    !produto ||
    !volume ||
    !e.origem ||
    !e.destino ||
    e.origem === e.destino ||
    !/^\d{4}-\d{2}-\d{2}$/.test(e.data ?? '')
  ) {
    avisos.push(`empréstimo ${id} ignorado (dados incompletos)`)
    return null
  }
  const pago = e.status === 'pago'
  const devolvido = pago ? volume : Math.min(numero(e.devolvido, `empréstimo ${id}`) ?? 0, volume)
  const ts = Number(e.timestamp ?? id)
  return `with e as (
  insert into public.emprestimos (data, origem_posto_id, destino_posto_id, produto_codigo, volume, devolvido, status,
    criado_por_nome, criado_em, atualizado_por_nome, atualizado_em, quitado_em, id_externo)
  select ${texto(e.data)}::date, ${idPosto(e.origem)}, ${idPosto(e.destino)}, ${texto(produto)}, ${volume}, ${devolvido},
    '${pago ? 'pago' : 'pendente'}', ${texto(`${e.criadoPor || 'Sistema antigo'} (importado)`)}, ${quando(ts)},
    ${texto(e.atualizadoPor ?? null)}, ${quando(ts)}, ${pago ? quando(ts) : 'null'}, ${texto(`firebase:emp:${id}`)}
  on conflict (id_externo) do nothing
  returning id, criado_por_nome, volume
)
insert into public.emprestimo_movimentos (emprestimo_id, tipo, volume, observacao, usuario_nome, criado_em)
select id, 'criacao', volume, 'Importado do sistema antigo', criado_por_nome, ${quando(ts)} from e;`
}

async function main() {
  const [entrada, saida] = process.argv.slice(2)
  if (!entrada) {
    console.error('Uso: npm run firebase:sql -- <exportacao.json> [saida.sql]')
    process.exit(1)
  }
  const json = JSON.parse(await readFile(entrada, 'utf8'))
  const historico = json.postos_2b_historico ?? {}
  const emprestimos = json.postos_2b_emprestimos ?? {}

  const blocos = []
  let nLanc = 0
  let nLeit = 0
  let nEmp = 0

  for (const [posto, porTs] of Object.entries(historico)) {
    let anteriorValores = ''
    let anteriorEnc = ''
    for (const ts of Object.keys(porTs ?? {}).sort((a, b) => Number(a) - Number(b))) {
      const snap = porTs[ts] ?? {}
      // Cada registro do histórico antigo é uma "foto" acumulada do posto:
      // só vira lançamento o que mudou em relação à foto anterior.
      const chaveValores = JSON.stringify([snap.dataFormatada, snap.tipoEnvio, snap.valores ?? null])
      const chaveEnc = JSON.stringify([snap.dataEncerrantes, snap.encerrantes ?? null])
      if (snap.valores && chaveValores !== anteriorValores) {
        const sql = lancamentoSql(posto, ts, snap)
        if (sql) {
          blocos.push(sql)
          nLanc++
        }
      }
      if (snap.encerrantes && chaveEnc !== anteriorEnc) {
        const sql = leituraSql(posto, ts, snap)
        if (sql) {
          blocos.push(sql)
          nLeit++
        }
      }
      anteriorValores = chaveValores
      anteriorEnc = chaveEnc
    }
  }

  for (const [id, e] of Object.entries(emprestimos)) {
    const sql = emprestimoSql(id, e ?? {})
    if (sql) {
      blocos.push(sql)
      nEmp++
    }
  }

  const postosUsados = new Set([
    ...Object.keys(historico),
    ...Object.values(emprestimos).flatMap((e) => [e?.origem, e?.destino].filter(Boolean)),
  ])

  const sql = `-- Importação do sistema antigo (Firebase) — gerado em ${new Date().toISOString()}
-- ${nLanc} lançamento(s), ${nLeit} leitura(s) de encerrantes, ${nEmp} empréstimo(s)
begin;

-- Aborta se algum posto do arquivo não existir no banco.
do $$
declare v_faltando text;
begin
  select string_agg(n, ', ') into v_faltando
  from unnest(array[${[...postosUsados].map(texto).join(', ') || "''"}]::text[]) as n
  where n <> '' and not exists (select 1 from public.postos p where p.nome = n);
  if v_faltando is not null then
    raise exception 'Postos não encontrados: %', v_faltando;
  end if;
end $$;

${blocos.join('\n\n')}

-- remove cabeçalhos que ficaram sem itens (produto inexistente no posto)
delete from public.lancamentos l
where l.id_externo like 'firebase:%'
  and not exists (select 1 from public.lancamento_itens i where i.lancamento_id = l.id);
delete from public.leituras_encerrantes l
where l.id_externo like 'firebase:%'
  and not exists (select 1 from public.leitura_itens i where i.leitura_id = l.id);

commit;
`

  if (saida) {
    await writeFile(saida, sql, 'utf8')
    console.log(`✔ ${saida} gerado: ${nLanc} lançamentos, ${nLeit} leituras, ${nEmp} empréstimos.`)
  } else {
    process.stdout.write(sql)
  }
  for (const a of avisos) console.error(`⚠ ${a}`)
}

main().catch((erro) => {
  console.error(`✖ ${erro.message}`)
  process.exit(1)
})
