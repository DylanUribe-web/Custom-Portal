'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const NAV_ITEMS = [
  { href: '/dashboard',  label: 'Mi Proceso',    icon: '◈' },
  { href: '/documents',  label: 'Documentos',    icon: '◻' },
  { href: '/financial',  label: 'Finanzas',      icon: '◇' },
  { href: '/itinerary',  label: 'Itinerario',    icon: '◎' },
]

export default function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const initials = userEmail.slice(0, 2).toUpperCase()

  return (
    <>
      <aside className="sidebar">
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-badge">CER</div>
          <span className="sidebar-brand">Portal</span>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${active ? 'nav-item--active' : ''}`}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
                {active && <span className="nav-dot" />}
              </Link>
            )
          })}
        </nav>

        {/* Footer del sidebar */}
        <div className="sidebar-footer">
          <div className="user-row">
            <div className="user-avatar">{initials}</div>
            <div className="user-info">
              <span className="user-email">{userEmail}</span>
              <button onClick={handleLogout} className="logout-btn">
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </aside>

      <style>{sidebarStyles}</style>
    </>
  )
}

const sidebarStyles = `
  .sidebar {
    position: fixed;
    left: 0; top: 0; bottom: 0;
    width: 240px;
    background: #020c1f;
    border-right: 1px solid rgba(255,255,255,0.05);
    display: flex;
    flex-direction: column;
    padding: 24px 0;
    z-index: 100;
  }

  .sidebar-logo {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 20px 28px;
    border-bottom: 1px solid rgba(255,255,255,0.05);
    margin-bottom: 16px;
  }

  .sidebar-badge {
    background: linear-gradient(135deg, #002f7d, #00c4cc);
    color: white;
    font-family: var(--font-epilogue, 'Epilogue', sans-serif);
    font-weight: 700;
    font-size: 13px;
    letter-spacing: 0.1em;
    width: 36px;
    height: 36px;
    border-radius: 9px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .sidebar-brand {
    font-family: var(--font-epilogue, 'Epilogue', sans-serif);
    font-size: 16px;
    font-weight: 300;
    color: rgba(255,255,255,0.6);
    letter-spacing: 0.04em;
  }

  .sidebar-nav {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 0 12px;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 11px 12px;
    border-radius: 10px;
    color: rgba(255,255,255,0.4);
    text-decoration: none;
    font-size: 14px;
    font-weight: 400;
    transition: all 0.15s;
    position: relative;
  }

  .nav-item:hover {
    background: rgba(255,255,255,0.04);
    color: rgba(255,255,255,0.75);
  }

  .nav-item--active {
    background: rgba(0,47,125,0.35);
    color: #ffffff;
    border: 1px solid rgba(0,196,204,0.12);
  }

  .nav-icon {
    font-size: 16px;
    width: 20px;
    text-align: center;
    opacity: 0.7;
  }

  .nav-item--active .nav-icon {
    opacity: 1;
    color: #00c4cc;
  }

  .nav-label {
    flex: 1;
  }

  .nav-dot {
    width: 4px;
    height: 4px;
    background: #00c4cc;
    border-radius: 50%;
  }

  .sidebar-footer {
    padding: 16px 16px 0;
    border-top: 1px solid rgba(255,255,255,0.05);
    margin-top: 12px;
  }

  .user-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .user-avatar {
    width: 34px;
    height: 34px;
    background: rgba(0,47,125,0.5);
    border: 1px solid rgba(0,196,204,0.2);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 600;
    color: rgba(255,255,255,0.7);
    flex-shrink: 0;
  }

  .user-info {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
  }

  .user-email {
    font-size: 11px;
    color: rgba(255,255,255,0.35);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 150px;
  }

  .logout-btn {
    background: none;
    border: none;
    color: rgba(0,196,204,0.6);
    font-family: var(--font-dm-sans, 'DM Sans', sans-serif);
    font-size: 11px;
    cursor: pointer;
    padding: 0;
    text-align: left;
    transition: color 0.15s;
  }

  .logout-btn:hover {
    color: #00c4cc;
  }

  @media (max-width: 768px) {
    .sidebar {
      width: 100%;
      height: 60px;
      bottom: auto;
      flex-direction: row;
      padding: 0 16px;
      align-items: center;
      border-right: none;
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }
    .sidebar-logo { padding: 0; border-bottom: none; margin-bottom: 0; }
    .sidebar-nav { flex-direction: row; padding: 0; gap: 4px; }
    .nav-label { display: none; }
    .sidebar-footer { display: none; }
  }
`