'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { exigirSessao } from '@/lib/auth'
import { SUPABASE_CHAVE_PUBLICA, SUPABASE_URL } from '@/lib/env'
import { mensagemDeErro } from '@/lib/erros'
import type { EstadoAcao } from '@/lib/tipos'

const volume = z.number().min(0).max(99_999_999).nullable()
const observacao = z
  .string()
  .trim()
  .max(1000)
  .optional()
  .transform((v) => v || null)
const uuid = z.uuid()

function invalido(erro: z.ZodError): EstadoAcao {
  return { ok: false, mensagem: erro.issues[0]?.message ?? 'Dados inválidos.' }
}

function atualizarTelas() {
  revalidatePath('/sistema', 'layout')
}

// ---------------------------------------------------------------------
// Estoque
// ---------------------------------------------------------------------
const esquemaFechamento = z.object({
  postoId: uuid,
  itens: z
    .array(
      z.object({
        produto: z.string().regex(/^[a-z0-9_]+$/),
        inicial: volume,
        descarga: volume,
        vendido: volume,
        regua: volume,
      }),
    )
    .min(1)
    .max(20),
  observacao,
})

export async function registrarFechamento(
  entrada: z.input<typeof esquemaFechamento>,
): Promise<EstadoAcao<{ id: string }>> {
  const dados = esquemaFechamento.safeParse(entrada)
  if (!dados.success) return invalido(dados.error)
  const { supabase } = await exigirSessao()
  const { data, error } = await supabase.rpc('registrar_lancamento', {
    p_posto_id: dados.data.postoId,
    p_tipo: 'fechamento',
    p_itens: dados.data.itens,
    p_observacao: dados.data.observacao,
  })
  if (error) return { ok: false, mensagem: mensagemDeErro(error) }
  atualizarTelas()
  return { ok: true, mensagem: 'Fechamento salvo.', dados: { id: data as string } }
}

const esquemaAtualizacao = z.object({
  postoId: uuid,
  itens: z
    .array(z.object({ produto: z.string().regex(/^[a-z0-9_]+$/), regua: volume }))
    .min(1)
    .max(20),
  observacao,
})

export async function registrarAtualizacao(entrada: z.input<typeof esquemaAtualizacao>): Promise<EstadoAcao> {
  const dados = esquemaAtualizacao.safeParse(entrada)
  if (!dados.success) return invalido(dados.error)
  const { supabase } = await exigirSessao()
  const { error } = await supabase.rpc('registrar_lancamento', {
    p_posto_id: dados.data.postoId,
    p_tipo: 'atualizacao',
    p_itens: dados.data.itens,
    p_observacao: dados.data.observacao,
  })
  if (error) return { ok: false, mensagem: mensagemDeErro(error) }
  atualizarTelas()
  return { ok: true, mensagem: 'Estoque atualizado.' }
}

const esquemaEncerrantes = z.object({
  postoId: uuid,
  itens: z
    .array(z.object({ bico_id: uuid, valor: z.number().min(0).max(99_999_999_999) }))
    .min(1, 'Informe a leitura de ao menos um bico.')
    .max(100),
  observacao,
})

export async function registrarEncerrantes(entrada: z.input<typeof esquemaEncerrantes>): Promise<EstadoAcao> {
  const dados = esquemaEncerrantes.safeParse(entrada)
  if (!dados.success) return invalido(dados.error)
  const { supabase } = await exigirSessao()
  const { error } = await supabase.rpc('registrar_encerrantes', {
    p_posto_id: dados.data.postoId,
    p_itens: dados.data.itens,
    p_observacao: dados.data.observacao,
  })
  if (error) return { ok: false, mensagem: mensagemDeErro(error) }
  atualizarTelas()
  return { ok: true, mensagem: 'Leituras salvas.' }
}

// ---------------------------------------------------------------------
// Empréstimos
// ---------------------------------------------------------------------
const esquemaEmprestimo = z
  .object({
    data: z.iso.date('Data inválida.'),
    origem: uuid,
    destino: uuid,
    produto: z.string().regex(/^[a-z0-9_]+$/),
    volume: z.number().positive('Informe a litragem.').max(1_000_000),
    observacao: z
      .string()
      .trim()
      .max(500)
      .optional()
      .transform((v) => v || null),
  })
  .refine((d) => d.origem !== d.destino, 'Origem e destino devem ser postos diferentes.')

