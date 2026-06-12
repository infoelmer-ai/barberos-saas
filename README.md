# 💈 BarberOS — SaaS Multi-Tenant para Barberías

Plataforma SaaS con subdominio propio por barbería, agendamiento online, panel de administración y cobro mensual vía Stripe.

**Stack**: Next.js 16 · TypeScript · Tailwind · Supabase (Postgres + Auth) · Stripe · Resend · Vercel

---

## 1. Pre-requisitos (cuentas externas)

Antes de empezar necesitas estas cuentas — todas tienen tier gratis:

- [ ] **Supabase** → https://supabase.com → crea un proyecto nuevo
- [ ] **Stripe** → https://dashboard.stripe.com → modo test al inicio
- [ ] **Resend** → https://resend.com → para correos transaccionales (opcional al inicio)
- [ ] **GitHub** → para el repositorio del código
- [ ] **Vercel** → https://vercel.com → para hosting + DNS

Y opcionalmente un dominio (Namecheap, Cloudflare, etc.) si quieres marca propia tipo `tubarberia.com`.

---

## 2. Configuración local

```bash
npm install
cp .env.local.example .env.local
# editar .env.local con tus claves
npm run dev
```

Abre http://localhost:3000

Para probar el subdominio en local: visita `http://localhost:3000?tenant=demo` (el proxy lo rewriteа a `/t/demo`).

---

## 3. Configurar Supabase

1. En el dashboard de Supabase, ve a **SQL Editor**.
2. Abre `supabase/schema.sql` de este repo y pega todo el contenido.
3. Ejecuta. Esto crea todas las tablas, RLS policies y la función helper.
4. Ve a **Settings → API** y copia:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ NUNCA en cliente)

---

## 4. Configurar Stripe

### 4.1 Crear productos

En Stripe Dashboard → **Products** → **Add product** crea 3 suscripciones mensuales recurrentes:

| Producto             | Precio mensual | Variable de entorno     |
|----------------------|----------------|-------------------------|
| BarberOS Starter     | $15            | `STRIPE_PRICE_STARTER`  |
| BarberOS Pro         | $25            | `STRIPE_PRICE_PRO`      |
| BarberOS Business    | $45            | `STRIPE_PRICE_BUSINESS` |

Copia cada `price_xxxx` ID al archivo `.env.local`.

### 4.2 Claves API

**Developers → API keys**:
- `Secret key` → `STRIPE_SECRET_KEY`
- `Publishable key` → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

### 4.3 Webhook (después de desplegar)

Una vez deployado en Vercel:

1. **Developers → Webhooks → Add endpoint**
2. URL: `https://tu-app.vercel.app/api/stripe/webhook`
3. Eventos:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Copia el **Signing secret** → `STRIPE_WEBHOOK_SECRET` en Vercel.

Para test local del webhook: instalar Stripe CLI y correr `stripe listen --forward-to localhost:3000/api/stripe/webhook`.

---

## 5. Deploy en Vercel

```bash
git init
git add -A
git commit -m "Initial BarberOS commit"
gh repo create barberos-saas --public --source=. --push
```

Luego:

1. Ve a https://vercel.com/new
2. Importa el repo `barberos-saas`
3. En **Environment Variables**, pega TODAS las del `.env.local`
4. Click **Deploy**.

---

## 6. Configurar dominio con wildcard (opcional)

> ⚠️ Wildcard subdomains (`*.barberos.com`) requieren **Vercel Pro** ($20/mes). Mientras no tengas Pro, las barberías se acceden via `?tenant=slug`.

### Si tienes Vercel Pro:

1. **Settings → Domains** en tu proyecto de Vercel.
2. Agrega `barberos.com` y `*.barberos.com`.
3. En tu DNS provider:
   ```
   A     @     76.76.21.21
   CNAME *     cname.vercel-dns.com
   ```
4. Actualiza env vars: `NEXT_PUBLIC_ROOT_DOMAIN=barberos.com`, `NEXT_PUBLIC_APP_URL=https://barberos.com`

---

## 7. Estructura del proyecto

```
app/
├── page.tsx                  # Landing (apex)
├── onboard/                  # Wizard de registro
│   ├── page.tsx
│   └── success/page.tsx
├── t/[slug]/                 # Página pública de cada barbería
│   └── page.tsx              # Booking flow
└── api/
    ├── stripe/{checkout,webhook}/
    └── appointments/

components/                   # React components
lib/{supabase,stripe}/        # Clients
proxy.ts                      # Subdomain routing (Next 16)
supabase/schema.sql           # Schema completo con RLS
```

---

## Roadmap

- [x] Landing + Pricing
- [x] Wizard de onboarding (3 pasos → Stripe Checkout)
- [x] Booking flow público (5 pasos)
- [x] Consulta y cancelación por teléfono
- [x] Subdomain routing (`proxy.ts`)
- [x] Stripe Checkout + Webhook
- [x] API de citas
- [ ] Panel del dueño (`/t/[slug]/admin`)
- [ ] Super admin (`/superadmin`)
- [ ] Auth con Supabase (magic link)
- [ ] Emails con Resend (confirmación + recordatorios)
- [ ] Cron Vercel para recordatorios 24h antes
- [ ] Dominio + wildcard DNS

---

*BarberOS — Construido con Claude Code*
