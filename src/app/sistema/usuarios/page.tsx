import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Aviso, TituloPagina } from '@/components/sistema/ui'
import { exigirSessao } from '@/lib/auth'
import { pode, ROTULO_PAPEL } from '@/lib/permissoes'
import { criarClienteAdmin } from '@/lib/supabase/admin'
import type { Perfil } from '@/lib/tipos'
import { AcoesUsuario } from './acoes-usuario'
import { FormNovoUsuario } from './form-novo-usuario'

export const metadata: Metadata = { title: 'Usuários' }

export default async function Usuarios() {
  const { perfil: eu, supabase } = await exigirSessao()
  if (!pode.usuarios(eu)) redirect('/sistema')

  const [{ data: perfis }, { data: postos }, { data: vinculos }] = await Promise.all([
    supabase
      .from('perfis')
      .select('id, username, nome, papel, posto_id, acesso_total, ativo')
      .order('papel')
      .order('username'),
    supabase.from('postos').select('id, nome').eq('ativo', true).order('ordem'),
    supabase.from('perfil_postos').select('perfil_id, posto_id'),
  ])
  const nomePosto = new Map(((postos ?? []) as { id: string; nome: string }[]).map((p) => [p.id, p.nome]))
  const escopo = new Map<string, string[]>()
  for (const v of (vinculos ?? []) as { perfil_id: string; posto_id: string }[]) {
    escopo.set(v.perfil_id, [...(escopo.get(v.perfil_id) ?? []), nomePosto.get(v.posto_id) ?? '?'])
  }
  const adminDisponivel = criarClienteAdmin() !== null

  return (
    <>
      <TituloPagina
        titulo="Usuários"
        voltar={{ href: '/sistema', rotulo: 'Voltar para o início' }}
        descricao="Crie acessos, redefina senhas e desative quem saiu da equipe."
      />
      {!adminDisponivel ? (
        <Aviso tipo="atencao" className="mb-6">
          Para criar usuários e redefinir senhas, cadastre a variável <code>SUPABASE_SECRET_KEY</code> no servidor
          (Vercel → Settings → Environment Variables).
        </Aviso>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <section aria-labelledby="titulo-lista">
          <h2 id="titulo-lista" className="sr-only">
            Lista de usuários
          </h2>
          <ul className="grid gap-3 md:grid-cols-2">
            {((perfis ?? []) as Perfil[]).map((u) => (
              <li key={u.id} className={`cartao p-4 ${u.ativo ? '' : 'opacity-60'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-extrabold text-tinta">{u.nome}</p>
                    <p className="font-mono text-sm text-slate-600">{u.username}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded px-2 py-0.5 text-xs font-bold ${
                      u.ativo ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {u.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-700">
                  <strong>{ROTULO_PAPEL[u.papel]}</strong> ·{' '}
                  {u.acesso_total
                    ? 'Toda a rede'
                    : u.posto_id
                      ? nomePosto.get(u.posto_id)
                      : (escopo.get(u.id) ?? []).join(', ') || 'Sem postos'}
                </p>
                {adminDisponivel ? <AcoesUsuario id={u.id} ativo={u.ativo} proprio={u.id === eu.id} /> : null}
              </li>
            ))}
          </ul>
        </section>

        {adminDisponivel ? <FormNovoUsuario postos={(postos ?? []) as { id: string; nome: string }[]} /> : null}
      </div>
    </>
  )
}
