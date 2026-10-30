#!/usr/bin/env node
// =====================================================================
// Cria os usuários da rede (os mesmos perfis do sistema antigo) no
// Supabase Auth e na tabela "perfis".
//
//   npm run usuarios:criar                 cria quem ainda não existe
//   npm run usuarios:criar -- --redefinir  gera senha nova para TODOS
//   npm run usuarios:criar -- --somente=zico,caixa-divisa
//
// Variáveis (lidas do .env.local): NEXT_PUBLIC_SUPABASE_URL,
// SUPABASE_SECRET_KEY e NEXT_PUBLIC_LOGIN_EMAIL_DOMAIN.
//
// Senhas: se existir scripts/senhas.local.json ({ "zico": "senha..." }),
// elas são usadas; senão o script gera senhas fortes e mostra UMA vez.
// Esse arquivo está no .gitignore — nunca o versione.
// =====================================================================
import { randomInt } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { createClient } from '@supabase/supabase-js'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const CHAVE = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY
const DOMINIO = (process.env.NEXT_PUBLIC_LOGIN_EMAIL_DOMAIN || 'postos2b.internal').trim().toLowerCase()

const POSTOS = {
  'gomes-serpa': 'Posto Gomes Serpa',
  caripare: 'Posto Caripare',
  'nosso-posto': 'Nosso Posto',
  matopiba: 'Posto Matopiba',
  flex: 'Posto Flex',
  divisa: 'Posto Divisa',
  urucuia: 'Posto Urucuia',
}

const USUARIOS = [
  { username: 'zico', nome: 'Zico', papel: 'gestor', acesso_total: true },
  { username: 'gilmacio', nome: 'Gilmacio', papel: 'gestor', acesso_total: true },
  { username: 'sabino', nome: 'Sabino', papel: 'gestor', acesso_total: true },
  // No sistema antigo o Marcos Henrique via apenas estes três postos.
  {
    username: 'marcos-henrique',
    nome: 'Marcos Henrique',
    papel: 'gestor',
    postos: ['gomes-serpa', 'matopiba', 'caripare'],
  },
  ...Object.entries(POSTOS).flatMap(([slug, nome]) => [
    { username: `gerente-${slug}`, nome: `Gerente · ${nome}`, papel: 'gerente', posto: slug },
    { username: `caixa-${slug}`, nome: `Caixa · ${nome}`, papel: 'caixa', posto: slug },
  ]),
]

const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
function gerarSenha() {
  const bloco = () => Array.from({ length: 4 }, () => ALFABETO[randomInt(ALFABETO.length)]).join('')
  return `${bloco()}-${bloco()}-${bloco()}`
}

function sair(mensagem) {
  console.error(`\n✖ ${mensagem}\n`)
  process.exit(1)
}

async function lerSenhasLocais() {
  try {
    const texto = await readFile(new globalThis.URL('./senhas.local.json', import.meta.url), 'utf8')
    return JSON.parse(texto)
  } catch (erro) {
    if (erro.code === 'ENOENT') return {}
    sair(`scripts/senhas.local.json inválido: ${erro.message}`)
  }
}

async function buscarUsuarioAuthPorEmail(admin, email) {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    const achado = data.users.find((u) => u.email?.toLowerCase() === email)
    if (achado) return achado
    if (data.users.length < 200) return null
  }
  return null
}

async function main() {
  if (!URL || !CHAVE) sair('Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SECRET_KEY (no .env.local).')

  const args = process.argv.slice(2)
  const redefinir = args.includes('--redefinir')
  const somente = args
    .find((a) => a.startsWith('--somente='))
    ?.split('=')[1]
    ?.split(',')
    .filter(Boolean)

  const admin = createClient(URL, CHAVE, { auth: { persistSession: false, autoRefreshToken: false } })
  const senhasLocais = await lerSenhasLocais()

  const { data: postos, error: erroPostos } = await admin.from('postos').select('id, slug')
  if (erroPostos) sair(`Não consegui ler a tabela "postos" (${erroPostos.message}). Aplique as migrações primeiro.`)
  const idPosto = Object.fromEntries(postos.map((p) => [p.slug, p.id]))
  const faltando = Object.keys(POSTOS).filter((s) => !idPosto[s])
  if (faltando.length) sair(`Postos ausentes no banco: ${faltando.join(', ')}. Aplique as migrações primeiro.`)

  const { data: perfis, error: erroPerfis } = await admin.from('perfis').select('id, username')
  if (erroPerfis) sair(`Não consegui ler a tabela "perfis": ${erroPerfis.message}`)
  const existentes = new Map(perfis.map((p) => [p.username, p.id]))

  const resultado = []
  for (const u of USUARIOS) {
    if (somente && !somente.includes(u.username)) continue
    const email = `${u.username}@${DOMINIO}`
    const senha = senhasLocais[u.username] || gerarSenha()
    if (senha.length < 10) sair(`A senha de "${u.username}" em senhas.local.json precisa ter 10+ caracteres.`)

    const idExistente = existentes.get(u.username)
    if (idExistente) {
      if (!redefinir) {
        resultado.push({ usuario: u.username, situacao: 'já existia', senha: '' })
        continue
      }
      const { error } = await admin.auth.admin.updateUserById(idExistente, { password: senha })
      if (error) sair(`Falha ao redefinir ${u.username}: ${error.message}`)
      resultado.push({ usuario: u.username, situacao: 'senha redefinida', senha })
      continue
    }

    let { data: criado, error } = await admin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      app_metadata: { username: u.username },
      user_metadata: { nome: u.nome },
    })
    let userId = criado?.user?.id
    if (error) {
      // Já existe no Auth mas sem perfil (execução anterior interrompida): reaproveita.
      const existente = await buscarUsuarioAuthPorEmail(admin, email)
      if (!existente) sair(`Falha ao criar ${u.username}: ${error.message}`)
      userId = existente.id
      const { error: e2 } = await admin.auth.admin.updateUserById(userId, { password: senha })
      if (e2) sair(`Falha ao atualizar ${u.username}: ${e2.message}`)
    }

    const { error: erroPerfil } = await admin.from('perfis').insert({
      id: userId,
      username: u.username,
      nome: u.nome,
      papel: u.papel,
      posto_id: u.posto ? idPosto[u.posto] : null,
      acesso_total: Boolean(u.acesso_total),
    })
    if (erroPerfil) sair(`Falha ao criar o perfil de ${u.username}: ${erroPerfil.message}`)

    if (u.postos?.length) {
      const { error: erroVinculo } = await admin
        .from('perfil_postos')
        .insert(u.postos.map((slug) => ({ perfil_id: userId, posto_id: idPosto[slug] })))
      if (erroVinculo) sair(`Falha ao vincular postos de ${u.username}: ${erroVinculo.message}`)
    }
    resultado.push({ usuario: u.username, situacao: 'criado', senha })
  }

  console.log(`\nDomínio de login: @${DOMINIO}\n`)
  console.table(resultado)
  if (resultado.some((r) => r.senha)) {
    console.log(
      '\n⚠  Entregue cada senha pessoalmente e peça para o usuário trocar em "Conta".' +
        '\n   Estas senhas não ficam salvas em lugar nenhum — copie agora.\n',
    )
  }
}

main().catch((erro) => sair(erro.message ?? String(erro)))
