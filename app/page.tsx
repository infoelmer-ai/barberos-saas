import Link from 'next/link'
import Navbar from '@/components/Navbar'
import { C, PLANS } from '@/lib/constants'
import { S } from '@/lib/styles'

const FEATURES = [
  {
    icon: '📅',
    title: 'Agendamiento Online',
    desc: 'Clientes agendan 24/7 sin llamadas. Seleccionan barbero, servicio, fecha y hora disponible.',
  },
  {
    icon: '💈',
    title: 'Gestión de Barberos',
    desc: 'Cada barbero con su perfil, disponibilidad y citas programadas.',
  },
  {
    icon: '📊',
    title: 'Panel de Ingresos',
    desc: 'El dueño ve citas, servicios, montos y barberos en tiempo real.',
  },
  {
    icon: '📱',
    title: 'Cancelación Inteligente',
    desc: 'Política de 24h automática. Cargos pendientes marcados para la próxima visita.',
  },
  {
    icon: '🔗',
    title: 'Subdominio Propio',
    desc: 'tu-barberia.barberos.com desde el primer día. Fácil de compartir y recordar.',
  },
  {
    icon: '💳',
    title: 'Cobro Mensual',
    desc: 'Stripe procesa las suscripciones automáticamente. Tú solo cobras.',
  },
]

const TENANT_EXAMPLES = ['barber-king', 'urban-blade', 'clasico-cuts', 'el-maestro']

