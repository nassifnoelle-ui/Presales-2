'use client'
import { useState, useEffect, useRef, use } from 'react'
import Topbar from '@/components/Topbar'
import { useRouter } from 'next/navigation'

const PARTS = ['A','B','C','D','E','F']
const PART_LABELS: Record<string,string> = {
  A:'Opportunity and Scope', B:'Technical Solution', C:'Security',
  D:'Delivery Methodology', E:'Support Services', F:'Company Credentials'
}
const PART_ICONS: Record<string,string> = {
  A:'📋', B:'🏗', C:'🔒', D:'⚙', E:'🎧', F:'🏢'
}

// ── Tech stack options for Part B ──────────────────────────────────────────
const TECH_OPTIONS = [
  'Oracle APEX','Oracle ORDS','Oracle DB','Umbraco CMS','ASP.NET','.NET Core',
  'React','Next.js','Flutter','Java Spring Boot','Node.js','Python','UAEPASS',
  'OAuth 2.0 / OIDC','WAF / OWASP CRS 3.x','TLS 1.3','SIEM','Grafana',
  'Prometheus','ELK Stack','Jenkins','Jira','Git','Docker','NGINX','Apache',
]

// ── Security standards for Part C ─────────────────────────────────────────
const SECURITY_STANDARDS = [
  'UAE IA (Information Assurance)','OWASP CRS 3.x','UAEPASS OAuth 2.0 / OIDC',
  'WCAG 2.1 AA','TLS 1.3','ISO 27001','NIST Cybersecurity Framework',
  'UAE Personal Data Protection Law','PCI-DSS',
]

// ── Support packages for Part E ────────────────────────────────────────────
const SUPPORT_PACKAGES = ['Silver — 8×5 · 99.9%', 'Gold — 16×5 · 99.95%', 'Platinum — 24×7 · 99.99%']

interface Proposal {
  id: string; client: string; project: string; ref: string; sector: string
  value: string; timeline: string; submission_date: string; rfp_text: string
  status: string; parts_data: Record<string,any>; parts_complete: Record<string,boolean>
  generated_sections: Record<string,any>; arch_review: any
}

interface ChatMsg { role: 'user'|'assistant'; content: string }

