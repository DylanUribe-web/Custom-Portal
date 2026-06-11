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
    width: 100%;
    background: #060f24;
    font-family: var(--font-dm-sans, 'DM Sans', sans-serif);
    align-items: flex-start;
  }

  .portal-root .sidebar {
    position: sticky;
    top: 0;
    height: 100vh;
    align-self: flex-start;
    z-index: 2;
  }

  .portal-main {
    flex: 1;
    padding: 36px 40px;
    min-height: 100vh;
    overflow-x: hidden;
  }

  @media (max-width: 768px) {
    .portal-root {
      flex-direction: column;
    }

    .portal-root .sidebar {
      position: relative;
      top: auto;
      height: auto;
      width: 100%;
      align-self: stretch;
    }

    .portal-main {
      margin-left: 0;
      padding: 120px 20px 24px;
    }
  }
`