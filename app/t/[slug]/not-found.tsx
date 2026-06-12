import Link from 'next/link'
import { C } from '@/lib/constants'
import { S } from '@/lib/styles'

export default function NotFound() {
  return (
    <div style={{ ...S.app, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>💈</div>
        <h1
          style={{
            fontFamily: "'Playfair Display',serif",
            fontSize: 36,
            color: C.gold,
            marginBottom: 12,
          }}
        >
          Barbería no encontrada
        </h1>
        <p style={{ color: C.muted, fontSize: 14, marginBottom: 24 }}>
          Esta barbería no existe o el enlace está mal escrito.
        </p>
        <Link href="/" style={{ ...S.btnG, textDecoration: 'none' }}>
          Ir al inicio
        </Link>
      </div>
    </div>
  )
}
