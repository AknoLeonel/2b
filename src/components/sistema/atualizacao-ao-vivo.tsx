'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseConfigurado } from '@/lib/env'
import { criarClienteNavegador } from '@/lib/supabase/client'

/** Atualiza a tela quando outro usuário lança dados (Supabase Realtime, respeitando o RLS). */
export function AtualizacaoAoVivo({ tabelas }: { tabelas: string[] }) {
  const router = useRouter()
  const [conectado, setConectado] = useState(false)
  const chave = tabelas.join(',')

  useEffect(() => {
    if (!supabaseConfigurado) return
    const supabase = criarClienteNavegador()
    let temporizador: ReturnType<typeof setTimeout> | undefined
    const canal = supabase.channel(`tela:${chave}:${Math.random().toString(36).slice(2)}`)
    for (const tabela of chave.split(',')) {
      canal.on('postgres_changes', { event: '*', schema: 'public', table: tabela }, () => {
        clearTimeout(temporizador)
        temporizador = setTimeout(() => router.refresh(), 800)
      })
    }
    canal.subscribe((status) => setConectado(status === 'SUBSCRIBED'))
    return () => {
      clearTimeout(temporizador)
      supabase.removeChannel(canal)
    }
  }, [chave, router])

  if (!conectado) return null
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700" aria-live="polite">
      <span aria-hidden="true" className="size-2.5 animate-pulse rounded-full bg-emerald-600" />
      Atualiza sozinho
    </span>
  )
}