export async function registrarEmprestimo(entrada: z.input<typeof esquemaEmprestimo>): Promise<EstadoAcao> {
  const dados = esquemaEmprestimo.safeParse(entrada)
  if (!dados.success) return invalido(dados.error)
  const { supabase } = await exigirSessao()
  const { error } = await supabase.rpc('registrar_emprestimo', {
    p_data: dados.data.data,
    p_origem: dados.data.origem,
    p_destino: dados.data.destino,
    p_produto: dados.data.produto,
    p_volume: dados.data.volume,
    p_observacao: dados.data.observacao,
  })
  if (error) return { ok: false, mensagem: mensagemDeErro(error) }
  atualizarTelas()
  return { ok: true, mensagem: 'Empréstimo registrado.' }
}

const esquemaDevolucao = z.object({
  id: uuid,
  volume: z.number().positive('Informe o volume devolvido.').max(1_000_000),
  observacao: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => v || null),
})

export async function registrarDevolucao(entrada: z.input<typeof esquemaDevolucao>): Promise<EstadoAcao> {
  const dados = esquemaDevolucao.safeParse(entrada)
  if (!dados.success) return invalido(dados.error)
  const { supabase } = await exigirSessao()
  const { data, error } = await supabase.rpc('registrar_devolucao', {
    p_id: dados.data.id,
    p_volume: dados.data.volume,
    p_observacao: dados.data.observacao,
  })
  if (error) return { ok: false, mensagem: mensagemDeErro(error) }
  atualizarTelas()
  return { ok: true, mensagem: Number(data) > 0 ? 'Devolução registrada.' : 'Empréstimo quitado.' }
}

const esquemaQuitacao = z.object({
  id: uuid,
  observacao: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => v || null),
})

export async function quitarEmprestimo(entrada: z.input<typeof esquemaQuitacao>): Promise<EstadoAcao> {
  const dados = esquemaQuitacao.safeParse(entrada)
  if (!dados.success) return invalido(dados.error)
  const { supabase } = await exigirSessao()
  const { error } = await supabase.rpc('quitar_emprestimo', {
    p_id: dados.data.id,
    p_observacao: dados.data.observacao,
  })
  if (error) return { ok: false, mensagem: mensagemDeErro(error) }
  atualizarTelas()
  return { ok: true, mensagem: 'Empréstimo quitado.' }
}

const esquemaCancelamento = z.object({
  id: uuid,
  motivo: z.string().trim().min(3, 'Informe o motivo do cancelamento.').max(500),
})

export async function cancelarEmprestimo(entrada: z.input<typeof esquemaCancelamento>): Promise<EstadoAcao> {
  const dados = esquemaCancelamento.safeParse(entrada)
  if (!dados.success) return invalido(dados.error)
  const { supabase } = await exigirSessao()
  const { error } = await supabase.rpc('cancelar_emprestimo', { p_id: dados.data.id, p_motivo: dados.data.motivo })
  if (error) return { ok: false, mensagem: mensagemDeErro(error) }
  atualizarTelas()
  return { ok: true, mensagem: 'Empréstimo cancelado.' }
}

// ---------------------------------------------------------------------
// Conta
// ---------------------------------------------------------------------
const esquemaSenha = z
  .object({
    atual: z.string().min(1, 'Digite a senha atual.'),
    nova: z
      .string()
      .min(10, 'A nova senha precisa ter pelo menos 10 caracteres.')
      .max(72, 'A nova senha pode ter no máximo 72 caracteres.'),
    confirmacao: z.string(),
  })
  .refine((d) => d.nova === d.confirmacao, 'A confirmação não confere com a nova senha.')
  .refine((d) => d.nova !== d.atual, 'A nova senha precisa ser diferente da atual.')

export async function alterarSenha(_anterior: EstadoAcao | null, formData: FormData): Promise<EstadoAcao> {
  const dados = esquemaSenha.safeParse({
    atual: formData.get('atual'),
    nova: formData.get('nova'),
    confirmacao: formData.get('confirmacao'),
  })
  if (!dados.success) return invalido(dados.error)

  const { supabase } = await exigirSessao()
  const { data: usuario } = await supabase.auth.getUser()
  const email = usuario.user?.email
  if (!email) return { ok: false, mensagem: 'Sessão expirada. Entre novamente.' }

  // Confere a senha atual sem mexer na sessão do navegador.
  const verificador = createClient(SUPABASE_URL, SUPABASE_CHAVE_PUBLICA, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
  const { error: erroAtual } = await verificador.auth.signInWithPassword({ email, password: dados.data.atual })
  if (erroAtual) return { ok: false, mensagem: 'Senha atual incorreta.' }
  await verificador.auth.signOut({ scope: 'local' })

  const { error } = await supabase.auth.updateUser({ password: dados.data.nova })
  if (error) {
    if (error.code === 'weak_password') return { ok: false, mensagem: 'Senha fraca. Use letras, números e símbolos.' }
    return { ok: false, mensagem: 'Não foi possível alterar a senha agora.' }
  }
  return { ok: true, mensagem: 'Senha alterada com sucesso.' }
}
