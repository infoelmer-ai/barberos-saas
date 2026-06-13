'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { C } from '@/lib/constants'
import { S } from '@/lib/styles'

const LINKS = [
  { href: '/', label: 'Inicio' },
  { href: '/onboard', label: 'Registrar Barbería' },
  { href: '/t/demo', label: 'Ver Demo' },
  { href: '/t/demo/admin', label: 'Panel Demo' },
]

export default function Navbar() {
  const pathname = usePathname()

  return (
    <header style={S.hdr}>
      <Link
        href="/"
        style={{
          fontFamily: "'Playfair Display',serif",
          fontSize: 20,
          fontWeight: 700,
          color: C.gold,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          textDecoration: 'none',
        }}
      >
        <span style={{ fontSize: 26 }}>💈</span>
        <div>
          <span>BarberOS</span>
          <span
            style={{
              display: 'block',
              fontSize: 8,
              letterSpacing: 4,
              color: C.muted,
              textTransform: 'uppercase',
              fontFamily: 'Montserrat',
              fontWeight: 600,
            }}
          >
            SaaS Platform
          </span>
        </div>
      </Link>
      <div style={{ display: 'flex', gap: 6 }}>
        {LINKS.map((link) => {
          const active = pathname === link.href
          return (
            <Link
              key={link.href}
              href={link.href}
              className="nav-i"
              style={{
                padding: '7px 16px',
                borderRadius: 4,
                border: `1px solid ${active ? C.gold : C.border2}`,
                background: active ? `${C.gold}18` : 'transparent',
                color: active ? C.gold : C.muted,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                textDecoration: 'none',
                transition: 'all 0.2s',
              }}
            >
              {link.label}
            </Link>
          )
        })}
      </div>
    </header>
  )
}
