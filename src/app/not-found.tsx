import Link from 'next/link'
import { Logo } from '@/components/logo'

export default function NaoEncontrado() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-fundo px-4 text-center">
      <Logo />
      <div>
        <h1 className="text-3xl font-extrabold text-tinta">Página não encontrada</h1>
        <p className="mt-2 text-slate-600">O endereço pode ter mudado ou não existe mais.</p>
      </div>
      <Link href="/" className="botao-primario">
        Voltar ao início
      </Link>
    </main>
  )
}