export default function Landing() {
  return (
    <div style={S.app}>
      <Navbar />
      <div style={S.wrap}>
        {/* Hero */}
        <div
          style={{
            textAlign: 'center',
            padding: '70px 0 60px',
            borderBottom: `1px solid ${C.border}`,
            marginBottom: 60,
          }}
        >
          <div
            style={{
              display: 'inline-block',
              padding: '5px 18px',
              borderRadius: 20,
              border: `1px solid ${C.goldDm}`,
              background: `${C.gold}10`,
              fontSize: 11,
              color: C.gold,
              letterSpacing: 2,
              textTransform: 'uppercase',
              fontWeight: 700,
              marginBottom: 24,
            }}
          >
            🚀 Software para Barberías
          </div>
          <h1
            style={{
              fontFamily: "'Playfair Display',serif",
              fontSize: 58,
              fontWeight: 800,
              lineHeight: 1.1,
              margin: '0 0 22px',
              background: `linear-gradient(135deg,${C.cream} 40%,${C.gold})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Tu Barbería con su
            <br />
            Propio Sistema Online
          </h1>
          <p
            style={{
              color: C.muted,
              fontSize: 16,
              maxWidth: 540,
              margin: '0 auto 40px',
              lineHeight: 1.8,
            }}
          >
            Ofrece a cada barbería su plataforma de agendamiento con subdominio propio, panel de
            administración y pagos integrados.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/onboard" style={{ ...S.btnG, textDecoration: 'none' }}>
              Registrar mi Barbería →
            </Link>
            <Link href="/?tenant=demo" style={{ ...S.btnGh, textDecoration: 'none' }} className="gh">
              Ver Demo en Vivo
            </Link>
          </div>
          <p style={{ color: C.muted2, fontSize: 12, marginTop: 18 }}>
            14 días gratis · Sin tarjeta de crédito · Cancela cuando quieras
          </p>
        </div>

        {/* Tenant examples */}
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <p
            style={{
              fontSize: 11,
              color: C.muted,
              letterSpacing: 2,
              textTransform: 'uppercase',
              fontWeight: 600,
              marginBottom: 16,
            }}
          >
            Cada barbería recibe su propio subdominio
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            {TENANT_EXAMPLES.map((slug) => (
              <div
                key={slug}
                style={{
                  padding: '8px 18px',
                  background: C.bg3,
                  border: `1px solid ${C.border}`,
                  borderRadius: 6,
                  fontFamily: "'Courier New',monospace",
                  fontSize: 13,
                  color: C.muted,
                }}
              >
                <span style={{ color: C.gold }}>{slug}</span>.barberos.com
              </div>
            ))}
          </div>
        </div>

        {/* Features */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3,1fr)',
            gap: 20,
            marginBottom: 60,
          }}
        >
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="card-hov"
              style={{
                background: C.bg2,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                padding: 26,
                transition: 'all 0.2s',
              }}
            >
              <div style={{ fontSize: 34, marginBottom: 14 }}>{f.icon}</div>
              <div
                style={{
                  fontFamily: "'Playfair Display',serif",
                  fontSize: 18,
                  marginBottom: 10,
                  color: C.cream,
                }}
              >
                {f.title}
              </div>
              <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.7 }}>{f.desc}</div>
            </div>
          ))}
        </div>

        {/* Pricing */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 36, marginBottom: 8 }}>
            Planes Simples y Transparentes
          </h2>
          <p style={{ color: C.muted, fontSize: 14 }}>Sin comisiones por cita. Sin sorpresas.</p>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3,1fr)',
            gap: 20,
            marginBottom: 70,
          }}
        >
          {PLANS.map((p) => {
            const isTop = p.id === 'pro'
            const features = [
              p.barbers >= 99 ? 'Barberos ilimitados' : `Hasta ${p.barbers} barberos`,
              `${p.locations} ${p.locations > 1 ? 'ubicaciones' : 'ubicación'}`,
              'Agendamiento online 24/7',
              'Panel de administración',
              ...(p.analytics ? ['Analíticas avanzadas'] : []),
              ...(p.whiteLabel ? ['Marca blanca'] : []),
            ]
            return (
              <div
                key={p.id}
                className="card-hov"
                style={{
                  background: isTop ? `${C.gold}0C` : C.bg2,
                  border: `2px solid ${isTop ? C.gold : C.border}`,
                  borderRadius: 10,
                  padding: 30,
                  transition: 'all 0.2s',
                  position: 'relative',
                }}
              >
                {isTop && (
                  <div
                    style={{
                      position: 'absolute',
                      top: -12,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      padding: '3px 16px',
                      background: `linear-gradient(135deg,${C.gold},${C.goldLt})`,
                      color: C.bg,
                      borderRadius: 20,
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: 1.5,
                      textTransform: 'uppercase',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    ⭐ Más Popular
                  </div>
                )}
                <div
                  style={{
                    fontSize: 11,
                    color: C.muted,
                    letterSpacing: 2,
                    textTransform: 'uppercase',
                    fontWeight: 600,
                    marginBottom: 10,
                  }}
                >
                  {p.name}
                </div>
                <div
                  style={{
                    fontSize: 46,
                    fontWeight: 700,
                    color: isTop ? C.gold : C.cream,
                    marginBottom: 4,
                  }}
                >
                  ${p.price}
                  <span style={{ fontSize: 14, color: C.muted, fontWeight: 400 }}>/mes</span>
                </div>
                <p style={{ fontSize: 12, color: C.muted, marginBottom: 24, lineHeight: 1.5 }}>
                  {p.badge}
                </p>
                <div style={{ display: 'grid', gap: 8, marginBottom: 28 }}>
                  {features.map((f) => (
                    <div
                      key={f}
                      style={{ display: 'flex', gap: 8, fontSize: 13, alignItems: 'center' }}
                    >
                      <span style={{ color: C.green, fontSize: 14 }}>✓</span>
                      <span style={{ color: C.cream }}>{f}</span>
                    </div>
                  ))}
                </div>
                <Link
                  href={`/onboard?plan=${p.id}`}
                  style={{
                    ...S.btnG,
                    width: '100%',
                    display: 'block',
                    textAlign: 'center',
                    textDecoration: 'none',
                    opacity: isTop ? 1 : 0.85,
                  }}
                >
                  Empezar gratis
                </Link>
              </div>
            )
          })}
        </div>

        {/* CTA */}
        <div
          style={{
            background: C.bg2,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: 40,
            textAlign: 'center',
          }}
        >
          <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 28, marginBottom: 12 }}>
            ¿Listo para digitalizar tu barbería?
          </h3>
          <p style={{ color: C.muted, fontSize: 14, marginBottom: 28 }}>
            14 días de prueba gratis. Configuración en menos de 5 minutos.
          </p>
          <Link href="/onboard" style={{ ...S.btnG, textDecoration: 'none' }}>
            Crear mi cuenta gratis →
          </Link>
        </div>
      </div>
    </div>
  )
}
