'use client'
import { useState, useEffect, useRef, use } from 'react'
import Topbar from '@/components/Topbar'
import { useRouter } from 'next/navigation'

const PARTS = ['A','B','C','D','E','F']
const PART_LABELS: Record<string,string> = {
  A:'Opportunity and Scope', B:'Technical Solution', C:'Security',
  D:'Delivery Methodology', E:'Support Services', F:'Company Credentials'
}
const PART_ICONS: Record<string,string> = { A:'📋', B:'🏗', C:'🔒', D:'⚙', E:'🎧', F:'🏢' }

const TECH_OPTIONS = [
  'Oracle APEX','Oracle ORDS','Oracle DB','Umbraco CMS','ASP.NET','.NET Core',
  'React','Next.js','Flutter','Java Spring Boot','Node.js','Python','UAEPASS',
  'OAuth 2.0 / OIDC','WAF / OWASP CRS 3.x','TLS 1.3','SIEM','Grafana',
  'Prometheus','ELK Stack','Jenkins','Jira','Git','Docker','NGINX','Apache',
]
const SECURITY_STANDARDS = [
  'UAE IA (Information Assurance)','OWASP CRS 3.x','UAEPASS OAuth 2.0 / OIDC',
  'WCAG 2.1 AA','TLS 1.3','ISO 27001','NIST Cybersecurity Framework',
  'UAE Personal Data Protection Law','PCI-DSS',
]
const SUPPORT_PACKAGES = ['Silver — 8×5 · 99.9%','Gold — 16×5 · 99.95%','Platinum — 24×7 · 99.99%']

interface ComplianceItem {
  ref: string; type: string; requirement: string; priority: string
  category: string; stage1_status: string; stage1_part: string|null
  stage2_status: string; notes: string
}

interface Proposal {
  id: string; client: string; project: string; ref: string; sector: string
  value: string; timeline: string; submission_date: string; rfp_text: string
  dow_text: string; status: string; stage0_data: any; stage0_confirmed: boolean
  compliance_items: ComplianceItem[]; parts_data: Record<string,any>
  parts_complete: Record<string,boolean>; generated_sections: Record<string,any>
  arch_review: any
}

interface ChatMsg { role: 'user'|'assistant'; content: string }

