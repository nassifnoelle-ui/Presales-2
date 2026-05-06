'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Topbar from '@/components/Topbar'

interface Proposal {
  id: string
  client: string
  project: string
  ref: string
  sector: string
  value: string
  status: string
  parts_complete: Record<string, boolean>
  created_at: string
  updated_at: string
}

export default function ProposalsDashboard() {
  const router = useRouter()
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [newForm, setNewForm] = useState({ client: '', project: '', ref: '', sector: '', value: '', timeline: '', submission_date: '' })
  const [dbReady, setDbReady] = useState(false)

  useEffect(() => { initAndLoad() }, [])

  async function initAndLoad() {
    try {
      await fetch('/api/db-init', { method: 'POST' })
      setDbReady(true)
    } catch {}
    await loadProposals()
  }

  async function loadProposals() {
    try {
      const res = await fetch('/api/proposals')
      const data = await res.json()
      if (res.ok) setProposals(data.proposals || [])
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  async function createProposal() {
    if (!newForm.client || !newForm.project) return setError('Client name and project name are required.')
    setCreating(true)
    try {
      const res = await fetch('/api/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newForm),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      router.push('/proposals/' + data.id)
    } catch (e: any) { setError(e.message) }
    finally { setCreating(false) }
  }

  async function deleteProposal(id: string, e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation()
    if (!confirm('Delete this proposal? This cannot be undone.')) return
    await fetch('/api/proposals?id=' + id, { method: 'DELETE' })
    setProposals(p => p.filter(x => x.id !== id))
  }

  function completionPct(p: Proposal) {
    const parts = ['A','B','C','D','E','F']
    const complete = parts.filter(k => p.parts_complete?.[k]).length
    return Math.round((complete / parts.length) * 100)
  }

  function statusStyle(s: string): React.CSSProperties {
    const map: Record<string, React.CSSProperties> = {
      draft: { background:'var(--grayL)', color:'var(--textL)', border:'1px solid var(--grayM)' },
      in_progress: { background:'var(--amberL)', color:'var(--amber)', border:'1px solid #FAC775' },
      ready: { background:'var(--greenL)', color:'#0F6E56', border:'1px solid #9FE1CB' },
      generated: { background:'var(--off)', color:'var(--dark)', border:'1px solid var(--bright)' },
    }
    return { ...map[s] || map.draft, padding:'3px 10px', borderRadius:20, fontSize:10, fontWeight:700 }
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })
  }

  return (
    <>
      <Topbar />
      <div className="main">
        {error && <div className="error-bar">⚠ {error}<button onClick={()=>setError('')} style={{marginLeft:'auto',background:'none',border:'none',color:'var(--red)',cursor:'pointer',fontSize:16}}>✕</button></div>}

        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontSize:22, fontWeight:700, color:'var(--dark)', marginBottom:4 }}>Proposals</div>
            <div style={{ fontSize:12, color:'var(--textL)' }}>{proposals.length} proposal{proposals.length !== 1 ? 's' : ''} · {proposals.filter(p=>p.status==='generated').length} generated</div>
          </div>
          <button className="btn-primary" onClick={() => setShowNew(true)}>+ New proposal</button>
        </div>

        {showNew && (
          <div className="card">
            <div className="card-title">New proposal</div>
            <div className="g3" style={{ marginBottom:12 }}>
              <div><label className="f-label">Client name *</label><input type="text" value={newForm.client} onChange={e=>setNewForm(p=>({...p,client:e.target.value}))} placeholder="e.g. Ministry of Finance" /></div>
              <div><label className="f-label">Project name *</label><input type="text" value={newForm.project} onChange={e=>setNewForm(p=>({...p,project:e.target.value}))} placeholder="e.g. Ministry Portal Redevelopment" /></div>
              <div><label className="f-label">RFP reference</label><input type="text" value={newForm.ref} onChange={e=>setNewForm(p=>({...p,ref:e.target.value}))} placeholder="e.g. MOF-IT-2026-001" /></div>
            </div>
            <div className="g3" style={{ marginBottom:14 }}>
              <div><label className="f-label">Sector</label><input type="text" value={newForm.sector} onChange={e=>setNewForm(p=>({...p,sector:e.target.value}))} placeholder="e.g. UAE Federal Government" /></div>
              <div><label className="f-label">Estimated value (AED)</label><input type="text" value={newForm.value} onChange={e=>setNewForm(p=>({...p,value:e.target.value}))} placeholder="e.g. 1,200,000" /></div>
              <div><label className="f-label">Submission date</label><input type="date" value={newForm.submission_date} onChange={e=>setNewForm(p=>({...p,submission_date:e.target.value}))} /></div>
            </div>
            <div className="row-btns">
              <button className="btn-primary" onClick={createProposal} disabled={creating}>{creating ? 'Creating...' : 'Create proposal →'}</button>
              <button className="btn-second" onClick={() => setShowNew(false)}>Cancel</button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="card" style={{ textAlign:'center', padding:40 }}>
            <div className="spinner" style={{ margin:'0 auto 12px' }} />
            <div style={{ fontSize:13, color:'var(--textL)' }}>Loading proposals...</div>
          </div>
        ) : proposals.length === 0 ? (
          <div className="card" style={{ textAlign:'center', padding:60 }}>
            <div style={{ fontSize:40, marginBottom:16 }}>📄</div>
            <div style={{ fontSize:16, fontWeight:600, color:'var(--dark)', marginBottom:8 }}>No proposals yet</div>
            <div style={{ fontSize:13, color:'var(--textL)', marginBottom:20 }}>Create your first proposal to get started</div>
            <button className="btn-primary" onClick={() => setShowNew(true)}>+ Create first proposal</button>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {proposals.map(p => {
              const pct = completionPct(p)
              return (
                <Link key={p.id} href={`/proposals/${p.id}`} style={{ textDecoration:'none' }}>
                  <div style={{ background:'#fff', border:'1px solid var(--grayM)', borderRadius:12, padding:'16px 20px', display:'flex', alignItems:'center', gap:16, cursor:'pointer', transition:'all .15s' }}
                    onMouseEnter={e=>(e.currentTarget.style.borderColor='var(--bright)')}
                    onMouseLeave={e=>(e.currentTarget.style.borderColor='var(--grayM)')}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
                        <span style={{ fontSize:15, fontWeight:700, color:'var(--dark)' }}>{p.project || 'Untitled project'}</span>
                        <span style={statusStyle(p.status)}>{p.status.replace('_',' ')}</span>
                      </div>
                      <div style={{ fontSize:12, color:'var(--textL)' }}>{p.client} {p.ref ? '· ' + p.ref : ''} {p.sector ? '· ' + p.sector : ''}</div>
                    </div>
                    <div style={{ textAlign:'center', minWidth:80 }}>
                      <div style={{ fontSize:18, fontWeight:700, color: pct===100?'var(--green)':pct>0?'var(--amber)':'var(--grayB)' }}>{pct}%</div>
                      <div style={{ fontSize:10, color:'var(--grayB)' }}>complete</div>
                    </div>
                    <div style={{ width:120 }}>
                      <div style={{ display:'flex', gap:4, marginBottom:4 }}>
                        {['A','B','C','D','E','F'].map(k => (
                          <div key={k} style={{ width:16, height:16, borderRadius:4, background: p.parts_complete?.[k] ? 'var(--green)' : 'var(--grayM)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, color: p.parts_complete?.[k] ? '#fff' : 'var(--grayB)', fontWeight:700 }}>{k}</div>
                        ))}
                      </div>
                      <div style={{ fontSize:10, color:'var(--grayB)' }}>Updated {formatDate(p.updated_at)}</div>
                    </div>
                    {p.value && <div style={{ textAlign:'right', minWidth:80 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:'var(--dark)' }}>AED {p.value}</div>
                    </div>}
                    <button onClick={e=>deleteProposal(p.id,e)} style={{ background:'none', border:'none', color:'var(--grayB)', cursor:'pointer', fontSize:16, padding:'4px 8px' }}>✕</button>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
