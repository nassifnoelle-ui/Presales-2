'use client'
import { useState, useRef } from 'react'
import Topbar from '@/components/Topbar'
import { useRouter } from 'next/navigation'

export default function QualifyPage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [apiKey, setApiKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [fileLoading, setFileLoading] = useState(false)
  const [error, setError] = useState('')
  const [fileName, setFileName] = useState('')
  const [rfpText, setRfpText] = useState('')
  const [oppName, setOppName] = useState('')
  const [client, setClient] = useState('')
  const [ref, setRef] = useState('')
  const [sector, setSector] = useState('')
  const [value, setValue] = useState('')
  const [submissionDate, setSubmissionDate] = useState('')
  const [analysis, setAnalysis] = useState<any>(null)
  const [overrides, setOverrides] = useState<Record<string, number>>({})
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [creating, setCreating] = useState(false)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name); setFileLoading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/parse-file', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setRfpText(data.text)
    } catch (e: any) { setError(e.message); setFileName('') }
    finally { setFileLoading(false) }
  }

  async function runAnalysis() {
    if (!rfpText.trim()) return setError('Please upload a file or paste RFP text.')
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rfp_text: rfpText, client, ref, sector, estimated_value: value, api_key: apiKey }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setAnalysis(data.analysis)
      setOverrides({})
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  function computeScore() {
    if (!analysis) return { total: 0 }
    let total = 0
    analysis.scorecard.criteria.forEach((c: any) => {
      const key = c.category + '-' + c.criterion
      const score = overrides[key] !== undefined ? overrides[key] : c.score
      total += (score / 5) * c.weight
    })
    return { total: Math.round(total) }
  }

  const { total } = computeScore()

  function scoreColor(s: number) {
    if (s >= 4) return 'var(--green)'
    if (s >= 3) return 'var(--amber)'
    return 'var(--red)'
  }

  async function createProposalAndGo() {
    setCreating(true)
    try {
      const res = await fetch('/api/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client, ref, project: oppName, sector, value, submission_date: submissionDate, rfp_text: rfpText }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      router.push('/proposals/' + data.id)
    } catch (e: any) { setError(e.message) }
    finally { setCreating(false) }
  }

  return (
    <>
      <Topbar />
      <div className="main">
        {error && <div className="error-bar">⚠ {error}<button onClick={()=>setError('')} style={{marginLeft:'auto',background:'none',border:'none',color:'var(--red)',cursor:'pointer',fontSize:16}}>✕</button></div>}

        <div className="card">
          <div className="card-title">RFP qualification</div>
          <div className="g3" style={{ marginBottom:12 }}>
            <div><label className="f-label">Opportunity name</label><input type="text" value={oppName} onChange={e=>setOppName(e.target.value)} placeholder="e.g. Ministry Portal Redevelopment" /></div>
            <div><label className="f-label">Client name</label><input type="text" value={client} onChange={e=>setClient(e.target.value)} placeholder="e.g. Ministry of Finance" /></div>
            <div><label className="f-label">RFP reference</label><input type="text" value={ref} onChange={e=>setRef(e.target.value)} placeholder="e.g. MOF-IT-2026-001" /></div>
          </div>
          <div className="g3" style={{ marginBottom:12 }}>
            <div><label className="f-label">Sector</label><input type="text" value={sector} onChange={e=>setSector(e.target.value)} placeholder="e.g. UAE Federal Government" /></div>
            <div><label className="f-label">Estimated value (AED)</label><input type="text" value={value} onChange={e=>setValue(e.target.value)} placeholder="e.g. 1,200,000" /></div>
            <div><label className="f-label">Submission date</label><input type="date" value={submissionDate} onChange={e=>setSubmissionDate(e.target.value)} /></div>
          </div>
          <div style={{ marginBottom:12 }}>
            <label className="f-label">API key <span style={{color:'var(--grayB)',fontWeight:400}}>(if not on server)</span></label>
            <input type="password" value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder="sk-ant-api03-..." />
          </div>
          <div style={{ marginBottom:12 }}>
            <label className="f-label">Upload RFP document</label>
            <label style={{ display:'block' }}>
              <div className={`upload-zone ${fileName ? 'has-file' : ''}`}>
                {fileLoading ? <div style={{display:'flex',alignItems:'center',gap:8,justifyContent:'center'}}><div className="spinner" /><span style={{color:'var(--textL)'}}>Reading file...</span></div>
                : fileName ? <div style={{color:'var(--green)',fontWeight:600}}>✓ {fileName} <button onClick={e=>{e.preventDefault();setFileName('');setRfpText('')}} style={{marginLeft:8,background:'none',border:'none',color:'var(--red)',cursor:'pointer'}}>Remove</button></div>
                : <><div style={{fontSize:13,color:'var(--textL)',marginBottom:4}}>Click to upload RFP file</div><div style={{fontSize:11,color:'var(--grayB)'}}>PDF · Word (.docx) · Excel (.xlsx) · Text</div></>}
              </div>
              <input type="file" accept=".pdf,.docx,.xlsx,.txt,.md,.csv" style={{display:'none'}} onChange={handleFile} />
            </label>
          </div>
          {!fileName && <div style={{marginBottom:14}}><label className="f-label">Or paste RFP text</label><textarea rows={6} value={rfpText} onChange={e=>setRfpText(e.target.value)} placeholder="Paste the full RFP text here..." /></div>}
          <div className="row-btns">
            <button className="btn-primary" onClick={runAnalysis} disabled={loading}>{loading ? 'Analysing...' : 'Run AI qualification'}</button>
            {loading && <div className="spinner" />}
          </div>
        </div>

        {analysis && (
          <>
            <div className="metric-row">
              <div className="metric"><div className="m-label">Weighted score</div><div className="m-val" style={{color:scoreColor(total/20)}}>{total}%</div><div className="m-sub">Threshold ≥80% = Proceed</div></div>
              <div className="metric"><div className="m-label">Decision</div><div style={{marginTop:6}}><span className={`pill ${total>=80?'pill-green':total>=60?'pill-amber':'pill-red'}`}>{total>=80?'Proceed':total>=60?'Proceed with caution':'Reject'}</span></div></div>
              <div className="metric"><div className="m-label">Risk flags</div><div className="m-val">{(analysis.scorecard.risk_flags||[]).length}</div></div>
              <div className="metric"><div className="m-label">Deadline</div><div className="m-val" style={{fontSize:15}}>{analysis.summary.deadline||'TBD'}</div></div>
            </div>

            <div className="callout">{analysis.scorecard.rationale}</div>
            {(analysis.scorecard.risk_flags||[]).map((f: string, i: number) => <div key={i} className="callout callout-amber">⚠ {f}</div>)}

            <div className="card">
              <div className="card-title">Category averages</div>
              {(analysis.scorecard.category_averages||[]).map((cat: any) => (
                <div key={cat.name} style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                  <span style={{fontSize:11,color:'var(--textL)',width:160,flexShrink:0}}>{cat.name}</span>
                  <div className="score-bar-bg"><div className="score-bar-fill" style={{width:`${(cat.avg/5)*100}%`,background:scoreColor(cat.avg)}} /></div>
                  <span style={{fontSize:12,fontWeight:700,width:30,textAlign:'right',color:scoreColor(cat.avg)}}>{cat.avg.toFixed(1)}</span>
                  <span style={{fontSize:10,color:'var(--grayB)',width:35}}>{cat.weight}%</span>
                </div>
              ))}
            </div>

            <div className="card">
              <div className="card-title">24 criteria — click to expand and override</div>
              {(analysis.scorecard.criteria||[]).map((c: any) => {
                const key = c.category+'-'+c.criterion
                const cur = overrides[key]!==undefined ? overrides[key] : c.score
                const isExp = expanded.has(key)
                return (
                  <div key={key} className="criterion-row">
                    <div className="criterion-header" onClick={()=>{const n=new Set(expanded);isExp?n.delete(key):n.add(key);setExpanded(n)}}>
                      <div style={{width:28,height:28,borderRadius:6,background:scoreColor(cur)+'22',color:scoreColor(cur),display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:700,flexShrink:0}}>{cur}</div>
                      <span style={{flex:1,fontSize:12,fontWeight:600}}>{c.criterion}</span>
                      <span style={{fontSize:10,color:'var(--grayB)'}}>{c.category.split(' ')[0]} · {c.weight}%</span>
                      {overrides[key]!==undefined && <span className="pill pill-amber" style={{fontSize:9}}>Overridden</span>}
                      <span style={{color:'var(--grayB)',transform:isExp?'rotate(90deg)':'',transition:'transform .2s'}}>›</span>
                    </div>
                    {isExp && (
                      <div className="criterion-body open">
                        <div style={{fontSize:12,color:'var(--text)',marginBottom:12,lineHeight:1.6}}>{c.comment}</div>
                        <div style={{background:'#fff',border:'1px solid var(--grayM)',borderRadius:8,padding:12}}>
                          <div style={{fontSize:10,fontWeight:700,color:'var(--textL)',textTransform:'uppercase',marginBottom:8}}>Override score</div>
                          <div style={{display:'flex',alignItems:'center',gap:12}}>
                            <span style={{fontSize:12,color:'var(--textL)',width:80}}>Score: <strong style={{color:scoreColor(cur)}}>{cur}/5</strong></span>
                            <input type="range" min={1} max={5} step={1} value={cur} style={{flex:1,accentColor:scoreColor(cur)}} onChange={e=>setOverrides(p=>({...p,[key]:parseInt(e.target.value)}))} />
                            {overrides[key]!==undefined && <button className="btn-second btn-small" onClick={()=>setOverrides(p=>{const n={...p};delete n[key];return n})}>Reset ({c.score})</button>}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="card">
              <div className="card-title">Requirements extracted</div>
              <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                {(analysis.summary.key_requirements||[]).map((r: string, i: number) => <span key={i} className="pill pill-teal">{r}</span>)}
              </div>
            </div>

            <div className="row-btns">
              <button className="btn-success" onClick={createProposalAndGo} disabled={creating}>
                {creating ? 'Creating proposal...' : 'Approved — create proposal →'}
              </button>
              <button className="btn-danger">Flag as no-go</button>
            </div>
          </>
        )}
      </div>
    </>
  )
}
