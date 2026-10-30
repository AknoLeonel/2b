// Elementos usados pelo next/og (ImageResponse) para gerar PNGs da marca.

export function SeloMarca({ tamanho, margem = 0 }: { tamanho: number; margem?: number }) {
  const interno = tamanho - margem * 2
  return (
    <div
      style={{
        width: tamanho,
        height: tamanho,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#da291c',
      }}
    >
      <div
        style={{
          width: interno,
          height: interno,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: interno * 0.18,
          border: `${Math.max(2, interno * 0.05)}px solid #ffd100`,
          color: '#ffd100',
          fontSize: interno * 0.48,
          fontWeight: 900,
          letterSpacing: -interno * 0.01,
        }}
      >
        2B
      </div>
    </div>
  )
}

export function CapaMarca({ titulo, subtitulo }: { titulo: string; subtitulo: string }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: 'linear-gradient(135deg, #da291c 0%, #b51d12 100%)',
        color: 'white',
        padding: 72,
        borderBottom: '24px solid #ffd100',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <div
          style={{
            width: 112,
            height: 112,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 24,
            border: '6px solid #ffd100',
            color: '#ffd100',
            fontSize: 56,
            fontWeight: 900,
          }}
        >
          2B
        </div>
        <div style={{ display: 'flex', fontSize: 40, fontWeight: 800, letterSpacing: 2 }}>
          POSTOS <span style={{ color: '#ffd100', marginLeft: 12 }}>2B</span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.05 }}>{titulo}</div>
        <div style={{ marginTop: 20, fontSize: 34, color: '#fde2df' }}>{subtitulo}</div>
      </div>
    </div>
  )
}