export default function ProposalWorkspace({ params }: { params: any }) {
  const resolvedParams = use(params as any) as { id: string }
  const id = resolvedParams.id
  const router = useRouter()

  const [proposal, setProposal] = useState<Proposal|null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [activePart, setActivePart] = useState('A')
  const [partData, setPartData] = useState<Record<string,any>>({})
  const [partsComplete, setPartsComplete] = useState<Record<string,boolean>>({})
  const [generatedSections, setGeneratedSections] = useState<Record<string,any>>({})
  const [stage, setStage] = useState<'stage0'|'inputs'|'generated'|string>('stage0')
  const [genStatus, setGenStatus] = useState<Record<string,string>>({})
  const [genProgress, setGenProgress] = useState(0)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [apiKey, setApiKey] = useState('')

  // Stage 0
  const [extracting, setExtracting] = useState(false)
  const [stage0Data, setStage0Data] = useState<any>(null)
  const [stage0Confirmed, setStage0Confirmed] = useState(false)
  const [complianceItems, setComplianceItems] = useState<ComplianceItem[]>([])
  const [editingReq, setEditingReq] = useState<string|null>(null)
  const [editingRisk, setEditingRisk] = useState<string|null>(null)
  const [editingTimeline, setEditingTimeline] = useState<string|null>(null)
  const [editingCommercial, setEditingCommercial] = useState<string|null>(null)

  // Compliance sidebar
  const [complianceOpen, setComplianceOpen] = useState(false)
  const [complianceFilter, setComplianceFilter] = useState('all')

  // Chat
  const [chatOpen, setChatOpen] = useState(false)
  const [chatHistory, setChatHistory] = useState<Record<string,ChatMsg[]>>({})
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Dictionary
  const [dictOpen, setDictOpen] = useState(false)
  const [dictData, setDictData] = useState<Record<string,any>>({})
  const [dictLoading, setDictLoading] = useState(false)
  const [dictCat, setDictCat] = useState('')

  // Architecture
  const [archFile, setArchFile] = useState('')
  const [archText, setArchText] = useState('')
  const [archReviewing, setArchReviewing] = useState(false)
  const [archReview, setArchReview] = useState<any>(null)

  useEffect(() => { loadProposal() }, [id])
  useEffect(() => { if(chatOpen) chatEndRef.current?.scrollIntoView({behavior:'smooth'}) }, [chatHistory, chatOpen])

  async function loadProposal() {
    try {
      const res = await fetch('/api/proposals?id='+id)
      const data = await res.json()
      if (!res.ok) { router.push('/proposals'); return }
      const p: Proposal = data.proposal
      setProposal(p)
      setPartData(p.parts_data||{})
      setPartsComplete(p.parts_complete||{})
      setGeneratedSections(p.generated_sections||{})
      setArchReview(p.arch_review||null)
      setStage0Data(p.stage0_data||null)
      setStage0Confirmed(p.stage0_confirmed||false)
      setComplianceItems(p.compliance_items||[])
      if (p.stage0_confirmed) {
        if (Object.keys(p.generated_sections||{}).length > 0) setStage('generated')
        else setStage('inputs')
      } else {
        setStage('stage0')
      }
    } catch {}
    finally { setLoading(false) }
  }

  // ── Stage 0 ───────────────────────────────────────────────────────────────
  async function runExtraction() {
    const src = proposal?.rfp_text || proposal?.dow_text || ''
    if (!src.trim()) return setError('No RFP or description of work text found. Please go back and add text.')
    setExtracting(true); setError('')
    try {
      const res = await fetch('/api/extract-requirements', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          rfp_text: proposal?.rfp_text,
          dow_text: proposal?.dow_text,
          client: proposal?.client,
          project: proposal?.project,
          api_key: apiKey,
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setStage0Data(data.extracted)
      setComplianceItems(data.compliance_items)
      // Save to DB
      await patchProposal('stage0_data', data.extracted)
      await patchProposal('compliance_items', data.compliance_items)
    } catch (e: any) { setError(e.message) }
    finally { setExtracting(false) }
  }

  async function confirmStage0() {
    await patchProposal('stage0_data', stage0Data)
    await patchProposal('compliance_items', complianceItems)
    await patchProposal('stage0_confirmed', true)
    setStage0Confirmed(true)
    setStage('inputs')
  }

  async function saveStage0Draft() {
    await patchProposal('stage0_data', stage0Data)
    await patchProposal('compliance_items', complianceItems)
    setSaved(true)
    setTimeout(()=>setSaved(false), 2000)
  }

  function updateComplianceItem(ref: string, field: string, value: string) {
    setComplianceItems(prev => prev.map(item => item.ref === ref ? {...item, [field]: value} : item))
  }

  function updateRisk(ref: string, field: string, value: string) {
    setStage0Data((prev: any) => ({
      ...prev,
      risks: (prev?.risks || []).map((r: any) => r.ref === ref ? {...r, [field]: value} : r)
    }))
  }

  function deleteRisk(ref: string) {
    setStage0Data((prev: any) => ({...prev, risks: (prev?.risks||[]).filter((r: any) => r.ref !== ref)}))
  }

  function addRisk() {
    const ref = 'RISK-' + String((stage0Data?.risks?.length||0)+1).padStart(2,'0')
    setStage0Data((prev: any) => ({
      ...prev,
      risks: [...(prev?.risks||[]), {ref, risk:'New risk', likelihood:'Medium', impact:'Medium', financial_exposure:'', source:'', mitigation:''}]
    }))
  }

  function updateTimelineField(field: string, value: string) {
    setStage0Data((prev: any) => ({...prev, submission_timeline: {...(prev?.submission_timeline||{}), [field]: value}}))
  }

  function updateKeyDate(i: number, field: string, value: string) {
    setStage0Data((prev: any) => {
      const dates = [...(prev?.submission_timeline?.key_dates||[])]
      dates[i] = {...dates[i], [field]: value}
      return {...prev, submission_timeline: {...(prev?.submission_timeline||{}), key_dates: dates}}
    })
  }

  function addKeyDate() {
    setStage0Data((prev: any) => ({
      ...prev,
      submission_timeline: {
        ...(prev?.submission_timeline||{}),
        key_dates: [...(prev?.submission_timeline?.key_dates||[]), {date:'', event:'', critical: false}]
      }
    }))
  }

  function deleteKeyDate(i: number) {
    setStage0Data((prev: any) => {
      const dates = (prev?.submission_timeline?.key_dates||[]).filter((_: any, j: number) => j !== i)
      return {...prev, submission_timeline: {...(prev?.submission_timeline||{}), key_dates: dates}}
    })
  }

  function updateCommercialField(field: string, value: string) {
    setStage0Data((prev: any) => ({...prev, commercial_terms: {...(prev?.commercial_terms||{}), [field]: value}}))
  }

  function deleteComplianceItem(ref: string) {
    setComplianceItems(prev => prev.filter(item => item.ref !== ref))
  }

  function addComplianceItem() {
    const newRef = 'CUSTOM-' + String(complianceItems.length+1).padStart(2,'0')
    setComplianceItems(prev => [...prev, {
      ref: newRef, type:'Functional', requirement:'New requirement',
      priority:'Must', category:'Other',
      stage1_status:'not_started', stage1_part:null,
      stage2_status:'not_started', notes:''
    }])
  }

  // ── Compliance counts ─────────────────────────────────────────────────────
  function complianceCounts() {
    const green = complianceItems.filter(i => i.stage1_status==='addressed').length
    const amber = complianceItems.filter(i => i.stage1_status==='partial').length
    const red = complianceItems.filter(i => i.stage1_status==='not_started' && partsComplete[i.stage1_part||''] ).length
    const total = complianceItems.length
    return { green, amber, red: total - green - amber, total }
  }

  // ── Patch helper ──────────────────────────────────────────────────────────
  async function patchProposal(field: string, value: any) {
    await fetch('/api/proposals', {
      method:'PATCH',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ id, field, value }),
    })
  }

  // ── Part data ─────────────────────────────────────────────────────────────
  function updatePartData(part: string, field: string, value: any) {
    setPartData(prev => ({ ...prev, [part]: { ...(prev[part]||{}), [field]: value } }))
  }

  function toggleArrayItem(part: string, field: string, item: string) {
    const current: string[] = (partData[part]?.[field]||[])
    updatePartData(part, field, current.includes(item) ? current.filter(x=>x!==item) : [...current, item])
  }

  async function savePart(part: string, markComplete: boolean) {
    setSaving(true)
    try {
      const newComplete = {...partsComplete, [part]: markComplete}
      await patchProposal('parts_data', partData)
      await patchProposal('parts_complete', newComplete)
      setPartsComplete(newComplete)
      setSaved(true)
      setTimeout(()=>setSaved(false), 2000)
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  function allPartsComplete() { return PARTS.every(p => partsComplete[p]) }

  // ── Generate ──────────────────────────────────────────────────────────────
  async function generateAll() {
    if (!allPartsComplete()) return setError('Please complete and save all parts before generating.')
    setGenerating(true)
    const init: Record<string,string> = {}
    PARTS.forEach(p => init[p]='pending')
    setGenStatus(init); setGenProgress(0)
    const newSections: Record<string,any> = {}
    for (let i=0; i<PARTS.length; i++) {
      const part = PARTS[i]
      setGenStatus(prev=>({...prev,[part]:'active'}))
      try {
        const res = await fetch('/api/generate-section', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({
            part, api_key: apiKey,
            client: proposal?.client, project: proposal?.project,
            ref: proposal?.ref, value: proposal?.value,
            timeline: proposal?.timeline, rfp: proposal?.rfp_text,
            part_inputs: partData[part]||{},
            arch_review: archReview,
            stage0_data: stage0Data,
            compliance_items: complianceItems,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        newSections[part] = data.section
        setGenStatus(prev=>({...prev,[part]:'done'}))
      } catch { setGenStatus(prev=>({...prev,[part]:'error'})) }
      setGenProgress(Math.round(((i+1)/PARTS.length)*100))
    }
    setGeneratedSections(newSections)
    await patchProposal('generated_sections', newSections)
    await patchProposal('status', 'generated')
    setGenerating(false); setStage('generated')
  }

  async function exportWord() {
    const res = await fetch('/api/export-proposal', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        client: proposal?.client, ref: proposal?.ref,
        project: proposal?.project, value: proposal?.value,
        timeline: proposal?.timeline, sections: generatedSections,
        compliance_items: complianceItems,
      }),
    })
    if (!res.ok) { const e=await res.json(); setError(e.error); return }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Emaratech_Proposal_${(proposal?.client||'').replace(/[^a-zA-Z0-9]/g,'_')}.docx`
    a.click(); URL.revokeObjectURL(url)
  }

  // ── Chat ──────────────────────────────────────────────────────────────────
  async function sendChat() {
    if (!chatInput.trim()||chatLoading) return
    const msg = chatInput.trim(); setChatInput('')
    const prev = chatHistory[activePart]||[]
    const next = [...prev, {role:'user' as const, content:msg}]
    setChatHistory(p=>({...p,[activePart]:next}))
    setChatLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ message:msg, part:activePart, part_data:partData[activePart]||{}, rfp_text:proposal?.rfp_text||'', history:prev, api_key:apiKey }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setChatHistory(p=>({...p,[activePart]:[...next,{role:'assistant',content:data.reply}]}))
    } catch (e: any) {
      setChatHistory(p=>({...p,[activePart]:[...next,{role:'assistant',content:'⚠ '+e.message}]}))
    }
    finally { setChatLoading(false) }
  }

  // ── Dictionary ────────────────────────────────────────────────────────────
  async function openDict() {
    setDictOpen(true)
    if (dictData[activePart]) return
    setDictLoading(true)
    try {
      const res = await fetch('/api/dictionary?part='+activePart)
      const data = await res.json()
      setDictData(prev=>({...prev,[activePart]:data.grouped||{}}))
      const cats = Object.keys(data.grouped||{})
      if (cats.length) setDictCat(cats[0])
    } catch {} finally { setDictLoading(false) }
  }

  function insertBlock(content: string) {
    const fieldMap: Record<string,string> = { A:'exec_notes', B:'tech_notes', C:'sec_approach', D:'delivery_constraints', E:'support_notes', F:'deal_differentiators' }
    const field = fieldMap[activePart]||'exec_notes'
    const current = partData[activePart]?.[field]||''
    updatePartData(activePart, field, current ? current+'\n\n'+content : content)
    setDictOpen(false)
  }

  // ── Architecture ──────────────────────────────────────────────────────────
  async function handleArchUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    const fd = new FormData(); fd.append('file', file)
    const res = await fetch('/api/parse-file', {method:'POST',body:fd})
    const data = await res.json()
    if (res.ok) { setArchText(data.text); setArchFile(file.name) }
  }

  async function runArchReview() {
    if (!archText) return; setArchReviewing(true)
    try {
      const res = await fetch('/api/review-architecture', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ arch_text:archText, rfp_text:proposal?.rfp_text||'', client:proposal?.client, project:proposal?.project, round:1, api_key:apiKey }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setArchReview(data.review)
      await patchProposal('arch_review', data.review)
    } catch (e: any) { setError(e.message) }
    finally { setArchReviewing(false) }
  }

  function scoreColor(s: number) {
    if (s>=4) return 'var(--green)'; if (s>=3) return 'var(--amber)'; return 'var(--red)'
  }

  const counts = complianceCounts()

  if (loading) return (
    <>
      <Topbar />
      <div className="main" style={{alignItems:'center',paddingTop:60}}>
        <div className="spinner" style={{width:24,height:24,borderWidth:3}} />
        <div style={{fontSize:13,color:'var(--textL)',marginTop:12}}>Loading proposal...</div>
      </div>
    </>
  )
  if (!proposal) return null

  const currentPartData = partData[activePart]||{}
  const currentChatHistory = chatHistory[activePart]||[]
  const dictCategories = Object.keys(dictData[activePart]||{})

  return (
    <>
      <Topbar title={proposal.project} />
      <div style={{display:'flex',gap:0,minHeight:'calc(100vh - 112px)',position:'relative'}}>

        {/* ── MAIN CONTENT ── */}
        <div style={{flex:1,padding:'20px',paddingRight: complianceOpen ? '420px' : '20px',display:'flex',flexDirection:'column',gap:16,maxWidth:'100%',transition:'padding-right .3s'}}>

          {error && <div className="error-bar">⚠ {error}<button onClick={()=>setError('')} style={{marginLeft:'auto',background:'none',border:'none',color:'var(--red)',cursor:'pointer',fontSize:16}}>✕</button></div>}

          {/* API key bar */}
          <div style={{display:'flex',gap:12,alignItems:'center',background:'#fff',border:'1px solid var(--grayM)',borderRadius:10,padding:'10px 16px'}}>
            <span style={{fontSize:11,color:'var(--textL)',fontWeight:600,whiteSpace:'nowrap'}}>API key</span>
            <input type="password" value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder="sk-ant-api03-... (only if not configured on server)" style={{flex:1,fontSize:12,background:'var(--grayL)',border:'1px solid var(--grayM)',borderRadius:6,padding:'6px 10px',fontFamily:'inherit',outline:'none'}} />
          </div>

          {/* Stage 0 header bar */}
          <div style={{display:'flex',alignItems:'center',gap:0,background:'#fff',border:'1px solid var(--grayM)',borderRadius:10,overflow:'hidden'}}>
            {/* Stage 0 */}
            <div style={{flex:1,padding:'12px 16px',background:stage==='stage0'?'var(--dark)':stage0Confirmed?'var(--greenL)':'var(--grayL)',display:'flex',alignItems:'center',gap:10}}>
              <div style={{width:24,height:24,borderRadius:6,background:stage0Confirmed?'var(--green)':stage==='stage0'?'var(--bright)':'var(--grayM)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:stage0Confirmed?'#fff':stage==='stage0'?'var(--dark)':'var(--grayB)',flexShrink:0}}>
                {stage0Confirmed?'✓':'0'}
              </div>
              <div>
                <div style={{fontSize:13,fontWeight:600,color:stage==='stage0'?'#fff':stage0Confirmed?'#0F6E56':'var(--grayB)'}}>Stage 0 — Requirements</div>
                <div style={{fontSize:10,color:stage==='stage0'?'rgba(255,255,255,.6)':stage0Confirmed?'#0F6E56':'var(--grayB)'}}>
                  {stage0Confirmed ? `${complianceItems.length} requirements confirmed` : 'Extract and confirm requirements'}
                </div>
              </div>
              {stage0Confirmed && stage!=='stage0' && (
                <button onClick={()=>setStage('stage0')} style={{marginLeft:'auto',fontSize:10,color:stage==='stage0'?'var(--bright)':'#0F6E56',background:'none',border:'none',cursor:'pointer',textDecoration:'underline'}}>View</button>
              )}
            </div>
            <div style={{width:1,background:'var(--grayM)',alignSelf:'stretch'}} />
            {/* Stage 1 */}
            <div style={{flex:1,padding:'12px 16px',background:stage==='inputs'?'var(--dark)':allPartsComplete()?'var(--greenL)':stage0Confirmed?'var(--off)':'var(--grayL)',display:'flex',alignItems:'center',gap:10,opacity:stage0Confirmed?1:0.5}}>
              <div style={{width:24,height:24,borderRadius:6,background:allPartsComplete()?'var(--green)':stage==='inputs'?'var(--bright)':'var(--grayM)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:allPartsComplete()?'#fff':stage==='inputs'?'var(--dark)':'var(--grayB)',flexShrink:0}}>
                {allPartsComplete()?'✓':'1'}
              </div>
              <div>
                <div style={{fontSize:13,fontWeight:600,color:stage==='inputs'?'#fff':allPartsComplete()?'#0F6E56':stage0Confirmed?'var(--dark)':'var(--grayB)'}}>Stage 1 — Inputs</div>
                <div style={{fontSize:10,color:stage==='inputs'?'rgba(255,255,255,.6)':allPartsComplete()?'#0F6E56':stage0Confirmed?'var(--textL)':'var(--grayB)'}}>
                  {!stage0Confirmed?'Locked — confirm Stage 0 first':allPartsComplete()?'All 6 parts complete':`${PARTS.filter(p=>partsComplete[p]).length} of 6 parts complete`}
                </div>
              </div>
              <div style={{marginLeft:'auto',display:'flex',gap:4}}>
                {PARTS.map(p=>(
                  <div key={p} style={{width:18,height:18,borderRadius:4,background:partsComplete[p]?'var(--bright)':stage==='inputs'?'rgba(255,255,255,.15)':'var(--grayM)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:700,color:partsComplete[p]?'var(--dark)':stage==='inputs'?'rgba(255,255,255,.5)':'var(--grayB)'}}>{p}</div>
                ))}
              </div>
            </div>
            <div style={{width:1,background:'var(--grayM)',alignSelf:'stretch'}} />
            {/* Stage 2 */}
            <div style={{flex:1,padding:'12px 16px',background:stage==='generated'?'var(--dark)':allPartsComplete()&&stage0Confirmed?'var(--off)':'var(--grayL)',display:'flex',alignItems:'center',gap:10,opacity:allPartsComplete()&&stage0Confirmed?1:0.4}}>
              <div style={{width:24,height:24,borderRadius:6,background:stage==='generated'?'var(--bright)':allPartsComplete()&&stage0Confirmed?'var(--green)':'var(--grayM)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:stage==='generated'||allPartsComplete()&&stage0Confirmed?'var(--dark)':'var(--grayB)',flexShrink:0}}>2</div>
              <div>
                <div style={{fontSize:13,fontWeight:600,color:stage==='generated'?'#fff':allPartsComplete()&&stage0Confirmed?'var(--dark)':'var(--grayB)'}}>Stage 2 — Generate</div>
                <div style={{fontSize:10,color:stage==='generated'?'rgba(255,255,255,.6)':allPartsComplete()&&stage0Confirmed?'var(--textL)':'var(--grayB)'}}>
                  {allPartsComplete()&&stage0Confirmed?'Ready — generate proposal':'Complete Stage 0 and all parts first'}
                </div>
              </div>
              {allPartsComplete()&&stage0Confirmed&&stage==='inputs'&&(
                <button className="btn-success" style={{marginLeft:'auto',padding:'6px 16px',fontSize:12}} onClick={generateAll} disabled={generating}>{generating?'Generating...':'Generate →'}</button>
              )}
              {stage==='generated'&&(
                <button className="btn-success" style={{marginLeft:'auto',padding:'6px 16px',fontSize:12}} onClick={exportWord}>Export Word →</button>
              )}
            </div>
          </div>

          {/* ── STAGE 0 ── */}
          {stage==='stage0' && (
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              <div className="card">
                <div className="card-title">Stage 0 — Requirements extraction and compliance sheet</div>
                <p style={{fontSize:12,color:'var(--textL)',lineHeight:1.7,marginBottom:16}}>
                  AI will read the RFP or Description of Work and extract all requirements into a structured compliance sheet.
                  You can edit, add, or remove items before confirming. Once confirmed, these requirements track coverage through Stage 1 and Stage 2.
                </p>
                {!(proposal.rfp_text||proposal.dow_text) && (
                  <div className="callout callout-amber" style={{marginBottom:12}}>No RFP text found. Go back to the proposals list and edit this proposal to add RFP text or upload a document.</div>
                )}
                <div className="row-btns">
                  <button className="btn-primary" onClick={runExtraction} disabled={extracting||!(proposal.rfp_text||proposal.dow_text)}>
                    {extracting?'Extracting requirements...':stage0Data?'Re-run extraction':'Extract requirements'}
                  </button>
                  {extracting && <div className="spinner" />}
                  {extracting && <span style={{fontSize:11,color:'var(--textL)'}}>This may take 20-30 seconds...</span>}
                </div>
              </div>

              {stage0Data && (
                <>
                  {/* Summary stats */}
                  <div className="metric-row">
                    <div className="metric"><div className="m-label">Total items</div><div className="m-val">{complianceItems.length}</div><div className="m-sub">In compliance sheet</div></div>
                    <div className="metric"><div className="m-label">Functional reqs</div><div className="m-val" style={{color:'var(--dark)'}}>{stage0Data.extraction_summary?.total_functional||stage0Data.functional_requirements?.length||0}</div></div>
                    <div className="metric"><div className="m-label">Risks</div><div className="m-val" style={{color:'var(--red)'}}>{stage0Data.risks?.length||0}</div><div className="m-sub">{(stage0Data.extraction_summary?.critical_risks||0)} critical</div></div>
                    <div className="metric"><div className="m-label">Mandatory docs</div><div className="m-val" style={{color:'var(--amber)'}}>{stage0Data.mandatory_submissions?.length||0}</div><div className="m-sub">Required in submission</div></div>
                    <div className="metric"><div className="m-label">Confidence</div><div style={{marginTop:6}}><span className={`pill ${stage0Data.extraction_summary?.confidence==='High'?'pill-green':stage0Data.extraction_summary?.confidence==='Medium'?'pill-amber':'pill-red'}`}>{stage0Data.extraction_summary?.confidence||'—'}</span></div><div className="m-sub" style={{fontSize:10,marginTop:4}}>{stage0Data.extraction_summary?.confidence_note?.slice(0,40)}</div></div>
                  </div>
                  {stage0Data.extraction_summary?.top_3_risks?.length > 0 && (
                    <div style={{background:'var(--redL)',border:'1px solid #F0C0C0',borderLeft:'4px solid var(--red)',borderRadius:'0 8px 8px 0',padding:'12px 16px'}}>
                      <div style={{fontSize:11,fontWeight:700,color:'var(--red)',marginBottom:8,textTransform:'uppercase',letterSpacing:'.05em'}}>Top 3 critical risks</div>
                      {stage0Data.extraction_summary.top_3_risks.map((r: string, i: number) => (
                        <div key={i} style={{display:'flex',gap:8,fontSize:12,color:'var(--red)',marginBottom:4,alignItems:'flex-start'}}>
                          <span style={{flexShrink:0,fontWeight:700}}>{i+1}.</span>{r}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Submission timeline - editable */}
                  {stage0Data.submission_timeline && (
                    <div className="card">
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
                        <div className="card-title" style={{margin:0}}>Submission timeline</div>
                        <span style={{fontSize:10,color:'var(--textL)'}}>Click any field to edit</span>
                      </div>
                      <div className="g4" style={{marginBottom:16}}>
                        {[
                          ['submission_deadline','Submission deadline ⚠','var(--red)'],
                          ['project_start','Project start','var(--dark)'],
                          ['delivery_duration','Delivery duration','var(--dark)'],
                          ['proposal_validity','Proposal validity','var(--dark)'],
                        ].map(([field, label, color]) => (
                          <div key={field} style={{background: field==='submission_deadline'?'var(--redL)':'var(--grayL)',borderRadius:8,padding:'10px 14px',border:field==='submission_deadline'?'1px solid #F0C0C0':'1px solid var(--grayM)'}}>
                            <div style={{fontSize:10,color: field==='submission_deadline'?'var(--red)':'var(--textL)',fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'.05em',marginBottom:6}}>{label}</div>
                            {editingTimeline===field
                              ? <input type="text" autoFocus value={(stage0Data.submission_timeline as any)[field]||''} onChange={e=>updateTimelineField(field,e.target.value)} onBlur={()=>setEditingTimeline(null)}
                                  style={{width:'100%',fontSize:13,fontWeight:700,color:color as string,background:'transparent',border:'none',borderBottom:'2px solid var(--bright)',outline:'none',fontFamily:'inherit',padding:'2px 0'}} />
                              : <div onClick={()=>setEditingTimeline(field)} style={{fontSize:13,fontWeight:700,color:color as string,cursor:'pointer',minHeight:20}}>{(stage0Data.submission_timeline as any)[field]||'Click to add'}</div>
                            }
                          </div>
                        ))}
                      </div>
                      <div>
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                          <div style={{fontSize:10,fontWeight:700,color:'var(--textL)',textTransform:'uppercase' as const,letterSpacing:'.05em'}}>Key dates</div>
                          <button className="btn-second btn-small" onClick={addKeyDate}>+ Add date</button>
                        </div>
                        {(stage0Data.submission_timeline.key_dates||[]).map((kd: any, i: number) => (
                          <div key={i} style={{display:'flex',gap:8,padding:'6px 0',borderBottom:'1px solid var(--grayM)',alignItems:'center'}}>
                            <input type="text" value={kd.date||''} onChange={e=>updateKeyDate(i,'date',e.target.value)} placeholder="Date"
                              style={{width:140,fontSize:12,padding:'4px 8px',borderRadius:6,border:'1px solid var(--grayM)',fontFamily:'inherit',background:kd.critical?'var(--redL)':'var(--grayL)',fontWeight:600,color:kd.critical?'var(--red)':'var(--dark)',outline:'none'}} />
                            <input type="text" value={kd.event||''} onChange={e=>updateKeyDate(i,'event',e.target.value)} placeholder="Event description"
                              style={{flex:1,fontSize:12,padding:'4px 8px',borderRadius:6,border:'1px solid var(--grayM)',fontFamily:'inherit',background:'var(--grayL)',outline:'none'}} />
                            <label style={{display:'flex',alignItems:'center',gap:4,fontSize:10,color:'var(--red)',cursor:'pointer',flexShrink:0}}>
                              <input type="checkbox" checked={kd.critical||false} onChange={e=>updateKeyDate(i,'critical',String(e.target.checked))} style={{accentColor:'var(--red)'}} />Critical
                            </label>
                            <button onClick={()=>deleteKeyDate(i)} style={{background:'none',border:'none',color:'var(--grayB)',cursor:'pointer',fontSize:14,flexShrink:0}}>✕</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Compliance sheet - editable */}
                  <div className="card">
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
                      <div className="card-title" style={{margin:0}}>Compliance tracking sheet — edit before confirming</div>
                      <button className="btn-second btn-small" onClick={addComplianceItem}>+ Add row</button>
                    </div>
                    <div style={{overflowX:'auto'}}>
                      <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                        <thead>
                          <tr style={{background:'var(--dark)'}}>
                            <th style={{color:'var(--bright)',padding:'8px 10px',textAlign:'left',width:80}}>Ref</th>
                            <th style={{color:'var(--bright)',padding:'8px 10px',textAlign:'left',width:100}}>Type</th>
                            <th style={{color:'var(--bright)',padding:'8px 10px',textAlign:'left',width:100}}>Category</th>
                            <th style={{color:'var(--bright)',padding:'8px 10px',textAlign:'left'}}>Requirement</th>
                            <th style={{color:'var(--bright)',padding:'8px 10px',textAlign:'center',width:80}}>Priority</th>
                            <th style={{color:'var(--bright)',padding:'8px 10px',textAlign:'center',width:60}}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {complianceItems.map((item, i) => (
                            <tr key={item.ref} style={{borderBottom:'1px solid var(--grayM)',background:i%2===0?'var(--grayL)':'#fff'}}>
                              <td style={{padding:'8px 10px',fontWeight:700,color:'var(--bright)',fontSize:10}}>{item.ref}</td>
                              <td style={{padding:'8px 10px'}}>
                                <select value={item.type} onChange={e=>updateComplianceItem(item.ref,'type',e.target.value)}
                                  style={{fontSize:10,padding:'3px 6px',borderRadius:4,border:'1px solid var(--grayM)',background:'transparent',fontFamily:'inherit',width:'100%'}}>
                                  {['Functional','Non-functional','Technical','Constraint','Risk'].map(t=><option key={t}>{t}</option>)}
                                </select>
                              </td>
                              <td style={{padding:'8px 10px'}}>
                                <input type="text" value={item.category} onChange={e=>updateComplianceItem(item.ref,'category',e.target.value)}
                                  style={{fontSize:10,padding:'3px 6px',borderRadius:4,border:'1px solid var(--grayM)',background:'transparent',width:'100%',fontFamily:'inherit'}} />
                              </td>
                              <td style={{padding:'8px 10px'}}>
                                {editingReq===item.ref
                                  ? <textarea value={item.requirement} onChange={e=>updateComplianceItem(item.ref,'requirement',e.target.value)} onBlur={()=>setEditingReq(null)}
                                      style={{width:'100%',fontSize:11,fontFamily:'inherit',border:'1px solid var(--bright)',borderRadius:4,padding:'4px',resize:'vertical',minHeight:60}} autoFocus />
                                  : <div onClick={()=>setEditingReq(item.ref)} style={{cursor:'pointer',lineHeight:1.5,color:'var(--text)'}}>{item.requirement}</div>
                                }
                              </td>
                              <td style={{padding:'8px 10px',textAlign:'center'}}>
                                <select value={item.priority} onChange={e=>updateComplianceItem(item.ref,'priority',e.target.value)}
                                  style={{fontSize:10,padding:'3px 6px',borderRadius:4,border:'1px solid var(--grayM)',background:item.priority==='Must'?'var(--redL)':item.priority==='Should'?'var(--amberL)':'var(--off)',fontFamily:'inherit',color:item.priority==='Must'?'var(--red)':item.priority==='Should'?'var(--amber)':'var(--teal)',fontWeight:700}}>
                                  <option>Must</option><option>Should</option><option>Nice</option>
                                </select>
                              </td>
                              <td style={{padding:'8px 10px',textAlign:'center'}}>
                                <button onClick={()=>deleteComplianceItem(item.ref)} style={{background:'none',border:'none',color:'var(--grayB)',cursor:'pointer',fontSize:14}}>✕</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Risks - editable */}
                  <div className="card">
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
                      <div className="card-title" style={{margin:0}}>Risks · click any cell to edit</div>
                      <button className="btn-second btn-small" onClick={addRisk}>+ Add risk</button>
                    </div>
                    {(!stage0Data.risks || stage0Data.risks.length === 0) && (
                      <div style={{fontSize:12,color:'var(--grayB)',textAlign:'center',padding:'20px 0'}}>No risks extracted — click Add risk to add manually</div>
                    )}
                    {(stage0Data.risks||[]).map((r: any, i: number) => {
                      const rCol = (v: string) => v==='High'?'var(--red)':v==='Medium'?'var(--amber)':'var(--green)'
                      const rBg = (v: string) => v==='High'?'var(--redL)':v==='Medium'?'var(--amberL)':'var(--greenL)'
                      return (
                        <div key={r.ref} style={{border:'1px solid var(--grayM)',borderLeft:`4px solid ${rCol(r.impact)}`,borderRadius:'0 8px 8px 0',marginBottom:8,padding:'12px 14px',background:i%2===0?'var(--grayL)':'#fff'}}>
                          <div style={{display:'flex',alignItems:'flex-start',gap:10,marginBottom:8}}>
                            <span style={{fontSize:10,fontWeight:700,color:rCol(r.impact),flexShrink:0,minWidth:60}}>{r.ref}</span>
                            {editingRisk===r.ref+'-risk'
                              ? <textarea autoFocus value={r.risk||''} onChange={e=>updateRisk(r.ref,'risk',e.target.value)} onBlur={()=>setEditingRisk(null)}
                                  style={{flex:1,fontSize:12,fontWeight:600,fontFamily:'inherit',border:'1px solid var(--bright)',borderRadius:6,padding:'6px',resize:'vertical',minHeight:50,outline:'none'}} />
                              : <div onClick={()=>setEditingRisk(r.ref+'-risk')} style={{flex:1,fontSize:12,fontWeight:600,color:'var(--dark)',cursor:'pointer',lineHeight:1.5}}>{r.risk||'Click to edit'}</div>
                            }
                            <button onClick={()=>deleteRisk(r.ref)} style={{background:'none',border:'none',color:'var(--grayB)',cursor:'pointer',fontSize:14,flexShrink:0}}>✕</button>
                          </div>
                          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr auto auto',gap:8,alignItems:'center'}}>
                            <div>
                              <div style={{fontSize:9,color:'var(--textL)',fontWeight:700,textTransform:'uppercase' as const,marginBottom:3}}>Financial exposure</div>
                              {editingRisk===r.ref+'-exp'
                                ? <input autoFocus type="text" value={r.financial_exposure||''} onChange={e=>updateRisk(r.ref,'financial_exposure',e.target.value)} onBlur={()=>setEditingRisk(null)}
                                    style={{width:'100%',fontSize:11,fontWeight:700,color:'var(--red)',border:'1px solid var(--bright)',borderRadius:4,padding:'3px 6px',fontFamily:'inherit',outline:'none'}} />
                                : <div onClick={()=>setEditingRisk(r.ref+'-exp')} style={{fontSize:11,fontWeight:700,color:r.financial_exposure?'var(--red)':'var(--grayB)',cursor:'pointer'}}>{r.financial_exposure||'None stated — click to add'}</div>
                              }
                            </div>
                            <div>
                              <div style={{fontSize:9,color:'var(--textL)',fontWeight:700,textTransform:'uppercase' as const,marginBottom:3}}>Mitigation</div>
                              {editingRisk===r.ref+'-mit'
                                ? <input autoFocus type="text" value={r.mitigation||''} onChange={e=>updateRisk(r.ref,'mitigation',e.target.value)} onBlur={()=>setEditingRisk(null)}
                                    style={{width:'100%',fontSize:11,border:'1px solid var(--bright)',borderRadius:4,padding:'3px 6px',fontFamily:'inherit',outline:'none'}} />
                                : <div onClick={()=>setEditingRisk(r.ref+'-mit')} style={{fontSize:11,color:r.mitigation?'var(--textM)':'var(--grayB)',cursor:'pointer'}}>{r.mitigation||'Click to add mitigation'}</div>
                              }
                            </div>
                            <div>
                              <div style={{fontSize:9,color:'var(--textL)',fontWeight:700,textTransform:'uppercase' as const,marginBottom:3}}>Likelihood</div>
                              <select value={r.likelihood||'Medium'} onChange={e=>updateRisk(r.ref,'likelihood',e.target.value)}
                                style={{fontSize:10,padding:'3px 6px',borderRadius:4,border:'1px solid var(--grayM)',background:rBg(r.likelihood),color:rCol(r.likelihood),fontWeight:700,fontFamily:'inherit',cursor:'pointer'}}>
                                <option>High</option><option>Medium</option><option>Low</option>
                              </select>
                            </div>
                            <div>
                              <div style={{fontSize:9,color:'var(--textL)',fontWeight:700,textTransform:'uppercase' as const,marginBottom:3}}>Impact</div>
                              <select value={r.impact||'Medium'} onChange={e=>updateRisk(r.ref,'impact',e.target.value)}
                                style={{fontSize:10,padding:'3px 6px',borderRadius:4,border:'1px solid var(--grayM)',background:rBg(r.impact),color:rCol(r.impact),fontWeight:700,fontFamily:'inherit',cursor:'pointer'}}>
                                <option>High</option><option>Medium</option><option>Low</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Mandatory submissions */}
                  {stage0Data.mandatory_submissions?.length > 0 && (
                    <div className="card">
                      <div className="card-title">Mandatory submission documents — missing any of these may disqualify the bid</div>
                      <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                        <thead><tr style={{background:'var(--dark)'}}>
                          <th style={{color:'var(--bright)',padding:'8px 10px',textAlign:'left',width:80}}>Ref</th>
                          <th style={{color:'var(--bright)',padding:'8px 10px',textAlign:'left'}}>Document required</th>
                          <th style={{color:'var(--bright)',padding:'8px 10px',textAlign:'left',width:200}}>Must contain</th>
                          <th style={{color:'var(--bright)',padding:'8px 10px',textAlign:'left',width:160}}>Consequence if missing</th>
                        </tr></thead>
                        <tbody>
                          {stage0Data.mandatory_submissions.map((m: any, i: number) => (
                            <tr key={m.ref} style={{borderBottom:'1px solid var(--grayM)',background:i%2===0?'var(--redL)':'#fff9f9'}}>
                              <td style={{padding:'8px 10px',fontWeight:700,color:'var(--red)',fontSize:10}}>{m.ref}</td>
                              <td style={{padding:'8px 10px',fontWeight:600,color:'var(--dark)'}}>{m.document}</td>
                              <td style={{padding:'8px 10px',color:'var(--textM)',fontSize:10}}>{m.description}</td>
                              <td style={{padding:'8px 10px',color:'var(--red)',fontSize:10,fontWeight:600}}>{m.consequence}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Compliance standards */}
                  {stage0Data.compliance_standards?.length > 0 && (
                    <div className="card">
                      <div className="card-title">Compliance standards and certifications required</div>
                      <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                        {stage0Data.compliance_standards.map((s: any) => (
                          <div key={s.ref} style={{background:'var(--off)',border:'1px solid var(--bright)',borderRadius:8,padding:'8px 12px',minWidth:160}}>
                            <div style={{fontSize:10,fontWeight:700,color:'var(--bright)',marginBottom:3}}>{s.ref}</div>
                            <div style={{fontSize:12,fontWeight:600,color:'var(--dark)',marginBottom:3}}>{s.standard}</div>
                            {s.evidence_required && <div style={{fontSize:10,color:'var(--textL)'}}>{s.evidence_required}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Commercial terms - editable */}
                  <div className="card">
                    <div className="card-title">Commercial terms · click any field to edit</div>
                    <div className="g3">
                      {[
                        ['estimated_value','Estimated value'],
                        ['bid_bond','Bid bond requirement'],
                        ['performance_bond','Performance bond'],
                        ['payment_terms','Payment terms'],
                        ['warranty_period','Warranty period'],
                        ['validity_period','Proposal validity'],
                        ['pricing_structure','Pricing structure required'],
                      ].map(([field, label]) => (
                        <div key={field} style={{background:'var(--grayL)',borderRadius:8,padding:'10px 14px',border:'1px solid var(--grayM)'}}>
                          <div style={{fontSize:10,color:'var(--textL)',fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'.05em',marginBottom:6}}>{label}</div>
                          {editingCommercial===field
                            ? <textarea autoFocus value={(stage0Data.commercial_terms as any)?.[field]||''} onChange={e=>updateCommercialField(field,e.target.value)} onBlur={()=>setEditingCommercial(null)}
                                style={{width:'100%',fontSize:12,fontWeight:600,color:'var(--dark)',border:'1px solid var(--bright)',borderRadius:6,padding:'4px 6px',fontFamily:'inherit',resize:'vertical',minHeight:48,outline:'none'}} />
                            : <div onClick={()=>setEditingCommercial(field)} style={{fontSize:12,fontWeight:600,color:(stage0Data.commercial_terms as any)?.[field]?'var(--dark)':'var(--grayB)',cursor:'pointer',lineHeight:1.5,minHeight:20}}>
                                {(stage0Data.commercial_terms as any)?.[field]||'Not stated — click to add'}
                              </div>
                          }
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Additional notes */}
                  {stage0Data.additional_notes && (
                    <div className="callout"><strong>Additional notes: </strong>{stage0Data.additional_notes}</div>
                  )}

                  {/* Save and confirm */}
                  <div style={{display:'flex',gap:12,alignItems:'center',background:'var(--dark)',borderRadius:12,padding:20}}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:15,fontWeight:700,color:'#fff',marginBottom:4}}>Confirm requirements and proceed to Stage 1</div>
                      <div style={{fontSize:12,color:'rgba(255,255,255,.6)'}}>Once confirmed, these requirements will track coverage through Stage 1 and Stage 2. You can still view and update them via the compliance sidebar.</div>
                    </div>
                    <div style={{display:'flex',gap:8,flexShrink:0}}>
                      <button className="btn-second" onClick={saveStage0Draft} style={{whiteSpace:'nowrap',background:'rgba(255,255,255,.1)',color:'var(--grayB)',border:'1px solid rgba(255,255,255,.2)'}}>
                        Save draft
                      </button>
                      {saved && <span style={{fontSize:12,color:'var(--bright)',alignSelf:'center'}}>✓ Saved</span>}
                      <button className="btn-success" onClick={confirmStage0} style={{whiteSpace:'nowrap'}}>
                        ✓ Confirm and proceed →
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── GENERATION PROGRESS ── */}
          {generating && (
            <div className="card">
              <div className="card-title">Generating proposal sections</div>
              <div className="progress-bar"><div className="progress-fill" style={{width:genProgress+'%'}} /></div>
              {PARTS.map(p=>(
                <div key={p} className="gen-row">
                  <div className={`gen-icon ${genStatus[p]||'pending'}`}>{genStatus[p]==='done'?'✓':genStatus[p]==='active'?'…':genStatus[p]==='error'?'!':'○'}</div>
                  <span style={{flex:1}}>{PART_ICONS[p]} {PART_LABELS[p]}</span>
                  <span style={{fontSize:11,color:genStatus[p]==='done'?'var(--green)':genStatus[p]==='error'?'var(--red)':'var(--grayB)'}}>{genStatus[p]==='done'?'Complete':genStatus[p]==='active'?'Generating...':genStatus[p]==='error'?'Error':'Pending'}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── GENERATED SECTIONS ── */}
          {stage==='generated'&&!generating&&(
            <div className="card">
              <div className="card-title">Generated sections — review and edit before export</div>
              {PARTS.map(p=>{
                const d = generatedSections[p]; if (!d) return null
                return (
                  <div key={p} style={{borderBottom:'1px solid var(--grayM)',paddingBottom:16,marginBottom:16}}>
                    <div style={{fontSize:13,fontWeight:700,color:'var(--dark)',marginBottom:10}}>{PART_ICONS[p]} Part {p} — {PART_LABELS[p]}</div>
                    {Object.entries(d).map(([field,val])=>typeof val==='string'?(
                      <div key={field} style={{marginBottom:10}}>
                        <div style={{fontSize:10,fontWeight:700,color:'var(--textL)',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:4}}>{field.replace(/_/g,' ')}</div>
                        <textarea className="content-area" rows={4} defaultValue={val as string} onChange={e=>setGeneratedSections(prev=>({...prev,[p]:{...prev[p],[field]:e.target.value}}))} />
                      </div>
                    ):null)}
                  </div>
                )
              })}
            </div>
          )}

          {/* ── STAGE 1 PART TABS ── */}
          {stage==='inputs'&&!generating&&(
            <>
              <div style={{display:'flex',gap:0,background:'#fff',border:'1px solid var(--grayM)',borderRadius:10,overflow:'hidden'}}>
                {PARTS.map((p,i)=>(
                  <button key={p} onClick={()=>setActivePart(p)}
                    style={{flex:1,padding:'12px 8px',border:'none',borderRight:i<5?'1px solid var(--grayM)':'none',background:activePart===p?'var(--dark)':'#fff',cursor:'pointer',fontFamily:'inherit',transition:'all .15s',position:'relative'}}>
                    <div style={{fontSize:16,marginBottom:3}}>{PART_ICONS[p]}</div>
                    <div style={{fontSize:11,fontWeight:600,color:activePart===p?'var(--bright)':'var(--textL)'}}>Part {p}</div>
                    <div style={{fontSize:9,color:activePart===p?'rgba(255,255,255,.6)':'var(--grayB)',lineHeight:1.3}}>{PART_LABELS[p].split(' ').slice(0,2).join(' ')}</div>
                    {partsComplete[p]&&<div style={{position:'absolute',top:6,right:6,width:14,height:14,borderRadius:'50%',background:'var(--bright)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,color:'var(--dark)',fontWeight:700}}>✓</div>}
                  </button>
                ))}
              </div>

              <div style={{background:'#fff',border:'1px solid var(--grayM)',borderRadius:10,overflow:'hidden'}}>
                <div style={{background:'var(--grayL)',padding:'14px 20px',borderBottom:'1px solid var(--grayM)',display:'flex',alignItems:'center',gap:10}}>
                  <span style={{fontSize:18}}>{PART_ICONS[activePart]}</span>
                  <div>
                    <div style={{fontSize:14,fontWeight:700,color:'var(--dark)'}}>Part {activePart} — {PART_LABELS[activePart]}</div>
                    <div style={{fontSize:11,color:'var(--textL)'}}>Fill in your inputs — AI will use these when generating the proposal</div>
                  </div>
                  <div style={{marginLeft:'auto',display:'flex',gap:8,alignItems:'center'}}>
                    <button onClick={openDict} className="btn-second btn-small">📚 Dictionary</button>
                    <button onClick={()=>setChatOpen(true)} style={{background:'var(--dark)',color:'var(--bright)',border:'none',borderRadius:8,padding:'6px 14px',fontSize:12,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:6}}>
                      💬 AI Chat {currentChatHistory.length>0&&<span style={{background:'var(--bright)',color:'var(--dark)',borderRadius:10,padding:'1px 6px',fontSize:10,fontWeight:700}}>{currentChatHistory.filter(m=>m.role==='assistant').length}</span>}
                    </button>
                  </div>
                </div>

                {/* Relevant requirements for this part */}
                {complianceItems.filter(item => {
                  const partMap: Record<string,string[]> = {
                    A:['Functional','Constraint'], B:['Technical'], C:['Non-functional'],
                    D:['Constraint'], E:['Non-functional'], F:[]
                  }
                  return (partMap[activePart]||[]).includes(item.type) || item.stage1_part===activePart
                }).length > 0 && (
                  <div style={{padding:'10px 20px',background:'var(--off)',borderBottom:'1px solid var(--grayM)'}}>
                    <div style={{fontSize:10,fontWeight:700,color:'var(--textL)',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:6}}>Requirements to address in this part</div>
                    <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
                      {complianceItems.filter(item => {
                        const partMap: Record<string,string[]> = {
                          A:['Functional','Constraint'], B:['Technical'], C:['Non-functional'],
                          D:['Constraint'], E:['Non-functional'], F:[]
                        }
                        return (partMap[activePart]||[]).includes(item.type)
                      }).slice(0,6).map(item=>(
                        <span key={item.ref} style={{fontSize:10,padding:'3px 10px',borderRadius:20,background:item.priority==='Must'?'var(--redL)':'var(--amberL)',color:item.priority==='Must'?'var(--red)':'var(--amber)',border:`1px solid ${item.priority==='Must'?'#F0C0C0':'#FAC775'}`,fontWeight:600}}>
                          {item.ref}: {item.requirement.slice(0,40)}{item.requirement.length>40?'...':''}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{padding:20}}>
                  {/* PART A */}
                  {activePart==='A'&&(
                    <div style={{display:'flex',flexDirection:'column',gap:16}}>
                      <div className="g3">
                        <div><label className="f-label">Opportunity name</label><input type="text" value={currentPartData.opp_name||''} onChange={e=>updatePartData('A','opp_name',e.target.value)} placeholder="e.g. Ministry Portal Redevelopment" /></div>
                        <div><label className="f-label">Key client contact</label><input type="text" value={currentPartData.contact||''} onChange={e=>updatePartData('A','contact',e.target.value)} placeholder="Name and title" /></div>
                        <div><label className="f-label">Evaluation criteria summary</label><input type="text" value={currentPartData.eval_criteria||''} onChange={e=>updatePartData('A','eval_criteria',e.target.value)} placeholder="e.g. 35% technical, 30% team" /></div>
                      </div>
                      <div>
                        <label className="f-label">Scope items — what emaratech is delivering</label>
                        <div style={{marginBottom:6,display:'flex',flexWrap:'wrap',gap:6}}>
                          {(currentPartData.scope_items||[]).map((item: string,i: number)=>(
                            <span key={i} style={{background:'var(--off)',border:'1px solid var(--grayM)',borderRadius:20,padding:'4px 10px',fontSize:11,display:'flex',alignItems:'center',gap:6}}>
                              {item}<button onClick={()=>updatePartData('A','scope_items',(currentPartData.scope_items||[]).filter((_:any,j:number)=>j!==i))} style={{background:'none',border:'none',cursor:'pointer',color:'var(--grayB)',fontSize:12,lineHeight:1}}>✕</button>
                            </span>
                          ))}
                        </div>
                        <div style={{display:'flex',gap:8}}>
                          <input type="text" id="scope-input" placeholder="Add scope item and press Enter..." style={{flex:1,padding:'7px 12px',borderRadius:8,border:'1px solid var(--grayM)',fontSize:12,background:'var(--grayL)',fontFamily:'inherit',outline:'none'}}
                            onKeyDown={e=>{if(e.key==='Enter'){const v=(e.target as HTMLInputElement).value.trim();if(v){updatePartData('A','scope_items',[...(currentPartData.scope_items||[]),v]);(e.target as HTMLInputElement).value=''}}}} />
                          <button className="btn-second btn-small" onClick={()=>{const el=document.getElementById('scope-input') as HTMLInputElement;const v=el.value.trim();if(v){updatePartData('A','scope_items',[...(currentPartData.scope_items||[]),v]);el.value=''}}}>Add</button>
                        </div>
                      </div>
                      <div>
                        <label className="f-label">Out of scope items</label>
                        <div style={{marginBottom:6,display:'flex',flexWrap:'wrap',gap:6}}>
                          {(currentPartData.oos_items||[]).map((item: string,i: number)=>(
                            <span key={i} style={{background:'var(--redL)',border:'1px solid #F0C0C0',borderRadius:20,padding:'4px 10px',fontSize:11,color:'var(--red)',display:'flex',alignItems:'center',gap:6}}>
                              {item}<button onClick={()=>updatePartData('A','oos_items',(currentPartData.oos_items||[]).filter((_:any,j:number)=>j!==i))} style={{background:'none',border:'none',cursor:'pointer',color:'var(--red)',fontSize:12,lineHeight:1}}>✕</button>
                            </span>
                          ))}
                        </div>
                        <div style={{display:'flex',gap:8}}>
                          <input type="text" id="oos-input" placeholder="Add out-of-scope item..." style={{flex:1,padding:'7px 12px',borderRadius:8,border:'1px solid var(--grayM)',fontSize:12,background:'var(--grayL)',fontFamily:'inherit',outline:'none'}}
                            onKeyDown={e=>{if(e.key==='Enter'){const v=(e.target as HTMLInputElement).value.trim();if(v){updatePartData('A','oos_items',[...(currentPartData.oos_items||[]),v]);(e.target as HTMLInputElement).value=''}}}} />
                          <button className="btn-second btn-small" onClick={()=>{const el=document.getElementById('oos-input') as HTMLInputElement;const v=el.value.trim();if(v){updatePartData('A','oos_items',[...(currentPartData.oos_items||[]),v]);el.value=''}}}>Add</button>
                        </div>
                      </div>
                      <div className="g2">
                        <div><label className="f-label">Executive summary notes</label><textarea rows={5} value={currentPartData.exec_notes||''} onChange={e=>updatePartData('A','exec_notes',e.target.value)} placeholder="Key points for the executive summary..." className="content-area" /></div>
                        <div><label className="f-label">Key differentiators for this deal</label><textarea rows={5} value={currentPartData.differentiators||''} onChange={e=>updatePartData('A','differentiators',e.target.value)} placeholder="What specifically makes emaratech best placed..." className="content-area" /></div>
                      </div>
                      <div><label className="f-label">Assumptions and constraints</label><textarea rows={4} value={currentPartData.assumptions||''} onChange={e=>updatePartData('A','assumptions',e.target.value)} placeholder="Key assumptions and constraints specific to this engagement..." className="content-area" /></div>
                    </div>
                  )}

                  {/* PART B */}
                  {activePart==='B'&&(
                    <div style={{display:'flex',flexDirection:'column',gap:16}}>
                      <div style={{border:'1px solid var(--grayM)',borderRadius:10,overflow:'hidden'}}>
                        <div style={{background:'var(--grayL)',padding:'10px 16px',borderBottom:'1px solid var(--grayM)',display:'flex',alignItems:'center',gap:10}}>
                          <span style={{fontSize:13,fontWeight:700,color:'var(--dark)'}}>🏗 Architecture document</span>
                          {archReview&&<span style={{marginLeft:'auto',background:archReview.decision==='Approved'?'var(--greenL)':archReview.decision==='Rejected'?'var(--redL)':'var(--amberL)',color:archReview.decision==='Approved'?'#0F6E56':archReview.decision==='Rejected'?'var(--red)':'var(--amber)',padding:'3px 10px',borderRadius:20,fontSize:10,fontWeight:700}}>{archReview.decision}</span>}
                        </div>
                        <div style={{padding:14}}>
                          {!archFile?(
                            <label style={{display:'block'}}>
                              <div className="upload-zone"><div style={{fontSize:12,color:'var(--textL)',marginBottom:4}}>Upload architecture document</div><div style={{fontSize:10,color:'var(--grayB)'}}>AI reviews completeness, soundness, technology alignment, security, and integration coverage</div></div>
                              <input type="file" accept=".pdf,.docx,.txt,.md" style={{display:'none'}} onChange={handleArchUpload} />
                            </label>
                          ):(
                            <div>
                              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                                <span style={{fontSize:12,color:'var(--green)',fontWeight:600}}>✓ {archFile}</span>
                                <button className="btn-second btn-small" onClick={runArchReview} disabled={archReviewing}>{archReviewing?'Reviewing...':archReview?'Re-run review':'Run architecture review'}</button>
                                {archReviewing&&<div className="spinner" />}
                              </div>
                              {archReview&&(
                                <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:6,marginTop:10}}>
                                  {['completeness','soundness','technology_alignment','security_coverage','integration_coverage'].map(dim=>(
                                    <div key={dim} style={{background:'var(--grayL)',borderRadius:8,padding:'8px 10px',textAlign:'center'}}>
                                      <div style={{fontSize:18,fontWeight:700,color:scoreColor(archReview[dim]?.score||0)}}>{archReview[dim]?.score||'—'}</div>
                                      <div style={{fontSize:9,color:'var(--textL)',lineHeight:1.3}}>{dim.replace(/_/g,' ')}</div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="f-label">Technology stack — select all that apply</label>
                        <div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:6}}>
                          {TECH_OPTIONS.map(tech=>{
                            const sel=(currentPartData.tech_stack||[]).includes(tech)
                            return <button key={tech} onClick={()=>toggleArrayItem('B','tech_stack',tech)} style={{padding:'5px 12px',borderRadius:20,border:`1px solid ${sel?'var(--bright)':'var(--grayM)'}`,background:sel?'var(--off)':'#fff',color:sel?'var(--dark)':'var(--textL)',fontSize:11,cursor:'pointer',fontFamily:'inherit',fontWeight:sel?700:400}}>{sel&&'✓ '}{tech}</button>
                          })}
                        </div>
                      </div>
                      <div className="g2">
                        <div><label className="f-label">Technical approach notes</label><textarea rows={6} value={currentPartData.tech_notes||''} onChange={e=>updatePartData('B','tech_notes',e.target.value)} placeholder="Specific technical approach for this project..." className="content-area" /></div>
                        <div><label className="f-label">Integration notes</label><textarea rows={6} value={currentPartData.integration_notes||''} onChange={e=>updatePartData('B','integration_notes',e.target.value)} placeholder="Integrations required — UAEPASS, government APIs, ERP..." className="content-area" /></div>
                      </div>
                    </div>
                  )}

                  {/* PART C */}
                  {activePart==='C'&&(
                    <div style={{display:'flex',flexDirection:'column',gap:16}}>
                      <div>
                        <label className="f-label">Security standards applicable</label>
                        <div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:6}}>
                          {SECURITY_STANDARDS.map(std=>{
                            const sel=(currentPartData.standards||[]).includes(std)
                            return <button key={std} onClick={()=>toggleArrayItem('C','standards',std)} style={{padding:'6px 14px',borderRadius:20,border:`1px solid ${sel?'var(--red)':'var(--grayM)'}`,background:sel?'var(--redL)':'#fff',color:sel?'var(--red)':'var(--textL)',fontSize:11,cursor:'pointer',fontFamily:'inherit',fontWeight:sel?700:400}}>{sel&&'✓ '}{std}</button>
                          })}
                        </div>
                      </div>
                      <div className="g2">
                        <div><label className="f-label">Security requirements from RFP</label><textarea rows={6} value={currentPartData.sec_requirements||''} onChange={e=>updatePartData('C','sec_requirements',e.target.value)} placeholder="Specific security requirements from the RFP..." className="content-area" /></div>
                        <div><label className="f-label">emaratech security approach</label><textarea rows={6} value={currentPartData.sec_approach||''} onChange={e=>updatePartData('C','sec_approach',e.target.value)} placeholder="How emaratech will address security requirements..." className="content-area" /></div>
                      </div>
                    </div>
                  )}

                  {/* PART D */}
                  {activePart==='D'&&(
                    <div style={{display:'flex',flexDirection:'column',gap:16}}>
                      <div className="g4">
                        <div><label className="f-label">Sprint length</label><select value={currentPartData.sprint_length||'2 weeks'} onChange={e=>updatePartData('D','sprint_length',e.target.value)}><option>1 week</option><option>2 weeks</option><option>3 weeks</option><option>4 weeks</option></select></div>
                        <div><label className="f-label">Team size</label><input type="number" value={currentPartData.team_size||''} onChange={e=>updatePartData('D','team_size',e.target.value)} placeholder="e.g. 8" /></div>
                        <div><label className="f-label">Number of sprints</label><input type="number" value={currentPartData.num_sprints||''} onChange={e=>updatePartData('D','num_sprints',e.target.value)} placeholder="e.g. 8" /></div>
                        <div><label className="f-label">Hypercare period</label><input type="text" value={currentPartData.hypercare||''} onChange={e=>updatePartData('D','hypercare',e.target.value)} placeholder="e.g. 4 weeks" /></div>
                      </div>
                      <div>
                        <label className="f-label">Key milestones</label>
                        <div style={{marginBottom:6,display:'flex',flexWrap:'wrap',gap:6}}>
                          {(currentPartData.milestones||[]).map((m: string,i: number)=>(
                            <span key={i} style={{background:'var(--off)',border:'1px solid var(--bright)',borderRadius:20,padding:'4px 10px',fontSize:11,display:'flex',alignItems:'center',gap:6}}>
                              {m}<button onClick={()=>updatePartData('D','milestones',(currentPartData.milestones||[]).filter((_:any,j:number)=>j!==i))} style={{background:'none',border:'none',cursor:'pointer',color:'var(--grayB)',fontSize:12,lineHeight:1}}>✕</button>
                            </span>
                          ))}
                        </div>
                        <div style={{display:'flex',gap:8}}>
                          <input type="text" id="ms-input" placeholder="Add milestone and press Enter..." style={{flex:1,padding:'7px 12px',borderRadius:8,border:'1px solid var(--grayM)',fontSize:12,background:'var(--grayL)',fontFamily:'inherit',outline:'none'}}
                            onKeyDown={e=>{if(e.key==='Enter'){const v=(e.target as HTMLInputElement).value.trim();if(v){updatePartData('D','milestones',[...(currentPartData.milestones||[]),v]);(e.target as HTMLInputElement).value=''}}}} />
                          <button className="btn-second btn-small" onClick={()=>{const el=document.getElementById('ms-input') as HTMLInputElement;const v=el.value.trim();if(v){updatePartData('D','milestones',[...(currentPartData.milestones||[]),v]);el.value=''}}}>Add</button>
                        </div>
                      </div>
                      <div className="g2">
                        <div><label className="f-label">Delivery constraints</label><textarea rows={5} value={currentPartData.delivery_constraints||''} onChange={e=>updatePartData('D','delivery_constraints',e.target.value)} placeholder="Timeline constraints, fixed milestones, client availability..." className="content-area" /></div>
                        <div><label className="f-label">Governance requirements</label><textarea rows={5} value={currentPartData.governance_notes||''} onChange={e=>updatePartData('D','governance_notes',e.target.value)} placeholder="Steering committee, reporting frequency, approval processes..." className="content-area" /></div>
                      </div>
                    </div>
                  )}

                  {/* PART E */}
                  {activePart==='E'&&(
                    <div style={{display:'flex',flexDirection:'column',gap:16}}>
                      <div>
                        <label className="f-label">Recommended support package</label>
                        <div style={{display:'flex',gap:8,marginTop:6}}>
                          {SUPPORT_PACKAGES.map(pkg=>{
                            const sel=currentPartData.package===pkg
                            return <button key={pkg} onClick={()=>updatePartData('E','package',pkg)} style={{flex:1,padding:12,borderRadius:10,border:`1.5px solid ${sel?'var(--bright)':'var(--grayM)'}`,background:sel?'var(--off)':'#fff',cursor:'pointer',fontFamily:'inherit',textAlign:'center' as const}}>
                              <div style={{fontSize:12,fontWeight:700,color:sel?'var(--dark)':'var(--textL)',marginBottom:3}}>{pkg.split(' — ')[0]}</div>
                              <div style={{fontSize:10,color:'var(--textL)'}}>{pkg.split(' — ')[1]}</div>
                            </button>
                          })}
                        </div>
                      </div>
                      <div className="g2">
                        <div><label className="f-label">SLA requirements from RFP</label><textarea rows={5} value={currentPartData.sla_requirements||''} onChange={e=>updatePartData('E','sla_requirements',e.target.value)} placeholder="Response times, uptime, penalties stated in RFP..." className="content-area" /></div>
                        <div><label className="f-label">Support notes</label><textarea rows={5} value={currentPartData.support_notes||''} onChange={e=>updatePartData('E','support_notes',e.target.value)} placeholder="Specific support requirements for this engagement..." className="content-area" /></div>
                      </div>
                    </div>
                  )}

                  {/* PART F */}
                  {activePart==='F'&&(
                    <div style={{display:'flex',flexDirection:'column',gap:16}}>
                      <div className="g2">
                        <div><label className="f-label">Relevant references for this deal</label><textarea rows={5} value={currentPartData.references||''} onChange={e=>updatePartData('F','references',e.target.value)} placeholder="Past projects most relevant to this opportunity..." className="content-area" /></div>
                        <div><label className="f-label">Team members to highlight</label><textarea rows={5} value={currentPartData.team_notes||''} onChange={e=>updatePartData('F','team_notes',e.target.value)} placeholder="Key team members and their specific experience for this RFP..." className="content-area" /></div>
                      </div>
                      <div><label className="f-label">Specific credentials to mention</label><textarea rows={3} value={currentPartData.credentials||''} onChange={e=>updatePartData('F','credentials',e.target.value)} placeholder="Certifications, awards, partnerships relevant to this client..." className="content-area" /></div>
                      <div><label className="f-label">Differentiators for this specific deal</label><textarea rows={4} value={currentPartData.deal_differentiators||''} onChange={e=>updatePartData('F','deal_differentiators',e.target.value)} placeholder="Why emaratech specifically for this client and project..." className="content-area" /></div>
                    </div>
                  )}

                  {/* Save bar */}
                  <div style={{display:'flex',alignItems:'center',gap:10,marginTop:20,paddingTop:16,borderTop:'1px solid var(--grayM)'}}>
                    <button className="btn-primary" onClick={()=>savePart(activePart,true)} disabled={saving}>{saving?'Saving...':partsComplete[activePart]?'✓ Saved and complete':'Save and mark complete'}</button>
                    <button className="btn-second" onClick={()=>savePart(activePart,false)} disabled={saving}>Save draft</button>
                    {saved&&<span style={{fontSize:12,color:'var(--green)',fontWeight:600}}>✓ Saved</span>}
                    {partsComplete[activePart]&&<button className="btn-second btn-small" onClick={()=>{setPartsComplete(p=>({...p,[activePart]:false}));savePart(activePart,false)}} style={{marginLeft:'auto',color:'var(--amber)'}}>Reopen for editing</button>}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── COMPLIANCE SIDEBAR ── */}
        {/* Collapsed indicator - always visible in Stage 1 */}
        {stage==='inputs'&&!complianceOpen&&complianceItems.length>0&&(
          <button onClick={()=>setComplianceOpen(true)}
            style={{position:'fixed',right:0,top:'50%',transform:'translateY(-50%)',background:'var(--dark)',border:'none',borderRadius:'8px 0 0 8px',padding:'12px 8px',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:6,zIndex:50}}>
            <span style={{fontSize:9,color:'var(--bright)',fontWeight:700,writingMode:'vertical-rl',textOrientation:'mixed',letterSpacing:1}}>COMPLIANCE</span>
            <div style={{display:'flex',flexDirection:'column',gap:3}}>
              {counts.green>0&&<span style={{fontSize:10,fontWeight:700,color:'var(--bright)'}}>🟢{counts.green}</span>}
              {counts.amber>0&&<span style={{fontSize:10,fontWeight:700,color:'var(--amber)'}}>🟡{counts.amber}</span>}
              {counts.red>0&&<span style={{fontSize:10,fontWeight:700,color:'var(--red)'}}>🔴{counts.red}</span>}
            </div>
          </button>
        )}

        {/* Expanded compliance panel */}
        {complianceOpen&&(
          <div style={{position:'fixed',top:0,right:0,bottom:0,width:400,background:'#fff',borderLeft:'1px solid var(--grayM)',boxShadow:'-4px 0 20px rgba(0,0,0,.1)',zIndex:100,display:'flex',flexDirection:'column',overflow:'hidden'}}>
            <div style={{padding:'14px 16px',background:'var(--dark)',display:'flex',alignItems:'center',gap:10}}>
              <div style={{flex:1}}>
                <div style={{color:'#fff',fontWeight:700,fontSize:13}}>Compliance tracking</div>
                <div style={{color:'rgba(255,255,255,.5)',fontSize:10}}>{counts.green} addressed · {counts.amber} partial · {counts.red} not started</div>
              </div>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <span style={{fontSize:18}}>🟢{counts.green}</span>
                <span style={{fontSize:18}}>🟡{counts.amber}</span>
                <span style={{fontSize:18}}>🔴{counts.red}</span>
              </div>
              <button onClick={()=>setComplianceOpen(false)} style={{background:'none',border:'none',color:'rgba(255,255,255,.6)',cursor:'pointer',fontSize:20}}>✕</button>
            </div>

            {/* Filter tabs */}
            <div style={{display:'flex',borderBottom:'1px solid var(--grayM)'}}>
              {['all','not_started','addressed','partial'].map(f=>(
                <button key={f} onClick={()=>setComplianceFilter(f)}
                  style={{flex:1,padding:'9px 6px',border:'none',borderBottom:`2px solid ${complianceFilter===f?'var(--bright)':'transparent'}`,background:'transparent',cursor:'pointer',fontFamily:'inherit',fontSize:10,fontWeight:complianceFilter===f?700:400,color:complianceFilter===f?'var(--dark)':'var(--textL)'}}>
                  {f==='all'?'All':f==='not_started'?'Not started':f==='addressed'?'Addressed':'Partial'}
                </button>
              ))}
            </div>

            <div style={{flex:1,overflowY:'auto',padding:12,display:'flex',flexDirection:'column',gap:6}}>
              {complianceItems
                .filter(item => complianceFilter==='all' || item.stage1_status===complianceFilter)
                .map(item => {
                  const statusColor = item.stage1_status==='addressed'?'var(--green)':item.stage1_status==='partial'?'var(--amber)':'var(--grayB)'
                  const statusBg = item.stage1_status==='addressed'?'var(--greenL)':item.stage1_status==='partial'?'var(--amberL)':'var(--grayL)'
                  return (
                    <div key={item.ref} style={{border:'1px solid var(--grayM)',borderLeft:`3px solid ${statusColor}`,borderRadius:'0 8px 8px 0',padding:'10px 12px',background:statusBg}}>
                      <div style={{display:'flex',alignItems:'flex-start',gap:8,marginBottom:4}}>
                        <span style={{fontSize:10,fontWeight:700,color:statusColor,flexShrink:0,marginTop:1}}>{item.ref}</span>
                        <span style={{fontSize:11,lineHeight:1.5,color:'var(--text)',flex:1}}>{item.requirement}</span>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:6,marginTop:6}}>
                        <span style={{fontSize:9,padding:'2px 8px',borderRadius:20,background:item.priority==='Must'?'var(--redL)':'var(--amberL)',color:item.priority==='Must'?'var(--red)':'var(--amber)',fontWeight:700}}>{item.priority}</span>
                        <span style={{fontSize:9,color:'var(--textL)',background:'#fff',border:'1px solid var(--grayM)',padding:'2px 8px',borderRadius:20}}>{item.type}</span>
                        <select value={item.stage1_status} onChange={e=>updateComplianceItem(item.ref,'stage1_status',e.target.value)}
                          style={{marginLeft:'auto',fontSize:10,padding:'2px 6px',borderRadius:4,border:'1px solid var(--grayM)',background:'#fff',fontFamily:'inherit',cursor:'pointer'}}>
                          <option value="not_started">Not started</option>
                          <option value="partial">Partial</option>
                          <option value="addressed">Addressed</option>
                        </select>
                      </div>
                    </div>
                  )
                })}
            </div>
            <div style={{padding:12,borderTop:'1px solid var(--grayM)'}}>
              <button className="btn-primary" style={{width:'100%'}} onClick={()=>patchProposal('compliance_items',complianceItems)}>Save compliance status</button>
            </div>
          </div>
        )}

        {/* ── DICTIONARY PANEL ── */}
        {dictOpen&&(
          <div style={{position:'fixed',top:0,right:0,bottom:0,width:420,background:'#fff',borderLeft:'1px solid var(--grayM)',boxShadow:'-4px 0 20px rgba(0,0,0,.1)',zIndex:200,display:'flex',flexDirection:'column'}}>
            <div style={{padding:'16px 20px',background:'var(--dark)',display:'flex',alignItems:'center',gap:10}}>
              <span style={{fontSize:16}}>📚</span>
              <div style={{flex:1,color:'#fff',fontWeight:700,fontSize:14}}>Dictionary — Part {activePart}</div>
              <button onClick={()=>setDictOpen(false)} style={{background:'none',border:'none',color:'rgba(255,255,255,.6)',cursor:'pointer',fontSize:20}}>✕</button>
            </div>
            {dictLoading?(<div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center'}}><div className="spinner"/></div>):(
              <>
                <div style={{display:'flex',gap:0,borderBottom:'1px solid var(--grayM)',overflowX:'auto'}}>
                  {dictCategories.map(cat=>(
                    <button key={cat} onClick={()=>setDictCat(cat)} style={{padding:'10px 14px',border:'none',borderBottom:`2px solid ${dictCat===cat?'var(--bright)':'transparent'}`,background:'transparent',cursor:'pointer',fontFamily:'inherit',fontSize:11,fontWeight:dictCat===cat?700:400,color:dictCat===cat?'var(--dark)':'var(--textL)',whiteSpace:'nowrap'}}>{cat}</button>
                  ))}
                </div>
                <div style={{flex:1,overflowY:'auto',padding:16}}>
                  {(dictData[activePart]?.[dictCat]||[]).map((block: any)=>(
                    <div key={block.id} style={{border:'1px solid var(--grayM)',borderRadius:10,marginBottom:10,overflow:'hidden'}}>
                      <div style={{padding:'10px 14px',background:'var(--grayL)',display:'flex',alignItems:'center',gap:8}}>
                        <span style={{background:block.type==='clause'?'var(--amberL)':'var(--off)',color:block.type==='clause'?'var(--amber)':'var(--textL)',border:`1px solid ${block.type==='clause'?'#FAC775':'var(--grayM)'}`,padding:'2px 8px',borderRadius:20,fontSize:9,fontWeight:700}}>{block.type}</span>
                        <span style={{fontSize:12,fontWeight:600,color:'var(--dark)',flex:1}}>{block.title}</span>
                      </div>
                      <div style={{padding:'10px 14px'}}>
                        <div style={{fontSize:11,color:'var(--textM)',lineHeight:1.6,marginBottom:10}}>{block.content.slice(0,200)}{block.content.length>200?'...':''}</div>
                        <button className="btn-second btn-small" onClick={()=>insertBlock(block.content)}>Insert →</button>
                      </div>
                    </div>
                  ))}
                  {!dictCategories.length&&<div style={{textAlign:'center',color:'var(--grayB)',fontSize:12,marginTop:40}}>No content blocks for Part {activePart} yet</div>}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── CHAT BUBBLE ── */}
        {!chatOpen&&stage==='inputs'&&(
          <button onClick={()=>setChatOpen(true)} style={{position:'fixed',bottom:24,right:complianceOpen?424:24,width:52,height:52,borderRadius:'50%',background:'var(--dark)',border:'2px solid var(--bright)',color:'var(--bright)',fontSize:20,cursor:'pointer',boxShadow:'0 4px 20px rgba(0,0,0,.2)',zIndex:150,display:'flex',alignItems:'center',justifyContent:'center',transition:'right .3s'}}>💬</button>
        )}

        {/* ── CHAT PANEL ── */}
        {chatOpen&&(
          <div style={{position:'fixed',bottom:24,right:complianceOpen?424:24,width:380,height:500,background:'#fff',borderRadius:16,boxShadow:'0 8px 40px rgba(0,0,0,.2)',border:'1px solid var(--grayM)',zIndex:200,display:'flex',flexDirection:'column',overflow:'hidden',transition:'right .3s'}}>
            <div style={{padding:'12px 16px',background:'var(--dark)',display:'flex',alignItems:'center',gap:10}}>
              <span style={{fontSize:16}}>💬</span>
              <div style={{flex:1}}><div style={{color:'#fff',fontWeight:700,fontSize:13}}>AI Chat — Part {activePart}</div><div style={{color:'rgba(255,255,255,.5)',fontSize:10}}>{PART_LABELS[activePart]}</div></div>
              <button onClick={()=>setChatOpen(false)} style={{background:'none',border:'none',color:'rgba(255,255,255,.6)',cursor:'pointer',fontSize:18}}>✕</button>
            </div>
            <div style={{flex:1,overflowY:'auto',padding:12,display:'flex',flexDirection:'column',gap:8}}>
              {currentChatHistory.length===0&&(
                <div style={{textAlign:'center',color:'var(--grayB)',fontSize:11,marginTop:20}}>
                  <div style={{fontSize:24,marginBottom:8}}>🤖</div>
                  Ask me to review your inputs, suggest improvements, or help write specific sections.
                </div>
              )}
              {currentChatHistory.map((msg,i)=>(
                <div key={i} style={{display:'flex',justifyContent:msg.role==='user'?'flex-end':'flex-start'}}>
                  <div style={{maxWidth:'85%',padding:'8px 12px',borderRadius:msg.role==='user'?'12px 12px 2px 12px':'12px 12px 12px 2px',background:msg.role==='user'?'var(--dark)':'var(--grayL)',color:msg.role==='user'?'#fff':'var(--text)',fontSize:12,lineHeight:1.6,whiteSpace:'pre-wrap'}}>{msg.content}</div>
                </div>
              ))}
              {chatLoading&&<div style={{display:'flex',justifyContent:'flex-start'}}><div style={{padding:'8px 14px',borderRadius:'12px 12px 12px 2px',background:'var(--grayL)',display:'flex',gap:4,alignItems:'center'}}>
                <div style={{width:6,height:6,borderRadius:'50%',background:'var(--grayB)',animation:'bounce .8s infinite'}} />
                <div style={{width:6,height:6,borderRadius:'50%',background:'var(--grayB)',animation:'bounce .8s .1s infinite'}} />
                <div style={{width:6,height:6,borderRadius:'50%',background:'var(--grayB)',animation:'bounce .8s .2s infinite'}} />
              </div></div>}
              <div ref={chatEndRef} />
            </div>
            <div style={{padding:'8px 12px',borderTop:'1px solid var(--grayM)',display:'flex',gap:8}}>
              <input type="text" value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&sendChat()} placeholder={`Ask about Part ${activePart}...`} style={{flex:1,padding:'8px 12px',borderRadius:8,border:'1px solid var(--grayM)',fontSize:12,fontFamily:'inherit',background:'var(--grayL)',outline:'none'}} />
              <button onClick={sendChat} disabled={chatLoading||!chatInput.trim()} className="btn-primary btn-small">Send</button>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-5px)}}`}</style>
    </>
  )
}
