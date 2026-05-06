'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Topbar from '@/components/Topbar'

interface Proposal {
  id: string; client: string; project: string; ref: string; sector: string
  value: string; status: string; parts_complete: Record<string,boolean>
  stage0_confirmed: boolean; created_at: string; updated_at: string
}

export default function ProposalsDashboard() {
  const router = useRouter()
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [fileLoading, setFileLoading] = useState(false)
  const [fileName, setFileName] = useState('')
  const [form, setForm] = useState({
    client:'', project:'', ref:'', sector:'', value:'',
    timeline:'', submission_date:'', rfp_text:'', dow_text:''
  })

  useEffect(() => { initAndLoad() }, [])

  async function initAndLoad() {
    try { await fetch('/api/db-init', { method: 'POST' }) } catch {}
    loadProposals()
  }

  async function loadProposals() {
    try {
      const res = await fetch('/api/proposals')
      const data = await res.json()
      if (res.ok) setProposals(data.proposals || [])
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name); setFileLoading(true)
    try {
      const fd = new FormData(); fd.append('file', file)
      const res = await fetch('/api/parse-file', { method:'POST', body:fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setForm(p => ({ ...p, rfp_text: data.text }))
    } catch (e: any) { setError(e.message); setFileName('') }
    finally { setFileLoading(false) }
  }

  async function createProposal() {
    if (!form.client || !form.project) return setError('Client name and project name are required.')
    setCreating(true)
    try {
      const res = await fetch('/api/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      router.push('/proposals/' + data.id)
    } catch (e: any) { setError(e.message) }
    finally { setCreating(false) }
  }

  async function deleteProposal(id: string, e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation()
    if (!confirm('Delete this proposal?')) return
    await fetch('/api/proposals?id=' + id, { method: 'DELETE' })
    setProposals(p => p.filter(x => x.id !== id))
  }

  function completionPct(p: Proposal) {
    const parts = ['A','B','C','D','E','F']
    return Math.round((parts.filter(k => p.parts_complete?.[k]).length / parts.length) * 100)
  }

  function statusBadge(p: Proposal): React.ReactNode {
    const s = p.status
    const styles: Record<string, React.CSSProperties> = {
      draft: { background:'var(--grayL)', color:'var(--textL)', border:'1px solid var(--grayM)' },
      in_progress: { background:'var(--amberL)', color:'var(--amber)', border:'1px solid #FAC775' },
      ready: { background:'var(--greenL)', color:'#0F6E56', border:'1px solid #9FE1CB' },
      generated: { background:'var(--off)', color:'var(--dark)', border:'1px solid var(--bright)' },
    }
    return <span style={{ ...styles[s]||styles.draft, padding:'3px 10px', borderRadius:20, fontSize:10, fontWeight:700 }}>{s.replace('_',' ')}</span>
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })
  }

  const upStyle: React.CSSProperties = {
    border: '1.5px dashed var(--grayB)', borderRadius:10, padding:16, textAlign:'center',
    cursor:'pointer', background:'var(--grayL)', transition:'all .15s',
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
          <button className="btn-primary" onClick={() => setShowNew(!showNew)}>+ New proposal</button>
        </div>

        {showNew && (
          <div className="card">
            <div className="card-title">New proposal</div>
            <div className="g3" style={{ marginBottom:12 }}>
              <div><label className="f-label">Client name *</label><input type="text" value={form.client} onChange={e=>setForm(p=>({...p,client:e.target.value}))} placeholder="e.g. Ministry of Finance" /></div>
              <div><label className="f-label">Project name *</label><input type="text" value={form.project} onChange={e=>setForm(p=>({...p,project:e.target.value}))} placeholder="e.g. Ministry Portal Redevelopment" /></div>
              <div><label className="f-label">RFP reference</label><input type="text" value={form.ref} onChange={e=>setForm(p=>({...p,ref:e.target.value}))} placeholder="e.g. MOF-IT-2026-001" /></div>
            </div>
            <div className="g3" style={{ marginBottom:14 }}>
              <div><label className="f-label">Sector</label><input type="text" value={form.sector} onChange={e=>setForm(p=>({...p,sector:e.target.value}))} placeholder="e.g. UAE Federal Government" /></div>
              <div><label className="f-label">Estimated value (AED)</label><input type="text" value={form.value} onChange={e=>setForm(p=>({...p,value:e.target.value}))} placeholder="e.g. 1,200,000" /></div>
              <div><label className="f-label">Submission deadline</label><input type="date" value={form.submission_date} onChange={e=>setForm(p=>({...p,submission_date:e.target.value}))} /></div>
            </div>

            {/* RFP / DOW upload */}
            <div className="g2" style={{ marginBottom:14 }}>
              <div>
                <label className="f-label">Upload RFP or Description of Work</label>
                <label style={{ display:'block' }}>
                  <div style={{ ...upStyle, ...(fileName ? { borderColor:'var(--bright)', borderStyle:'solid', background:'var(--off)' } : {}) }}
                    onMouseEnter={e=>(e.currentTarget.style.borderColor='var(--bright)')}
                    onMouseLeave={e=>(e.currentTarget.style.borderColor=fileName?'var(--bright)':'var(--grayB)')}>
                    {fileLoading
                      ? <div style={{display:'flex',alignItems:'center',gap:8,justifyContent:'center'}}><div className="spinner"/><span style={{fontSize:12,color:'var(--textL)'}}>Reading...</span></div>
                      : fileName
                        ? <div style={{color:'var(--green)',fontWeight:600,fontSize:12}}>✓ {fileName}</div>
                        : <>
                            <div style={{fontSize:13,color:'var(--textL)',marginBottom:4}}>📎 Click to attach document</div>
                            <div style={{fontSize:11,color:'var(--grayB)'}}>PDF · Word (.docx) · Text</div>
                          </>}
                  </div>
                  <input type="file" accept=".pdf,.docx,.txt,.md" style={{display:'none'}} onChange={handleFile} />
                </label>
              </div>
              <div>
                <label className="f-label">Or paste description of work / RFP text</label>
                <textarea rows={4} value={form.dow_text || form.rfp_text} onChange={e=>setForm(p=>({...p,dow_text:e.target.value,rfp_text:e.target.value}))} placeholder="Paste the scope of work, requirements, or any relevant context here..." style={{height:'100%',minHeight:80}} />
              </div>
            </div>

            <div className="callout" style={{ marginBottom:14 }}>
              After creating the proposal, Stage 0 will automatically extract all requirements and build the compliance tracking sheet.
            </div>
            <div className="row-btns">
              <button className="btn-primary" onClick={createProposal} disabled={creating}>{creating ? 'Creating...' : 'Create proposal →'}</button>
              <button className="btn-second" onClick={() => { setShowNew(false); setFileName(''); setForm({client:'',project:'',ref:'',sector:'',value:'',timeline:'',submission_date:'',rfp_text:'',dow_text:''}) }}>Cancel</button>
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
                  <div style={{ background:'#fff', border:'1px solid var(--grayM)', borderRadius:12, padding:'16px 20px', display:'flex', alignItems:'center', gap:16, cursor:'pointer', transition:'border-color .15s' }}
                    onMouseEnter={e=>(e.currentTarget.style.borderColor='var(--bright)')}
                    onMouseLeave={e=>(e.currentTarget.style.borderColor='var(--grayM)')}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
                        <span style={{ fontSize:15, fontWeight:700, color:'var(--dark)' }}>{p.project||'Untitled'}</span>
                        {statusBadge(p)}
                        {!p.stage0_confirmed && <span style={{ fontSize:9, fontWeight:700, padding:'2px 8px', borderRadius:20, background:'var(--amberL)', color:'var(--amber)', border:'1px solid #FAC775' }}>Stage 0 pending</span>}
                      </div>
                      <div style={{ fontSize:12, color:'var(--textL)' }}>{p.client}{p.ref?' · '+p.ref:''}{p.sector?' · '+p.sector:''}</div>
                    </div>
                    <div style={{ textAlign:'center', minWidth:80 }}>
                      <div style={{ fontSize:18, fontWeight:700, color:pct===100?'var(--green)':pct>0?'var(--amber)':'var(--grayB)' }}>{pct}%</div>
                      <div style={{ fontSize:10, color:'var(--grayB)' }}>Stage 1</div>
                    </div>
                    <div style={{ width:120 }}>
                      <div style={{ display:'flex', gap:4, marginBottom:4 }}>
                        {['A','B','C','D','E','F'].map(k => (
                          <div key={k} style={{ width:16, height:16, borderRadius:4, background:p.parts_complete?.[k]?'var(--green)':'var(--grayM)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, color:p.parts_complete?.[k]?'#fff':'var(--grayB)', fontWeight:700 }}>{k}</div>
                        ))}
                      </div>
                      <div style={{ fontSize:10, color:'var(--grayB)' }}>Updated {formatDate(p.updated_at)}</div>
                    </div>
                    {p.value && <div style={{ textAlign:'right', minWidth:90 }}><div style={{ fontSize:13, fontWeight:600, color:'var(--dark)' }}>AED {p.value}</div></div>}
                    <button onClick={e=>deleteProposal(p.id,e)} style={{ background:'none', border:'none', color:'var(--grayB)', cursor:'pointer', fontSize:16, padding:'4px 8px', flexShrink:0 }}>✕</button>
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
