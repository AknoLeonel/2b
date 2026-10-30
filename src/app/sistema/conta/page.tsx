import type { Metadata } from 'next'
import { TituloPagina } from '@/components/sistema/ui'
import { exigirSessao } from '@/lib/auth'
import { ROTULO_PAPEL } from '@/lib/permissoes'
import { FormSenha } from './form-senha'

export const metadata: Metadata = { title: 'Minha conta' }

export default async function Conta() {
  const { perfil, postos } = await exigirSessao()
  return (
    <>
      <TituloPagina titulo="Minha conta" voltar={{ href: '/sistema', rotulo: 'Voltar para o início' }} />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="cartao p-5" aria-labelledby="titulo-dados">
          <h2 id="titulo-dados" className="text-lg font-extrabold text-tinta">
            Dados de acesso
          </h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
              <dt className="text-slate-500">Nome</dt>
              <dd className="font-bold text-slate-800">{perfil.nome}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
              <dt className="text-slate-500">Usuário</dt>
              <dd className="font-mono font-bold text-slate-800">{perfil.username}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
              <dt className="text-slate-500">Perfil</dt>
              <dd className="font-bold text-slate-800">{ROTULO_PAPEL[perfil.papel]}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Postos</dt>
              <dd className="text-right font-bold text-slate-800">
                {perfil.acesso_total ? 'Toda a rede' : postos.map((p) => p.nome).join(', ')}
              </dd>
            </div>
          </dl>
        </section>
        <section className="cartao p-5" aria-labelledby="titulo-senha">
          <h2 id="titulo-senha" className="text-lg font-extrabold text-tinta">
            Alterar senha
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Use pelo menos 10 caracteres. Senhas compartilhadas por posto devem ser trocadas quando alguém sair da
            equipe.
          </p>
          <FormSenha />
        </section>
      </div>
    </>
  )
}
