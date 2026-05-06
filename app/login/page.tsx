'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function login() {
    if (!password) return setError('Please enter the team password.')
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, action: 'login' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      router.push('/proposals')
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight:'100vh', background:'var(--dark)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ background:'#fff', borderRadius:16, padding:40, width:380, boxShadow:'0 20px 60px rgba(0,0,0,.3)' }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ width:48, height:48, background:'var(--bright)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', fontSize:22 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#043336" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5M2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div style={{ fontSize:20, fontWeight:700, color:'var(--dark)', marginBottom:4 }}>Pre-sales Platform</div>
          <div style={{ fontSize:13, color:'var(--textL)' }}>emaratech Technology Solutions</div>
        </div>
        {error && <div style={{ background:'var(--redL)', border:'1px solid #F0C0C0', borderRadius:8, padding:'10px 14px', fontSize:12, color:'var(--red)', marginBottom:16 }}>{error}</div>}
        <label style={{ fontSize:11, color:'var(--textL)', fontWeight:600, display:'block', marginBottom:5 }}>Team password</label>
        <input
          type="password" value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && login()}
          placeholder="Enter team password"
          style={{ width:'100%', padding:'10px 14px', borderRadius:8, border:'1px solid var(--grayM)', fontSize:13, marginBottom:16, fontFamily:'inherit', background:'var(--grayL)', outline:'none' }}
          autoFocus
        />
        <button onClick={login} disabled={loading}
          style={{ width:'100%', padding:12, background:'var(--dark)', color:'var(--bright)', border:'none', borderRadius:8, fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
          {loading ? 'Signing in...' : 'Sign in →'}
        </button>
        <div style={{ textAlign:'center', marginTop:16, fontSize:11, color:'var(--grayB)' }}>Internal tool · Confidential</div>
      </div>
    </div>
  )
}
