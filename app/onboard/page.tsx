import Navbar from '@/components/Navbar'
import OnboardWizard from '@/components/OnboardWizard'
import { S } from '@/lib/styles'

export default async function OnboardPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>
}) {
  const sp = await searchParams
  const initialPlan = sp.plan === 'starter' || sp.plan === 'pro' || sp.plan === 'business' ? sp.plan : 'pro'

  return (
    <div style={S.app}>
      <Navbar />
      <div style={S.wrap}>
        <OnboardWizard initialPlan={initialPlan} />
      </div>
    </div>
  )
}
