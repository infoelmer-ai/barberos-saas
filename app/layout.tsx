import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'BarberOS — Tu Barbería con su Propio Sistema Online',
  description:
    'Plataforma SaaS para barberías: agendamiento, panel de admin, pagos integrados y subdominio propio.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=Montserrat:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
