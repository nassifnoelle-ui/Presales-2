'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Topbar({ title }: { title?: string }) {
  const path = usePathname()

  return (
    <>
      <div className="topbar">
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 32, height: 32, background: '#2ED5C8', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
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
        <Link href="/company-profile" className="topbar-chip">⚙ Company profile</Link>
        <span className="topbar-chip">Internal · Confidential</span>
      </div>

      <div className="subnav">
        <Link href="/" className={path === '/' ? 'active' : ''}>Home</Link>
        <Link href="/qualify" className={path === '/qualify' ? 'active' : ''}>📋 Qualification</Link>
        <Link href="/proposal" className={path === '/proposal' ? 'active' : ''}>📄 Proposal generator</Link>
        <Link href="/company-profile" className={path === '/company-profile' ? 'active' : ''}>🏢 Company profile</Link>
      </div>
    </>
  )
}
