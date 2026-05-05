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
  const [analysis, setAnalysis] = useState<any>(null)
  const [overrides, setOverrides] = useState<Record<string, number>>({})
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setFileLoading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/parse-file', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setRfpText(data.text)
    } catch (e: any) {
      setError(e.message)
      setFileName('')
    } finally {
      setFileLoading(false)
    }
  }

  async function runAnalysis() {
    if (!rfpText.trim() && !fileName) return setError('Please upload a file or paste RFP text.')
    if (!rfpText.trim()) return setError('Please paste RFP text or upload a file.')
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
    if (!analysis) return { total: 0, decision: 'Pending' }
    let total = 0
    analysis.scorecard.criteria.forEach((c: any) => {
      const key = c.category + '-' + c.criterion
      const score = overrides[key] !== undefined ? overrides[key] : c.score
      total += (score / 5) * c.weight
    })
    const rounded = Math.round(total)
    return { total: rounded, decision: rounded >= 80 ? 'Proceed' : rounded >= 60 ? 'Proceed with Caution' : 'Reject' }
  }

  const { total, decision } = computeScore()

  function scoreColor(s: number) {
    if (s >= 4) return 'var(--green)'
    if (s >= 3) return 'var(--amber)'
    return 'var(--red)'
  }

  function decisionPill(d: string) {
    if (d === 'Proceed') return 'pill-green'
    if (d === 'Reject') return 'pill-red'
    return 'pill-amber'
  }

  function proceedToProposal() {
    const params = new URLSearchParams({
      client, ref, project: oppName, value, rfp: rfpText.slice(0, 5000), api_key: apiKey
    })
    router.push('/proposal?' + params.toString())
  }

  return (
    <>
      <Topbar title={oppName || undefined} />
      <div className="main">

        {error && (
          <div className="error-bar">⚠ {error}
            <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 16 }}>✕</button>
          </div>
        )}

        <div className="card">
          <div className="card-title">Step 1 — Discovery and requirement capture</div>
          <div className="g3" style={{ marginBottom: 12 }}>
            <div><label className="f-label">Opportunity name</label><input type="text" value={oppName} onChange={e => setOppName(e.target.value)} placeholder="e.g. Ministry Portal Redevelopment" /></div>
            <div><label className="f-label">Client name</label><input type="text" value={client} onChange={e => setClient(e.target.value)} placeholder="e.g. Ministry of Finance" /></div>
            <div><label className="f-label">RFP reference</label><input type="text" value={ref} onChange={e => setRef(e.target.value)} placeholder="e.g. MOF-IT-2026-001" /></div>
          </div>
          {!process.env.NEXT_PUBLIC_HAS_KEY && (
          <div style={{ marginBottom: 12 }}>
            <label className="f-label">Anthropic API key <span style={{color:'var(--grayB)',fontWeight:400}}>(only needed if not configured on server)</span></label>
            <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="sk-ant-api03-..." />
            <div className="f-hint">Stays in your browser session only</div>
          </div>
          )}
          <div className="g3" style={{ marginBottom: 14 }}>
            <div><label className="f-label">Client sector</label><input type="text" value={sector} onChange={e => setSector(e.target.value)} placeholder="e.g. UAE Federal Government" /></div>
            <div><label className="f-label">Estimated value (AED)</label><input type="text" value={value} onChange={e => setValue(e.target.value)} placeholder="e.g. 1,200,000" /></div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label className="f-label">Upload RFP document</label>
            <div className={`upload-zone ${fileName ? 'has-file' : ''}`} onClick={() => fileRef.current?.click()}>
              {fileLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                  <div className="spinner" /> <span style={{ color: 'var(--textL)' }}>Reading file...</span>
                </div>
              ) : fileName ? (
                <div style={{ color: 'var(--green)', fontWeight: 600 }}>✓ {fileName} <button onClick={e => { e.stopPropagation(); setFileName(''); setRfpText('') }} style={{ marginLeft: 8, background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer' }}>Remove</button></div>
              ) : (
                <>
                  <div style={{ fontSize: 13, color: 'var(--textL)', marginBottom: 4 }}>Click to upload RFP file</div>
                  <div style={{ fontSize: 11, color: 'var(--grayB)' }}>PDF · Word (.docx) · Excel (.xlsx) · Text</div>
                </>
              )}
              <input ref={fileRef} type="file" accept=".pdf,.docx,.xlsx,.txt,.md,.csv" style={{ display: 'none' }} onChange={handleFile} />
            </div>
          </div>

          {!fileName && (
            <div style={{ marginBottom: 14 }}>
              <label className="f-label">Or paste RFP text</label>
              <textarea rows={6} value={rfpText} onChange={e => setRfpText(e.target.value)} placeholder="Paste the full RFP scope, requirements, and evaluation criteria here..." />
            </div>
          )}

          <div className="row-btns">
            <button className="btn-primary" onClick={runAnalysis} disabled={loading}>
              {loading ? 'Analysing...' : 'Run AI qualification'}
            </button>
            {loading && <div className="spinner" />}
            <span style={{ fontSize: 11, color: 'var(--grayB)' }}>Scores 24 criteria · extracts requirements · flags risks</span>
          </div>
        </div>

        {analysis && (
          <>
            <div className="metric-row">
              <div className="metric">
                <div className="m-label">Weighted score</div>
                <div className="m-val" style={{ color: scoreColor(total / 20) }}>{total}%</div>
                <div className="m-sub">Threshold ≥80% = Proceed</div>
              </div>
              <div className="metric">
                <div className="m-label">Decision</div>
                <div style={{ marginTop: 6 }}><span className={`pill ${decisionPill(decision)}`}>{decision}</span></div>
                <div className="m-sub">{overrides && Object.keys(overrides).length > 0 ? `${Object.keys(overrides).length} scores overridden` : 'AI scores'}</div>
              </div>
              <div className="metric">
                <div className="m-label">Risk flags</div>
                <div className="m-val">{(analysis.scorecard.risk_flags || []).length}</div>
                <div className="m-sub">Identified</div>
              </div>
              <div className="metric">
                <div className="m-label">Deadline</div>
                <div className="m-val" style={{ fontSize: 15 }}>{analysis.summary.deadline}</div>
                <div className="m-sub">{analysis.summary.est_value}</div>
              </div>
            </div>

            <div className="callout">{analysis.scorecard.rationale}</div>

            {(analysis.scorecard.risk_flags || []).map((f: string, i: number) => (
              <div key={i} className="callout callout-amber">⚠ {f}</div>
            ))}

            <div className="card">
              <div className="card-title">Category averages</div>
              {(analysis.scorecard.category_averages || []).map((cat: any) => (
                <div key={cat.name} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 11, color: 'var(--textL)', width: 160, flexShrink: 0 }}>{cat.name}</span>
                  <div className="score-bar-bg">
                    <div className="score-bar-fill" style={{ width: `${(cat.avg / 5) * 100}%`, background: scoreColor(cat.avg) }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, width: 30, textAlign: 'right', color: scoreColor(cat.avg) }}>{cat.avg.toFixed(1)}</span>
                  <span style={{ fontSize: 10, color: 'var(--grayB)', width: 35 }}>{cat.weight}%</span>
                </div>
              ))}
            </div>

            <div className="card">
              <div className="card-title">24 criteria — click to expand and override</div>
              {(analysis.scorecard.criteria || []).map((c: any) => {
                const key = c.category + '-' + c.criterion
                const cur = overrides[key] !== undefined ? overrides[key] : c.score
                const isOverridden = overrides[key] !== undefined
                const isExp = expanded.has(key)
                return (
                  <div key={key} className="criterion-row">
                    <div className="criterion-header" onClick={() => {
                      const next = new Set(expanded)
                      isExp ? next.delete(key) : next.add(key)
                      setExpanded(next)
                    }}>
                      <div style={{ width: 28, height: 28, borderRadius: 6, background: scoreColor(cur) + '22', color: scoreColor(cur), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>{cur}</div>
                      <span style={{ flex: 1, fontSize: 12, fontWeight: 600 }}>{c.criterion}</span>
                      <span style={{ fontSize: 10, color: 'var(--grayB)' }}>{c.category.split(' ')[0]} · {c.weight}%</span>
                      {isOverridden && <span className="pill pill-amber" style={{ fontSize: 9 }}>Overridden</span>}
                      <span style={{ color: 'var(--grayB)', transform: isExp ? 'rotate(90deg)' : '', transition: 'transform .2s' }}>›</span>
                    </div>
                    {isExp && (
                      <div className="criterion-body open">
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--textM)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.05em' }}>AI reasoning</div>
                        <div style={{ fontSize: 12, color: 'var(--text)', marginBottom: 12, lineHeight: 1.6 }}>{c.comment}</div>
                        <div style={{ background: '#fff', border: '1px solid var(--grayM)', borderRadius: 8, padding: 12 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--textL)', textTransform: 'uppercase', marginBottom: 8 }}>Override score (optional)</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span style={{ fontSize: 12, color: 'var(--textL)', width: 80 }}>Score: <strong style={{ color: scoreColor(cur) }}>{cur}/5</strong></span>
                            <input type="range" min={1} max={5} step={1} value={cur} style={{ flex: 1, accentColor: scoreColor(cur) }}
                              onChange={e => setOverrides(prev => ({ ...prev, [key]: parseInt(e.target.value) }))} />
                            {isOverridden && (
                              <button className="btn-second btn-small" onClick={() => setOverrides(prev => { const n = { ...prev }; delete n[key]; return n })}>
                                Reset to AI ({c.score})
                              </button>
                            )}
                          </div>
                          {isOverridden && <div style={{ fontSize: 11, color: 'var(--amber)', marginTop: 6 }}>AI score was {c.score} · your override: {cur}</div>}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="card">
              <div className="card-title">Requirements extracted</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {(analysis.summary.key_requirements || []).map((r: string, i: number) => (
                  <span key={i} className="pill pill-teal">{r}</span>
                ))}
              </div>
            </div>

            <div className="row-btns">
              <button className="btn-success" onClick={proceedToProposal}>Approved — generate proposal →</button>
              <button className="btn-danger">Flag as no-go</button>
              <span style={{ fontSize: 11, color: 'var(--grayB)' }}>Passes all data to the proposal generator</span>
            </div>
          </>
        )}
      </div>
    </>
  )
}
