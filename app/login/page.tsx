import Navbar from '@/components/Navbar'
import LoginForm from '@/components/LoginForm'
import { S } from '@/lib/styles'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; email?: string }>
}) {
  const sp = await searchParams
  return (
    <div style={S.app}>
      <Navbar />
      <div style={S.wrap}>
        <LoginForm next={sp.next} initialEmail={sp.email} />
      </div>
    </div>
  )
}
