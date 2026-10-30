'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { exigirSessao } from '@/lib/auth'
import { emailDoUsuario } from '@/lib/env'
import { pode } from '@/lib/permissoes'
import { gerarSenha } from '@/lib/senha'
import { criarClienteAdmin } from '@/lib/supabase/admin'
import type { EstadoAcao } from '@/lib/tipos'

async function exigirAdministrador() {
  const sessao = await exigirSessao()
  if (!pode.usuarios(sessao.perfil)) return { erro: 'Apenas gestores com acesso total gerenciam usuários.' } as const
  const admin = criarClienteAdmin()
  if (!admin) return { erro: 'Configure SUPABASE_SECRET_KEY no servidor para gerenciar usuários.' } as const
  return { sessao, admin } as const
}

async function auditar(
  admin: NonNullable<ReturnType<typeof criarClienteAdmin>>,
  quem: { id: string; nome: string },
  acao: string,
  registroId: string,
  dados: Record<string, unknown>,
) {
  await admin.from('auditoria').insert({
    tabela: 'usuarios',
    registro_id: registroId,
    acao,
    usuario_id: quem.id,
    usuario_nome: quem.nome,
    dados_novos: dados,
  })
}

const esquemaNovo = z
  .object({
    username: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9]+([.-][a-z0-9]+)*$/, 'Usuário: use letras minúsculas, números, ponto ou hífen.')
      .min(3, 'Usuário muito curto.')
      .max(40, 'Usuário muito longo.'),
    nome: z.string().trim().min(2, 'Informe o nome.').max(80),
    papel: z.enum(['gestor', 'gerente', 'caixa']),
    posto_id: z.string().optional(),
    acesso_total: z.boolean(),
    postos: z.array(z.uuid()),
    senha: z.string().max(72).optional(),
  })
  .refine((d) => d.papel === 'gestor' || z.uuid().safeParse(d.posto_id).success, 'Escolha o posto do usuário.')
  .refine((d) => d.papel !== 'gestor' || d.acesso_total || d.postos.length > 0, 'Escolha os postos do gestor.')
  .refine((d) => !d.senha || d.senha.length >= 10, 'A senha precisa ter pelo menos 10 caracteres.')

export async function criarUsuario(
  _anterior: EstadoAcao<{ username: string; senha: string }> | null,
  formData: FormData,
): Promise<EstadoAcao<{ username: string; senha: string }>> {
  const ctx = await exigirAdministrador()
  if ('erro' in ctx) return { ok: false, mensagem: ctx.erro! }
  const { sessao, admin } = ctx

  const dados = esquemaNovo.safeParse({
    username: formData.get('username'),
    nome: formData.get('nome'),
    papel: formData.get('papel'),
    posto_id: formData.get('posto_id') || undefined,
    acesso_total: formData.get('acesso_total') === 'on',
    postos: formData.getAll('postos').map(String),
    senha: (formData.get('senha') as string) || undefined,
  })
  if (!dados.success) return { ok: false, mensagem: dados.error.issues[0]?.message ?? 'Dados inválidos.' }
  const d = dados.data
  const gestor = d.papel === 'gestor'
  const senha = d.senha || gerarSenha()

  const { data: criado, error } = await admin.auth.admin.createUser({
    email: emailDoUsuario(d.username),
    password: senha,
    email_confirm: true,
    app_metadata: { username: d.username },
    user_metadata: { nome: d.nome },
  })
  if (error || !criado.user) {
    if (error?.code === 'email_exists' || error?.status === 422)
      return { ok: false, mensagem: 'Já existe um usuário com esse nome.' }
    if (error?.code === 'weak_password') return { ok: false, mensagem: 'Senha fraca. Use uma senha mais forte.' }
    console.error('[usuarios] createUser', error?.message)
    return { ok: false, mensagem: 'Não foi possível criar o usuário.' }
  }

  const { error: erroPerfil } = await admin.from('perfis').insert({
    id: criado.user.id,
    username: d.username,
    nome: d.nome,
    papel: d.papel,
    posto_id: gestor ? null : d.posto_id,
    acesso_total: gestor && d.acesso_total,
  })
  if (erroPerfil) {
    await admin.auth.admin.deleteUser(criado.user.id)
    if (erroPerfil.code === '23505') return { ok: false, mensagem: 'Já existe um usuário com esse nome.' }
    console.error('[usuarios] perfil', erroPerfil.message)
    return { ok: false, mensagem: 'Não foi possível criar o perfil do usuário.' }
  }

  if (gestor && !d.acesso_total) {
    await admin.from('perfil_postos').insert(d.postos.map((posto_id) => ({ perfil_id: criado.user.id, posto_id })))
  }

  await auditar(admin, sessao.perfil, 'usuario_criado', criado.user.id, { username: d.username, papel: d.papel })
  revalidatePath('/sistema/usuarios')
  return { ok: true, mensagem: 'Usuário criado.', dados: { username: d.username, senha } }
}

export async function redefinirSenha(perfilId: string): Promise<EstadoAcao<{ senha: string }>> {
  const ctx = await exigirAdministrador()
  if ('erro' in ctx) return { ok: false, mensagem: ctx.erro! }
  if (!z.uuid().safeParse(perfilId).success) return { ok: false, mensagem: 'Usuário inválido.' }

  const senha = gerarSenha()
  const { error } = await ctx.admin.auth.admin.updateUserById(perfilId, { password: senha })
  if (error) {
    console.error('[usuarios] reset', error.message)
    return { ok: false, mensagem: 'Não foi possível redefinir a senha.' }
  }
  await auditar(ctx.admin, ctx.sessao.perfil, 'senha_redefinida', perfilId, {})
  return { ok: true, mensagem: 'Senha redefinida.', dados: { senha } }
}

export async function alterarAtivo(perfilId: string, ativo: boolean): Promise<EstadoAcao> {
  const ctx = await exigirAdministrador()
  if ('erro' in ctx) return { ok: false, mensagem: ctx.erro! }
  if (!z.uuid().safeParse(perfilId).success) return { ok: false, mensagem: 'Usuário inválido.' }
  if (perfilId === ctx.sessao.perfil.id) return { ok: false, mensagem: 'Você não pode desativar o próprio acesso.' }

  const { error } = await ctx.admin.from('perfis').update({ ativo }).eq('id', perfilId)
  if (error) return { ok: false, mensagem: 'Não foi possível alterar o usuário.' }
  // Bloqueia também o login (o RLS já corta o acesso aos dados na hora).
  await ctx.admin.auth.admin.updateUserById(perfilId, { ban_duration: ativo ? 'none' : '876000h' })
  await auditar(ctx.admin, ctx.sessao.perfil, ativo ? 'usuario_ativado' : 'usuario_desativado', perfilId, {})
  revalidatePath('/sistema/usuarios')
  return { ok: true, mensagem: ativo ? 'Usuário reativado.' : 'Usuário desativado.' }
}