export default function ProposalWorkspace({ params }: { params: any }) {
  const resolvedParams = use(params as any) as { id: string }
  const id = resolvedParams.id
  const router = useRouter()
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [activePart, setActivePart] = useState('A')
  const [partData, setPartData] = useState<Record<string,any>>({})
  const [partsComplete, setPartsComplete] = useState<Record<string,boolean>>({})
  const [generatedSections, setGeneratedSections] = useState<Record<string,any>>({})
  const [stage, setStage] = useState<'inputs'|'generated'>('inputs')
  const [genStatus, setGenStatus] = useState<Record<string,string>>({})
  const [genProgress, setGenProgress] = useState(0)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  // Chat
  const [chatOpen, setChatOpen] = useState(false)
  const [chatHistory, setChatHistory] = useState<Record<string,ChatMsg[]>>({})
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  // Dictionary
  const [dictOpen, setDictOpen] = useState(false)
  const [dictData, setDictData] = useState<Record<string,any[]>>({})
  const [dictLoading, setDictLoading] = useState(false)
  const [dictCat, setDictCat] = useState('')
  // Architecture
  const [archFile, setArchFile] = useState('')
  const [archText, setArchText] = useState('')
  const [archReviewing, setArchReviewing] = useState(false)
  const [archReview, setArchReview] = useState<any>(null)
  // API key
  const [apiKey, setApiKey] = useState('')

  useEffect(() => { loadProposal() }, [id])
  useEffect(() => { if (chatOpen) chatEndRef.current?.scrollIntoView({ behavior:'smooth' }) }, [chatHistory, chatOpen])

  async function loadProposal() {
    try {
      const res = await fetch('/api/proposals?id=' + id)
      const data = await res.json()
      if (!res.ok) { router.push('/proposals'); return }
      const p: Proposal = data.proposal
      setProposal(p)
      setPartData(p.parts_data || {})
      setPartsComplete(p.parts_complete || {})
      setGeneratedSections(p.generated_sections || {})
      setArchReview(p.arch_review || null)
      if (Object.keys(p.generated_sections || {}).length > 0) setStage('generated')
    } catch {}
    finally { setLoading(false) }
  }

  function updatePartData(part: string, field: string, value: any) {
    setPartData(prev => ({
      ...prev,
      [part]: { ...(prev[part] || {}), [field]: value }
    }))
  }

  function toggleArrayItem(part: string, field: string, item: string) {
    const current: string[] = (partData[part]?.[field] || [])
    const next = current.includes(item) ? current.filter(x => x !== item) : [...current, item]
    updatePartData(part, field, next)
  }

  async function savePart(part: string, markComplete: boolean) {
    setSaving(true)
    try {
      const newComplete = { ...partsComplete, [part]: markComplete }
      const newData = { ...partData }

      await fetch('/api/proposals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, field: 'parts_data', value: newData }),
      })
      await fetch('/api/proposals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, field: 'parts_complete', value: newComplete }),
      })

      setPartsComplete(newComplete)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  function allPartsComplete() {
    return PARTS.every(p => partsComplete[p])
  }

  async function generateAll() {
    if (!allPartsComplete()) return setError('Please complete and save all parts before generating.')
    setGenerating(true)
    setStage('inputs')
    const init: Record<string,string> = {}
    PARTS.forEach(p => init[p] = 'pending')
    setGenStatus(init)
    setGenProgress(0)

    const newSections: Record<string,any> = {}
    for (let i = 0; i < PARTS.length; i++) {
      const part = PARTS[i]
      setGenStatus(prev => ({...prev, [part]: 'active'}))
      try {
        const res = await fetch('/api/generate-section', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            part, api_key: apiKey,
            client: proposal?.client, project: proposal?.project,
            ref: proposal?.ref, value: proposal?.value,
            timeline: proposal?.timeline, rfp: proposal?.rfp_text,
            part_inputs: partData[part] || {},
            arch_review: archReview,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        newSections[part] = data.section
        setGenStatus(prev => ({...prev, [part]: 'done'}))
      } catch {
        setGenStatus(prev => ({...prev, [part]: 'error'}))
      }
      setGenProgress(Math.round(((i+1)/PARTS.length)*100))
    }

    setGeneratedSections(newSections)
    await fetch('/api/proposals', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, field: 'generated_sections', value: newSections }),
    })
    await fetch('/api/proposals', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, field: 'status', value: 'generated' }),
    })

    setGenerating(false)
    setStage('generated')
  }

  async function exportWord() {
    const res = await fetch('/api/export-proposal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client: proposal?.client, ref: proposal?.ref,
        project: proposal?.project, value: proposal?.value,
        timeline: proposal?.timeline, sections: generatedSections,
      }),
    })
    if (!res.ok) { const e = await res.json(); setError(e.error); return }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Emaratech_Proposal_${(proposal?.client||'').replace(/[^a-zA-Z0-9]/g,'_')}.docx`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Chat ──────────────────────────────────────────────────────────────────
  async function sendChat() {
    if (!chatInput.trim() || chatLoading) return
    const msg = chatInput.trim()
    setChatInput('')
    const prevHistory = chatHistory[activePart] || []
    const newHistory = [...prevHistory, { role: 'user' as const, content: msg }]
    setChatHistory(prev => ({...prev, [activePart]: newHistory}))
    setChatLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg, part: activePart,
          part_data: partData[activePart] || {},
          rfp_text: proposal?.rfp_text || '',
          history: prevHistory,
          api_key: apiKey,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setChatHistory(prev => ({...prev, [activePart]: [...newHistory, { role: 'assistant', content: data.reply }]}))
    } catch (e: any) {
      setChatHistory(prev => ({...prev, [activePart]: [...newHistory, { role: 'assistant', content: '⚠ Error: ' + e.message }]}))
    }
    finally { setChatLoading(false) }
  }

  // ── Dictionary ────────────────────────────────────────────────────────────
  async function openDict() {
    setDictOpen(true)
    if (dictData[activePart]) return
    setDictLoading(true)
    try {
      const res = await fetch('/api/dictionary?part=' + activePart)
      const data = await res.json()
      setDictData(prev => ({...prev, [activePart]: data.grouped || {}}))
      const cats = Object.keys(data.grouped || {})
      if (cats.length) setDictCat(cats[0])
    } catch {}
    finally { setDictLoading(false) }
  }

  function insertBlock(content: string, field: string) {
    const current = partData[activePart]?.[field] || ''
    updatePartData(activePart, field, current ? current + '\n\n' + content : content)
    setDictOpen(false)
  }

  // ── Architecture review ───────────────────────────────────────────────────
  async function handleArchUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const form = new FormData()
    form.append('file', file)
    const res = await fetch('/api/parse-file', { method: 'POST', body: form })
    const data = await res.json()
    if (res.ok) { setArchText(data.text); setArchFile(file.name) }
  }

  async function runArchReview() {
    if (!archText) return
    setArchReviewing(true)
    try {
      const res = await fetch('/api/review-architecture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          arch_text: archText, rfp_text: proposal?.rfp_text || '',
          client: proposal?.client, project: proposal?.project,
          round: 1, api_key: apiKey,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setArchReview(data.review)
      await fetch('/api/proposals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, field: 'arch_review', value: data.review }),
      })
    } catch (e: any) { setError(e.message) }
    finally { setArchReviewing(false) }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  function scoreColor(s: number) {
    if (s >= 4) return 'var(--green)'
    if (s >= 3) return 'var(--amber)'
    return 'var(--red)'
  }

  if (loading) return (
    <>
      <Topbar />
      <div className="main" style={{ alignItems:'center', paddingTop:60 }}>
        <div className="spinner" style={{ width:24, height:24, borderWidth:3 }} />
        <div style={{ fontSize:13, color:'var(--textL)', marginTop:12 }}>Loading proposal...</div>
      </div>
    </>
  )

  if (!proposal) return null

  const currentPartData = partData[activePart] || {}
  const currentChatHistory = chatHistory[activePart] || []
  const dictCategories = Object.keys(dictData[activePart] || {})

  return (
    <>
      <Topbar title={proposal.project} />
      <div className="main" style={{ paddingBottom: 120 }}>

        {error && <div className="error-bar">⚠ {error}<button onClick={()=>setError('')} style={{marginLeft:'auto',background:'none',border:'none',color:'var(--red)',cursor:'pointer',fontSize:16}}>✕</button></div>}

        {/* API key */}
        <div style={{ display:'flex', gap:12, alignItems:'center', background:'#fff', border:'1px solid var(--grayM)', borderRadius:10, padding:'12px 16px' }}>
          <span style={{ fontSize:11, color:'var(--textL)', fontWeight:600, whiteSpace:'nowrap' }}>API key</span>
          <input type="password" value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder="sk-ant-api03-... (only if not on server)" style={{ flex:1, fontSize:12, background:'var(--grayL)', border:'1px solid var(--grayM)', borderRadius:6, padding:'6px 10px', fontFamily:'inherit', outline:'none' }} />
          <span style={{ fontSize:11, color:'var(--grayB)' }}>Used for AI chat, analysis and generation</span>
        </div>

        {/* Stage indicator */}
        <div style={{ display:'flex', alignItems:'center', gap:0, background:'#fff', border:'1px solid var(--grayM)', borderRadius:10, overflow:'hidden' }}>
          <div style={{ flex:1, padding:'12px 16px', background: stage==='inputs'?'var(--dark)':'var(--grayL)', display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:24, height:24, borderRadius:6, background: stage==='inputs'?'var(--bright)':'var(--grayM)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color: stage==='inputs'?'var(--dark)':'var(--grayB)', flexShrink:0 }}>1</div>
            <div>
              <div style={{ fontSize:13, fontWeight:600, color: stage==='inputs'?'#fff':'var(--textL)' }}>Stage 1 — Inputs</div>
              <div style={{ fontSize:10, color: stage==='inputs'?'rgba(255,255,255,.6)':'var(--grayB)' }}>Fill in and save each part</div>
            </div>
            <div style={{ marginLeft:'auto', display:'flex', gap:4 }}>
              {PARTS.map(p => (
                <div key={p} style={{ width:18, height:18, borderRadius:4, background: partsComplete[p]?'var(--bright)':stage==='inputs'?'rgba(255,255,255,.15)':'var(--grayM)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:700, color: partsComplete[p]?'var(--dark)': stage==='inputs'?'rgba(255,255,255,.5)':'var(--grayB)' }}>{p}</div>
              ))}
            </div>
          </div>
          <div style={{ width:1, background:'var(--grayM)', alignSelf:'stretch' }} />
          <div style={{ flex:1, padding:'12px 16px', background: stage==='generated'?'var(--dark)': allPartsComplete()?'var(--off)':'var(--grayL)', display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:24, height:24, borderRadius:6, background: stage==='generated'?'var(--bright)':allPartsComplete()?'var(--green)':'var(--grayM)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color: stage==='generated'||allPartsComplete()?'var(--dark)':'var(--grayB)', flexShrink:0 }}>2</div>
            <div>
              <div style={{ fontSize:13, fontWeight:600, color: stage==='generated'?'#fff': allPartsComplete()?'var(--dark)':'var(--grayB)' }}>Stage 2 — Generate</div>
              <div style={{ fontSize:10, color: stage==='generated'?'rgba(255,255,255,.6)': allPartsComplete()?'var(--textL)':'var(--grayB)' }}>
                {allPartsComplete() ? 'All parts ready — generate proposal' : `${PARTS.filter(p=>partsComplete[p]).length} of 6 parts complete`}
              </div>
            </div>
            {allPartsComplete() && stage === 'inputs' && (
              <button className="btn-success" style={{ marginLeft:'auto', padding:'6px 16px', fontSize:12 }} onClick={generateAll} disabled={generating}>
                {generating ? 'Generating...' : 'Generate →'}
              </button>
            )}
            {stage === 'generated' && (
              <button className="btn-success" style={{ marginLeft:'auto', padding:'6px 16px', fontSize:12 }} onClick={exportWord}>
                Export Word →
              </button>
            )}
          </div>
        </div>

        {/* Generation progress */}
        {generating && (
          <div className="card">
            <div className="card-title">Generating proposal sections</div>
            <div className="progress-bar"><div className="progress-fill" style={{ width: genProgress+'%' }} /></div>
            {PARTS.map(p => (
              <div key={p} className="gen-row">
                <div className={`gen-icon ${genStatus[p]||'pending'}`}>
                  {genStatus[p]==='done'?'✓':genStatus[p]==='active'?'…':genStatus[p]==='error'?'!':'○'}
                </div>
                <span style={{flex:1}}>{PART_ICONS[p]} {PART_LABELS[p]}</span>
                <span style={{fontSize:11,color:genStatus[p]==='done'?'var(--green)':genStatus[p]==='error'?'var(--red)':'var(--grayB)'}}>
                  {genStatus[p]==='done'?'Complete':genStatus[p]==='active'?'Generating...':genStatus[p]==='error'?'Error':'Pending'}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Generated sections view */}
        {stage === 'generated' && !generating && (
          <div className="card">
            <div className="card-title">Generated sections — review and edit before export</div>
            {PARTS.map(p => {
              const d = generatedSections[p]
              if (!d) return null
              return (
                <div key={p} style={{ borderBottom:'1px solid var(--grayM)', paddingBottom:16, marginBottom:16 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:'var(--dark)', marginBottom:10 }}>{PART_ICONS[p]} Part {p} — {PART_LABELS[p]}</div>
                  {Object.entries(d).map(([field, val]) => (
                    typeof val === 'string' ? (
                      <div key={field} style={{ marginBottom:10 }}>
                        <div style={{ fontSize:10, fontWeight:700, color:'var(--textL)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:4 }}>{field.replace(/_/g,' ')}</div>
                        <textarea className="content-area" rows={4} defaultValue={val as string}
                          onChange={e => setGeneratedSections(prev => ({...prev, [p]: {...prev[p], [field]: e.target.value}}))} />
                      </div>
                    ) : null
                  ))}
                </div>
              )
            })}
          </div>
        )}

        {/* Part tabs — Stage 1 only */}
        {stage === 'inputs' && !generating && (
          <>
            <div style={{ display:'flex', gap:0, background:'#fff', border:'1px solid var(--grayM)', borderRadius:10, overflow:'hidden' }}>
              {PARTS.map((p, i) => (
                <button key={p} onClick={() => setActivePart(p)}
                  style={{ flex:1, padding:'12px 8px', border:'none', borderRight: i<5?'1px solid var(--grayM)':'none', background: activePart===p?'var(--dark)':'#fff', cursor:'pointer', fontFamily:'inherit', transition:'all .15s', position:'relative' }}>
                  <div style={{ fontSize:16, marginBottom:3 }}>{PART_ICONS[p]}</div>
                  <div style={{ fontSize:11, fontWeight:600, color: activePart===p?'var(--bright)':'var(--textL)' }}>Part {p}</div>
                  <div style={{ fontSize:9, color: activePart===p?'rgba(255,255,255,.6)':'var(--grayB)', lineHeight:1.3 }}>{PART_LABELS[p].split(' ').slice(0,2).join(' ')}</div>
                  {partsComplete[p] && (
                    <div style={{ position:'absolute', top:6, right:6, width:14, height:14, borderRadius:'50%', background:'var(--bright)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, color:'var(--dark)', fontWeight:700 }}>✓</div>
                  )}
                </button>
              ))}
            </div>

            {/* Part content */}
            <div style={{ background:'#fff', border:'1px solid var(--grayM)', borderRadius:10, overflow:'hidden' }}>
              <div style={{ background:'var(--grayL)', padding:'14px 20px', borderBottom:'1px solid var(--grayM)', display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:18 }}>{PART_ICONS[activePart]}</span>
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:'var(--dark)' }}>Part {activePart} — {PART_LABELS[activePart]}</div>
                  <div style={{ fontSize:11, color:'var(--textL)' }}>Fill in your inputs — AI will use these when generating the proposal</div>
                </div>
                <div style={{ marginLeft:'auto', display:'flex', gap:8, alignItems:'center' }}>
                  <button onClick={openDict} className="btn-second btn-small">📚 Dictionary</button>
                  <button onClick={() => setChatOpen(true)} style={{ background:'var(--dark)', color:'var(--bright)', border:'none', borderRadius:8, padding:'6px 14px', fontSize:12, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
                    💬 AI Chat {currentChatHistory.length > 0 && <span style={{ background:'var(--bright)', color:'var(--dark)', borderRadius:10, padding:'1px 6px', fontSize:10, fontWeight:700 }}>{currentChatHistory.filter(m=>m.role==='assistant').length}</span>}
                  </button>
                </div>
              </div>

              <div style={{ padding:20 }}>

                {/* ── PART A ── */}
                {activePart === 'A' && (
                  <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                    <div className="g3">
                      <div><label className="f-label">Opportunity name</label><input type="text" value={currentPartData.opp_name||''} onChange={e=>updatePartData('A','opp_name',e.target.value)} placeholder="e.g. Ministry Portal Redevelopment" /></div>
                      <div><label className="f-label">Key client contact</label><input type="text" value={currentPartData.contact||''} onChange={e=>updatePartData('A','contact',e.target.value)} placeholder="Name and title" /></div>
                      <div><label className="f-label">Evaluation criteria summary</label><input type="text" value={currentPartData.eval_criteria||''} onChange={e=>updatePartData('A','eval_criteria',e.target.value)} placeholder="e.g. 35% technical, 30% team, 25% solution" /></div>
                    </div>
                    <div>
                      <label className="f-label">Scope items — what emaratech is delivering</label>
                      <div style={{ marginBottom:6, display:'flex', flexWrap:'wrap', gap:6 }}>
                        {(currentPartData.scope_items||[]).map((item: string, i: number) => (
                          <span key={i} style={{ background:'var(--off)', border:'1px solid var(--grayM)', borderRadius:20, padding:'4px 10px', fontSize:11, display:'flex', alignItems:'center', gap:6 }}>
                            {item}
                            <button onClick={()=>updatePartData('A','scope_items',(currentPartData.scope_items||[]).filter((_:any,j:number)=>j!==i))} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--grayB)', fontSize:12, lineHeight:1 }}>✕</button>
                          </span>
                        ))}
                      </div>
                      <div style={{ display:'flex', gap:8 }}>
                        <input type="text" id="scope-input" placeholder="Add scope item..." style={{ flex:1, padding:'7px 12px', borderRadius:8, border:'1px solid var(--grayM)', fontSize:12, background:'var(--grayL)', fontFamily:'inherit', outline:'none' }}
                          onKeyDown={e=>{if(e.key==='Enter'){const v=(e.target as HTMLInputElement).value.trim();if(v){updatePartData('A','scope_items',[...(currentPartData.scope_items||[]),v]);(e.target as HTMLInputElement).value=''}}}} />
                        <button className="btn-second btn-small" onClick={()=>{const el=document.getElementById('scope-input') as HTMLInputElement;const v=el.value.trim();if(v){updatePartData('A','scope_items',[...(currentPartData.scope_items||[]),v]);el.value=''}}}>Add</button>
                      </div>
                    </div>
                    <div>
                      <label className="f-label">Out of scope items</label>
                      <div style={{ marginBottom:6, display:'flex', flexWrap:'wrap', gap:6 }}>
                        {(currentPartData.oos_items||[]).map((item: string, i: number) => (
                          <span key={i} style={{ background:'var(--redL)', border:'1px solid #F0C0C0', borderRadius:20, padding:'4px 10px', fontSize:11, color:'var(--red)', display:'flex', alignItems:'center', gap:6 }}>
                            {item}
                            <button onClick={()=>updatePartData('A','oos_items',(currentPartData.oos_items||[]).filter((_:any,j:number)=>j!==i))} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--red)', fontSize:12, lineHeight:1 }}>✕</button>
                          </span>
                        ))}
                      </div>
                      <div style={{ display:'flex', gap:8 }}>
                        <input type="text" id="oos-input" placeholder="Add out-of-scope item..." style={{ flex:1, padding:'7px 12px', borderRadius:8, border:'1px solid var(--grayM)', fontSize:12, background:'var(--grayL)', fontFamily:'inherit', outline:'none' }}
                          onKeyDown={e=>{if(e.key==='Enter'){const v=(e.target as HTMLInputElement).value.trim();if(v){updatePartData('A','oos_items',[...(currentPartData.oos_items||[]),v]);(e.target as HTMLInputElement).value=''}}}} />
                        <button className="btn-second btn-small" onClick={()=>{const el=document.getElementById('oos-input') as HTMLInputElement;const v=el.value.trim();if(v){updatePartData('A','oos_items',[...(currentPartData.oos_items||[]),v]);el.value=''}}}>Add</button>
                      </div>
                    </div>
                    <div className="g2">
                      <div>
                        <label className="f-label">Executive summary notes</label>
                        <textarea rows={5} value={currentPartData.exec_notes||''} onChange={e=>updatePartData('A','exec_notes',e.target.value)} placeholder="Key points for the executive summary — client's challenge, emaratech's differentiators for this deal, delivery commitment..." className="content-area" />
                      </div>
                      <div>
                        <label className="f-label">Key differentiators for this deal</label>
                        <textarea rows={5} value={currentPartData.differentiators||''} onChange={e=>updatePartData('A','differentiators',e.target.value)} placeholder="What specifically makes emaratech best placed for this opportunity..." className="content-area" />
                      </div>
                    </div>
                    <div>
                      <label className="f-label">Assumptions and constraints (free text)</label>
                      <textarea rows={4} value={currentPartData.assumptions||''} onChange={e=>updatePartData('A','assumptions',e.target.value)} placeholder="Key assumptions and constraints specific to this engagement..." className="content-area" />
                    </div>
                  </div>
                )}

                {/* ── PART B ── */}
                {activePart === 'B' && (
                  <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                    {/* Architecture upload */}
                    <div style={{ border:'1px solid var(--grayM)', borderRadius:10, overflow:'hidden' }}>
                      <div style={{ background:'var(--grayL)', padding:'10px 16px', borderBottom:'1px solid var(--grayM)', display:'flex', alignItems:'center', gap:10 }}>
                        <span style={{ fontSize:13, fontWeight:700, color:'var(--dark)' }}>🏗 Architecture document</span>
                        <span style={{ fontSize:11, color:'var(--textL)' }}>Runs in parallel with proposal inputs</span>
                        {archReview && <span style={{ marginLeft:'auto', background: archReview.decision==='Approved'?'var(--greenL)':archReview.decision==='Rejected'?'var(--redL)':'var(--amberL)', color: archReview.decision==='Approved'?'#0F6E56':archReview.decision==='Rejected'?'var(--red)':'var(--amber)', padding:'3px 10px', borderRadius:20, fontSize:10, fontWeight:700 }}>{archReview.decision}</span>}
                      </div>
                      <div style={{ padding:14 }}>
                        {!archFile ? (
                          <label style={{ display:'block' }}>
                            <div className="upload-zone">
                              <div style={{ fontSize:12, color:'var(--textL)', marginBottom:4 }}>Upload architecture document (Word, PDF, or text)</div>
                              <div style={{ fontSize:10, color:'var(--grayB)' }}>AI reviews completeness, soundness, technology alignment, security, and integration coverage</div>
                            </div>
                            <input type="file" accept=".pdf,.docx,.txt,.md" style={{ display:'none' }} onChange={handleArchUpload} />
                          </label>
                        ) : (
                          <div>
                            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                              <span style={{ fontSize:12, color:'var(--green)', fontWeight:600 }}>✓ {archFile}</span>
                              <button className="btn-second btn-small" onClick={runArchReview} disabled={archReviewing}>
                                {archReviewing ? 'Reviewing...' : archReview ? 'Re-run review' : 'Run architecture review'}
                              </button>
                              {archReviewing && <div className="spinner" />}
                            </div>
                            {archReview && (
                              <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:6, marginTop:10 }}>
                                {['completeness','soundness','technology_alignment','security_coverage','integration_coverage'].map(dim => (
                                  <div key={dim} style={{ background:'var(--grayL)', borderRadius:8, padding:'8px 10px', textAlign:'center' }}>
                                    <div style={{ fontSize:18, fontWeight:700, color:scoreColor(archReview[dim]?.score||0) }}>{archReview[dim]?.score||'—'}</div>
                                    <div style={{ fontSize:9, color:'var(--textL)', lineHeight:1.3 }}>{dim.replace(/_/g,' ')}</div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Tech stack checkboxes */}
                    <div>
                      <label className="f-label">Technology stack — select all that apply</label>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:6 }}>
                        {TECH_OPTIONS.map(tech => {
                          const sel = (currentPartData.tech_stack||[]).includes(tech)
                          return (
                            <button key={tech} onClick={()=>toggleArrayItem('B','tech_stack',tech)}
                              style={{ padding:'5px 12px', borderRadius:20, border:`1px solid ${sel?'var(--bright)':'var(--grayM)'}`, background: sel?'var(--off)':'#fff', color: sel?'var(--dark)':'var(--textL)', fontSize:11, cursor:'pointer', fontFamily:'inherit', fontWeight: sel?700:400 }}>
                              {sel && '✓ '}{tech}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    <div className="g2">
                      <div>
                        <label className="f-label">Technical approach notes</label>
                        <textarea rows={6} value={currentPartData.tech_notes||''} onChange={e=>updatePartData('B','tech_notes',e.target.value)} placeholder="Specific technical approach for this project — what's unique, what's standard emaratech pattern, key design decisions..." className="content-area" />
                      </div>
                      <div>
                        <label className="f-label">Integration notes</label>
                        <textarea rows={6} value={currentPartData.integration_notes||''} onChange={e=>updatePartData('B','integration_notes',e.target.value)} placeholder="Integrations required — UAEPASS, government APIs, ERP systems, third-party services..." className="content-area" />
                      </div>
                    </div>
                  </div>
                )}

                {/* ── PART C ── */}
                {activePart === 'C' && (
                  <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                    <div>
                      <label className="f-label">Security standards applicable to this project</label>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:6 }}>
                        {SECURITY_STANDARDS.map(std => {
                          const sel = (currentPartData.standards||[]).includes(std)
                          return (
                            <button key={std} onClick={()=>toggleArrayItem('C','standards',std)}
                              style={{ padding:'6px 14px', borderRadius:20, border:`1px solid ${sel?'var(--red)':'var(--grayM)'}`, background: sel?'var(--redL)':'#fff', color: sel?'var(--red)':'var(--textL)', fontSize:11, cursor:'pointer', fontFamily:'inherit', fontWeight: sel?700:400 }}>
                              {sel && '✓ '}{std}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    <div className="g2">
                      <div>
                        <label className="f-label">Security requirements from RFP</label>
                        <textarea rows={6} value={currentPartData.sec_requirements||''} onChange={e=>updatePartData('C','sec_requirements',e.target.value)} placeholder="Specific security requirements stated in the RFP..." className="content-area" />
                      </div>
                      <div>
                        <label className="f-label">emaratech security approach for this project</label>
                        <textarea rows={6} value={currentPartData.sec_approach||''} onChange={e=>updatePartData('C','sec_approach',e.target.value)} placeholder="How emaratech will address the security requirements — WAF, pen testing, sister company involvement..." className="content-area" />
                      </div>
                    </div>
                    <div>
                      <label className="f-label">Additional security notes</label>
                      <textarea rows={3} value={currentPartData.sec_notes||''} onChange={e=>updatePartData('C','sec_notes',e.target.value)} placeholder="Any additional security context specific to this client or sector..." className="content-area" />
                    </div>
                  </div>
                )}

                {/* ── PART D ── */}
                {activePart === 'D' && (
                  <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                    <div className="g4">
                      <div><label className="f-label">Sprint length</label>
                        <select value={currentPartData.sprint_length||'2 weeks'} onChange={e=>updatePartData('D','sprint_length',e.target.value)}>
                          <option>1 week</option><option>2 weeks</option><option>3 weeks</option><option>4 weeks</option>
                        </select>
                      </div>
                      <div><label className="f-label">Team size</label><input type="number" value={currentPartData.team_size||''} onChange={e=>updatePartData('D','team_size',e.target.value)} placeholder="e.g. 8" /></div>
                      <div><label className="f-label">Number of sprints</label><input type="number" value={currentPartData.num_sprints||''} onChange={e=>updatePartData('D','num_sprints',e.target.value)} placeholder="e.g. 8" /></div>
                      <div><label className="f-label">Hypercare period</label><input type="text" value={currentPartData.hypercare||''} onChange={e=>updatePartData('D','hypercare',e.target.value)} placeholder="e.g. 4 weeks" /></div>
                    </div>
                    <div>
                      <label className="f-label">Key milestones</label>
                      <div style={{ marginBottom:6, display:'flex', flexWrap:'wrap', gap:6 }}>
                        {(currentPartData.milestones||[]).map((m: string, i: number) => (
                          <span key={i} style={{ background:'var(--off)', border:'1px solid var(--bright)', borderRadius:20, padding:'4px 10px', fontSize:11, display:'flex', alignItems:'center', gap:6 }}>
                            {m}
                            <button onClick={()=>updatePartData('D','milestones',(currentPartData.milestones||[]).filter((_:any,j:number)=>j!==i))} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--grayB)', fontSize:12, lineHeight:1 }}>✕</button>
                          </span>
                        ))}
                      </div>
                      <div style={{ display:'flex', gap:8 }}>
                        <input type="text" id="ms-input" placeholder="Add milestone..." style={{ flex:1, padding:'7px 12px', borderRadius:8, border:'1px solid var(--grayM)', fontSize:12, background:'var(--grayL)', fontFamily:'inherit', outline:'none' }}
                          onKeyDown={e=>{if(e.key==='Enter'){const v=(e.target as HTMLInputElement).value.trim();if(v){updatePartData('D','milestones',[...(currentPartData.milestones||[]),v]);(e.target as HTMLInputElement).value=''}}}} />
                        <button className="btn-second btn-small" onClick={()=>{const el=document.getElementById('ms-input') as HTMLInputElement;const v=el.value.trim();if(v){updatePartData('D','milestones',[...(currentPartData.milestones||[]),v]);el.value=''}}}>Add</button>
                      </div>
                    </div>
                    <div className="g2">
                      <div>
                        <label className="f-label">Delivery constraints and client requirements</label>
                        <textarea rows={5} value={currentPartData.delivery_constraints||''} onChange={e=>updatePartData('D','delivery_constraints',e.target.value)} placeholder="Timeline constraints, fixed milestones, client resource availability, government approvals required..." className="content-area" />
                      </div>
                      <div>
                        <label className="f-label">Governance requirements</label>
                        <textarea rows={5} value={currentPartData.governance_notes||''} onChange={e=>updatePartData('D','governance_notes',e.target.value)} placeholder="Steering committee requirements, reporting frequency, approval processes specific to this client..." className="content-area" />
                      </div>
                    </div>
                  </div>
                )}

                {/* ── PART E ── */}
                {activePart === 'E' && (
                  <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                    <div>
                      <label className="f-label">Recommended support package</label>
                      <div style={{ display:'flex', gap:8, marginTop:6 }}>
                        {SUPPORT_PACKAGES.map(pkg => {
                          const sel = currentPartData.package === pkg
                          return (
                            <button key={pkg} onClick={()=>updatePartData('E','package',pkg)}
                              style={{ flex:1, padding:'12px', borderRadius:10, border:`1.5px solid ${sel?'var(--bright)':'var(--grayM)'}`, background: sel?'var(--off)':'#fff', cursor:'pointer', fontFamily:'inherit', textAlign:'center' }}>
                              <div style={{ fontSize:12, fontWeight:700, color: sel?'var(--dark)':'var(--textL)', marginBottom:3 }}>{pkg.split(' — ')[0]}</div>
                              <div style={{ fontSize:10, color:'var(--textL)' }}>{pkg.split(' — ')[1]}</div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    <div className="g2">
                      <div>
                        <label className="f-label">SLA requirements from RFP</label>
                        <textarea rows={5} value={currentPartData.sla_requirements||''} onChange={e=>updatePartData('E','sla_requirements',e.target.value)} placeholder="Specific SLA requirements stated in the RFP — response times, uptime, penalties..." className="content-area" />
                      </div>
                      <div>
                        <label className="f-label">Support notes</label>
                        <textarea rows={5} value={currentPartData.support_notes||''} onChange={e=>updatePartData('E','support_notes',e.target.value)} placeholder="Any specific support requirements — dedicated team, on-site visits, particular escalation paths..." className="content-area" />
                      </div>
                    </div>
                  </div>
                )}

                {/* ── PART F ── */}
                {activePart === 'F' && (
                  <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                    <div className="g2">
                      <div>
                        <label className="f-label">Relevant references for this deal</label>
                        <textarea rows={5} value={currentPartData.references||''} onChange={e=>updatePartData('F','references',e.target.value)} placeholder="Which past projects are most relevant — client name, project type, what was delivered, similarity to this deal..." className="content-area" />
                      </div>
                      <div>
                        <label className="f-label">Team members to highlight</label>
                        <textarea rows={5} value={currentPartData.team_notes||''} onChange={e=>updatePartData('F','team_notes',e.target.value)} placeholder="Key team members for this project — roles, specific experience relevant to this RFP..." className="content-area" />
                      </div>
                    </div>
                    <div>
                      <label className="f-label">Specific credentials and certifications to mention</label>
                      <textarea rows={3} value={currentPartData.credentials||''} onChange={e=>updatePartData('F','credentials',e.target.value)} placeholder="Certifications, awards, partnerships specifically relevant to this client or sector..." className="content-area" />
                    </div>
                    <div>
                      <label className="f-label">Differentiators for this specific deal</label>
                      <textarea rows={4} value={currentPartData.deal_differentiators||''} onChange={e=>updatePartData('F','deal_differentiators',e.target.value)} placeholder="Why emaratech specifically — not generic differentiators, but what makes us the best choice for this client and project..." className="content-area" />
                    </div>
                  </div>
                )}

                {/* Save bar */}
                <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:20, paddingTop:16, borderTop:'1px solid var(--grayM)' }}>
                  <button className="btn-primary" onClick={() => savePart(activePart, true)} disabled={saving}>
                    {saving ? 'Saving...' : partsComplete[activePart] ? '✓ Saved and complete' : 'Save and mark complete'}
                  </button>
                  <button className="btn-second" onClick={() => savePart(activePart, false)} disabled={saving}>Save draft</button>
                  {saved && <span style={{ fontSize:12, color:'var(--green)', fontWeight:600 }}>✓ Saved</span>}
                  {partsComplete[activePart] && (
                    <button className="btn-second btn-small" onClick={() => { setPartsComplete(p => ({...p, [activePart]: false})); savePart(activePart, false) }} style={{ marginLeft:'auto', color:'var(--amber)' }}>
                      Reopen for editing
                    </button>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── DICTIONARY PANEL ── */}
        {dictOpen && (
          <div style={{ position:'fixed', top:0, right:0, bottom:0, width:420, background:'#fff', borderLeft:'1px solid var(--grayM)', boxShadow:'-4px 0 20px rgba(0,0,0,.1)', zIndex:200, display:'flex', flexDirection:'column' }}>
            <div style={{ padding:'16px 20px', background:'var(--dark)', display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:16 }}>📚</span>
              <div style={{ flex:1, color:'#fff', fontWeight:700, fontSize:14 }}>Dictionary — Part {activePart}</div>
              <button onClick={() => setDictOpen(false)} style={{ background:'none', border:'none', color:'rgba(255,255,255,.6)', cursor:'pointer', fontSize:20 }}>✕</button>
            </div>
            {dictLoading ? (
              <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <div className="spinner" />
              </div>
            ) : (
              <>
                <div style={{ display:'flex', gap:0, borderBottom:'1px solid var(--grayM)', overflowX:'auto' }}>
                  {dictCategories.map(cat => (
                    <button key={cat} onClick={() => setDictCat(cat)}
                      style={{ padding:'10px 14px', border:'none', borderBottom:`2px solid ${dictCat===cat?'var(--bright)':'transparent'}`, background:'transparent', cursor:'pointer', fontFamily:'inherit', fontSize:11, fontWeight: dictCat===cat?700:400, color: dictCat===cat?'var(--dark)':'var(--textL)', whiteSpace:'nowrap' }}>
                      {cat}
                    </button>
                  ))}
                </div>
                <div style={{ flex:1, overflowY:'auto', padding:16 }}>
                  {(dictData[activePart]?.[dictCat] || []).map((block: any) => (
                    <div key={block.id} style={{ border:'1px solid var(--grayM)', borderRadius:10, marginBottom:10, overflow:'hidden' }}>
                      <div style={{ padding:'10px 14px', background:'var(--grayL)', display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ background: block.type==='clause'?'var(--amberL)':'var(--off)', color: block.type==='clause'?'var(--amber)':'var(--textL)', border: `1px solid ${block.type==='clause'?'#FAC775':'var(--grayM)'}`, padding:'2px 8px', borderRadius:20, fontSize:9, fontWeight:700 }}>{block.type}</span>
                        <span style={{ fontSize:12, fontWeight:600, color:'var(--dark)', flex:1 }}>{block.title}</span>
                      </div>
                      <div style={{ padding:'10px 14px' }}>
                        <div style={{ fontSize:11, color:'var(--textM)', lineHeight:1.6, marginBottom:10 }}>{block.content.slice(0,200)}{block.content.length > 200 ? '...' : ''}</div>
                        <div style={{ display:'flex', gap:6 }}>
                          <button className="btn-second btn-small" onClick={() => insertBlock(block.content, activePart === 'A' ? 'exec_notes' : activePart === 'B' ? 'tech_notes' : activePart === 'C' ? 'sec_approach' : activePart === 'D' ? 'delivery_constraints' : activePart === 'E' ? 'support_notes' : 'deal_differentiators')}>
                            Insert →
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {!dictCategories.length && (
                    <div style={{ textAlign:'center', color:'var(--grayB)', fontSize:12, marginTop:40 }}>No content blocks for Part {activePart} yet</div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── CHAT BUBBLE ── */}
        {!chatOpen && (
          <button onClick={() => setChatOpen(true)}
            style={{ position:'fixed', bottom:24, right:24, width:52, height:52, borderRadius:'50%', background:'var(--dark)', border:'2px solid var(--bright)', color:'var(--bright)', fontSize:20, cursor:'pointer', boxShadow:'0 4px 20px rgba(0,0,0,.2)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center' }}>
            💬
          </button>
        )}

        {/* ── CHAT PANEL ── */}
        {chatOpen && (
          <div style={{ position:'fixed', bottom:24, right:24, width:380, height:500, background:'#fff', borderRadius:16, boxShadow:'0 8px 40px rgba(0,0,0,.2)', border:'1px solid var(--grayM)', zIndex:200, display:'flex', flexDirection:'column', overflow:'hidden' }}>
            <div style={{ padding:'12px 16px', background:'var(--dark)', display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:16 }}>💬</span>
              <div style={{ flex:1 }}>
                <div style={{ color:'#fff', fontWeight:700, fontSize:13 }}>AI Chat — Part {activePart}</div>
                <div style={{ color:'rgba(255,255,255,.5)', fontSize:10 }}>{PART_LABELS[activePart]}</div>
              </div>
              <button onClick={() => setChatOpen(false)} style={{ background:'none', border:'none', color:'rgba(255,255,255,.6)', cursor:'pointer', fontSize:18 }}>✕</button>
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:12, display:'flex', flexDirection:'column', gap:8 }}>
              {currentChatHistory.length === 0 && (
                <div style={{ textAlign:'center', color:'var(--grayB)', fontSize:11, marginTop:20 }}>
                  <div style={{ fontSize:24, marginBottom:8 }}>🤖</div>
                  Ask me to review your inputs, suggest improvements, or help write specific sections.
                </div>
              )}
              {currentChatHistory.map((msg, i) => (
                <div key={i} style={{ display:'flex', justifyContent: msg.role==='user'?'flex-end':'flex-start' }}>
                  <div style={{ maxWidth:'85%', padding:'8px 12px', borderRadius: msg.role==='user'?'12px 12px 2px 12px':'12px 12px 12px 2px', background: msg.role==='user'?'var(--dark)':'var(--grayL)', color: msg.role==='user'?'#fff':'var(--text)', fontSize:12, lineHeight:1.6, whiteSpace:'pre-wrap' }}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div style={{ display:'flex', justifyContent:'flex-start' }}>
                  <div style={{ padding:'8px 14px', borderRadius:'12px 12px 12px 2px', background:'var(--grayL)', display:'flex', gap:4, alignItems:'center' }}>
                    <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--grayB)', animation:'bounce .8s infinite' }} />
                    <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--grayB)', animation:'bounce .8s .1s infinite' }} />
                    <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--grayB)', animation:'bounce .8s .2s infinite' }} />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div style={{ padding:'8px 12px', borderTop:'1px solid var(--grayM)', display:'flex', gap:8 }}>
              <input
                type="text" value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key==='Enter' && !e.shiftKey && sendChat()}
                placeholder={`Ask about Part ${activePart}...`}
                style={{ flex:1, padding:'8px 12px', borderRadius:8, border:'1px solid var(--grayM)', fontSize:12, fontFamily:'inherit', background:'var(--grayL)', outline:'none' }}
              />
              <button onClick={sendChat} disabled={chatLoading || !chatInput.trim()} className="btn-primary btn-small">Send</button>
            </div>
          </div>
        )}

      </div>

      <style>{`@keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-5px)} }`}</style>
    </>
  )
}
