import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/ui/Sidebar'

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="portal-root">
      <Sidebar userEmail={user.email ?? ''} />
      <main className="portal-main">
        {children}
      </main>

      <style>{portalStyles}</style>
    </div>
  )
}

const portalStyles = `
  .portal-root {
    display: flex;
    min-height: 100vh;
    background: #060f24;
    font-family: var(--font-dm-sans, 'DM Sans', sans-serif);
  }

  .portal-main {
    flex: 1;
    margin-left: 240px;
    padding: 36px 40px;
    min-height: 100vh;
    overflow-x: hidden;
  }

  @media (max-width: 768px) {
    .portal-main {
      margin-left: 0;
      padding: 80px 20px 24px;
    }
  }
`