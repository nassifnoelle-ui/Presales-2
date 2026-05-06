'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

export default function Topbar({ title }: { title?: string }) {
  const path = usePathname()
  const router = useRouter()

  async function logout() {
    await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
    })
    router.push('/login')
  }

  return (
    <>
      <div className="topbar">
        <Link href="/proposals" style={{ display:'flex', alignItems:'center', gap:10, textDecoration:'none' }}>
          <div style={{ width:32, height:32, background:'var(--bright)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#043336" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5M2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div>
            <div className="topbar-title">Pre-sales Platform</div>
            <div className="topbar-sub">emaratech Technology Solutions</div>
          </div>
        </Link>
        <div className="topbar-spacer" />
        {title && <span className="topbar-chip">{title}</span>}
        <Link href="/qualify" className="topbar-chip">📋 Qualify RFP</Link>
        <Link href="/company-profile" className="topbar-chip">🏢 Company profile</Link>
        <button onClick={logout} style={{ fontSize:11, color:'var(--grayB)', background:'none', border:'none', cursor:'pointer', padding:'4px 8px' }}>Sign out</button>
      </div>
      <div className="subnav">
        <Link href="/proposals" className={path === '/proposals' || path?.startsWith('/proposals/') ? 'active' : ''}>📄 Proposals</Link>
        <Link href="/qualify" className={path === '/qualify' ? 'active' : ''}>📋 Qualification</Link>
        <Link href="/company-profile" className={path === '/company-profile' ? 'active' : ''}>🏢 Company profile</Link>
      </div>
    </>
  )
}
