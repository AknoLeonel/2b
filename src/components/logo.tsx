export function MarcaLogo({ className = 'size-10' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label="Logo Postos 2B">
      <rect width="64" height="64" rx="14" fill="#da291c" />
      <rect x="4" y="4" width="56" height="56" rx="11" fill="none" stroke="#ffd100" strokeWidth="3" />
      <text
        x="32"
        y="43"
        textAnchor="middle"
        fontFamily="Arial Black, Arial, sans-serif"
        fontWeight="900"
        fontSize="30"
        fill="#ffd100"
      >
        2B
      </text>
    </svg>
  )
}

export function Logo({ claro = false, subtitulo }: { claro?: boolean; subtitulo?: string }) {
  return (
    <span className="flex items-center gap-2.5">
      <MarcaLogo className="size-10 shrink-0" />
      <span className="leading-tight">
        <span className={`block text-lg font-extrabold tracking-wide ${claro ? 'text-white' : 'text-tinta'}`}>
          POSTOS <span className={claro ? 'text-destaque' : 'text-marca'}>2B</span>
        </span>
        {subtitulo ? (
          <span className={`block text-xs font-medium ${claro ? 'text-red-100' : 'text-slate-500'}`}>{subtitulo}</span>
        ) : null}
      </span>
    </span>
  )
}
