import 'server-only'

interface ErroBanco {
  code?: string
  message?: string
}

// Códigos usados nas funções do banco para mensagens próprias ao usuário.
const CODIGOS_COM_MENSAGEM = new Set(['42501', '22023', 'P0002'])

export function mensagemDeErro(
  erro: ErroBanco | null | undefined,
  padrao = 'Não foi possível salvar. Tente novamente.',
) {
  if (!erro) return padrao
  if (
    erro.code &&
    CODIGOS_COM_MENSAGEM.has(erro.code) &&
    erro.message &&
    !erro.message.startsWith('permission denied')
  ) {
    return erro.message
  }
  console.error('[supabase]', erro.code, erro.message)
  if (erro.code === '42501') return 'Você não tem permissão para esta ação.'
  return padrao
}
