'use client'
import { useState } from 'react'
import Topbar from '@/components/Topbar'

type Decision = 'Approved' | 'Proceed with comments' | 'Rejected' | 'Escalate to delivery director'

interface DimensionScore {
  score: number
  assessment: string
  missing?: string[]
  issues?: string[]
  misalignments?: string[]
  gaps?: string[]
}

interface FirstRoundReview {
  round: 1
  completeness: DimensionScore
  soundness: DimensionScore
  technology_alignment: DimensionScore
  security_coverage: DimensionScore
  integration_coverage: DimensionScore
  overall_score: number
  key_strengths: string[]
  critical_gaps: string[]
  comments_for_architect: string[]
  decision: Decision
  decision_rationale: string
  second_round_required: boolean
  second_round_instructions: string
}

interface GapStatus {
  gap: string
  status: 'Resolved' | 'Partially resolved' | 'Not addressed'
  comment: string
}

interface SecondRoundReview {
  round: 2
  gaps_addressed: GapStatus[]
  new_issues: Array<{ issue: string; severity: string }>
  response_assessment: string
  decision: Decision
  decision_rationale: string
  escalate_to_director: boolean
  escalation_reason: string
}

type Review = FirstRoundReview | SecondRoundReview

export default function ArchitectureReviewPage() {
  const [apiKey, setApiKey] = useState('')
  const [client, setClient] = useState('')
  const [project, setProject] = useState('')
  const [rfpText, setRfpText] = useState('')
  const [archText, setArchText] = useState('')
  const [archFileName, setArchFileName] = useState('')
  const [responseText, setResponseText] = useState('')
  const [responseFileName, setResponseFileName] = useState('')
  const [round, setRound] = useState(1)
  const [loading, setLoading] = useState(false)
  const [fileLoading, setFileLoading] = useState(false)
  const [error, setError] = useState('')
  const [review, setReview] = useState<Review | null>(null)
  const [expandedDims, setExpandedDims] = useState<Set<string>>(new Set())

  async function readFile(file: File): Promise<string> {
    const form = new FormData()
    form.append('file', file)
    const res = await fetch('/api/parse-file', { method: 'POST', body: form })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
    return data.text
  }

  async function handleArchFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileLoading(true)
    try {
      const text = await readFile(file)
      setArchText(text)
      setArchFileName(file.name)
    } catch (err: any) { setError(err.message) }
    finally { setFileLoading(false) }
  }

  async function handleResponseFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await readFile(file)
      setResponseText(text)
      setResponseFileName(file.name)
    } catch (err: any) { setError(err.message) }
  }

  async function runReview() {
    if (!archText) return setError('Please upload the architecture document.')
    setLoading(true)
    setError('')
    setReview(null)
    try {
      const res = await fetch('/api/review-architecture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          arch_text: archText,
          rfp_text: rfpText,
          client, project,
          round,
          previous_review: review ? JSON.stringify(review) : '',
          response_to_comments: responseText,
          api_key: apiKey,
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setReview(data.review)
    } catch (err: any) { setError(err.message) }
    finally { setLoading(false) }
  }

  function startSecondRound() {
    setRound(2)
    setArchText('')
    setArchFileName('')
    setResponseText('')
    setResponseFileName('')
  }

  function scoreColor(s: number) {
    if (s >= 4) return 'var(--green)'
    if (s >= 3) return 'var(--amber)'
    return 'var(--red)'
  }

  function scoreBg(s: number) {
    if (s >= 4) return 'var(--greenL)'
    if (s >= 3) return 'var(--amberL)'
    return 'var(--redL)'
  }

  function decisionStyle(d: Decision): React.CSSProperties {
    const map: Record<string, React.CSSProperties> = {
      'Approved': { background: 'var(--greenL)', color: '#0F6E56', border: '1px solid #9FE1CB' },
      'Proceed with comments': { background: 'var(--amberL)', color: 'var(--amber)', border: '1px solid #FAC775' },
      'Rejected': { background: 'var(--redL)', color: 'var(--red)', border: '1px solid #F0C0C0' },
      'Escalate to delivery director': { background: 'var(--dark)', color: 'var(--bright)', border: '1px solid var(--teal)' },
    }
    return { ...map[d] || map['Proceed with comments'], padding: '6px 16px', borderRadius: 8, fontWeight: 700, fontSize: 13, display: 'inline-block' }
  }

  function gapStatusStyle(s: string): React.CSSProperties {
    if (s === 'Resolved') return { color: '#0F6E56', background: 'var(--greenL)', padding: '2px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700 }
    if (s === 'Partially resolved') return { color: 'var(--amber)', background: 'var(--amberL)', padding: '2px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700 }
    return { color: 'var(--red)', background: 'var(--redL)', padding: '2px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700 }
  }

  function toggleDim(key: string) {
    const next = new Set(expandedDims)
    next.has(key) ? next.delete(key) : next.add(key)
    setExpandedDims(next)
  }

  const DIMENSIONS = [
    { key: 'completeness', label: 'Completeness', sub: 'All RFP components addressed' },
    { key: 'soundness', label: 'Soundness', sub: 'Logical, defensible, consistent' },
    { key: 'technology_alignment', label: 'Technology alignment', sub: 'Stack choices match RFP and capabilities' },
    { key: 'security_coverage', label: 'Security coverage', sub: 'WAF · TLS · UAEPASS · UAE IA' },
    { key: 'integration_coverage', label: 'Integration coverage', sub: 'All integrations designed in sufficient detail' },
  ]

  const r1 = review?.round === 1 ? review as FirstRoundReview : null
  const r2 = review?.round === 2 ? review as SecondRoundReview : null

  return (
    <>
      <Topbar title="Architecture Review" />
      <div className="main">

        {error && (
          <div className="error-bar">
            ⚠ {error}
            <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 16 }}>✕</button>
          </div>
        )}

        {/* Round indicator */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ padding: '6px 16px', borderRadius: 8, background: round === 1 ? 'var(--dark)' : 'var(--grayL)', color: round === 1 ? 'var(--bright)' : 'var(--grayB)', fontSize: 12, fontWeight: 700 }}>
            Round 1 — Initial review
          </div>
          <div style={{ color: 'var(--grayB)', fontSize: 12 }}>→</div>
          <div style={{ padding: '6px 16px', borderRadius: 8, background: round === 2 ? 'var(--dark)' : 'var(--grayL)', color: round === 2 ? 'var(--bright)' : 'var(--grayB)', fontSize: 12, fontWeight: 700 }}>
            Round 2 — Gap resolution review
          </div>
        </div>

        {/* Setup */}
        <div className="card">
          <div className="card-title">{round === 1 ? 'Round 1 — Architecture document upload' : 'Round 2 — Revised document and architect responses'}</div>

          <div className="g3" style={{ marginBottom: 12 }}>
            <div>
              <label className="f-label">Client</label>
              <input type="text" value={client} onChange={e => setClient(e.target.value)} placeholder="e.g. Ministry of Finance" />
            </div>
            <div>
              <label className="f-label">Project</label>
              <input type="text" value={project} onChange={e => setProject(e.target.value)} placeholder="e.g. Ministry Portal Redevelopment" />
            </div>
            <div>
              <label className="f-label">API key <span style={{ color: 'var(--grayB)', fontWeight: 400 }}>(if not on server)</span></label>
              <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="sk-ant-api03-..." />
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label className="f-label">RFP text <span style={{ color: 'var(--grayB)', fontWeight: 400 }}>(paste key requirements — used to check alignment)</span></label>
            <textarea rows={4} value={rfpText} onChange={e => setRfpText(e.target.value)} placeholder="Paste the RFP scope and requirements here..." />
          </div>

          {/* Architecture document upload */}
          <div style={{ marginBottom: 12 }}>
            <label className="f-label">{round === 1 ? 'Architecture document' : 'Revised architecture document'}</label>
            <label style={{ display: 'block' }}>
              <div className={`upload-zone ${archFileName ? 'has-file' : ''}`}>
                {fileLoading ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                    <div className="spinner" /><span style={{ color: 'var(--textL)' }}>Reading document...</span>
                  </div>
                ) : archFileName ? (
                  <div style={{ color: 'var(--green)', fontWeight: 600 }}>✓ {archFileName}</div>
                ) : (
                  <>
                    <div style={{ fontSize: 13, color: 'var(--textL)', marginBottom: 4 }}>Click to upload architecture document</div>
                    <div style={{ fontSize: 11, color: 'var(--grayB)' }}>Word (.docx) · PDF · Text</div>
                  </>
                )}
              </div>
              <input type="file" accept=".pdf,.docx,.txt,.md" style={{ display: 'none' }} onChange={handleArchFile} />
            </label>
          </div>

          {/* Round 2 — response to comments */}
          {round === 2 && (
            <div style={{ marginBottom: 12 }}>
              <label className="f-label">Architect response to comments <span style={{ color: 'var(--grayB)', fontWeight: 400 }}>(Word doc or paste below)</span></label>
              <label style={{ display: 'block', marginBottom: 8 }}>
                <div className={`upload-zone ${responseFileName ? 'has-file' : ''}`} style={{ marginBottom: 8 }}>
                  {responseFileName ? (
                    <div style={{ color: 'var(--green)', fontWeight: 600 }}>✓ {responseFileName}</div>
                  ) : (
                    <div style={{ fontSize: 13, color: 'var(--textL)' }}>Upload response document (optional)</div>
                  )}
                </div>
                <input type="file" accept=".pdf,.docx,.txt,.md" style={{ display: 'none' }} onChange={handleResponseFile} />
              </label>
              <textarea rows={4} value={responseText} onChange={e => setResponseText(e.target.value)} placeholder="Or paste the architect's written responses to each comment here..." />
            </div>
          )}

          <div className="row-btns">
            <button className="btn-primary" onClick={runReview} disabled={loading || !archFileName}>
              {loading ? 'Reviewing...' : round === 1 ? 'Run architecture review' : 'Run second round review'}
            </button>
            {loading && <div className="spinner" />}
            {!archFileName && <span style={{ fontSize: 11, color: 'var(--grayB)' }}>Upload architecture document to proceed</span>}
          </div>
        </div>

        {/* FIRST ROUND RESULTS */}
        {r1 && (
          <>
            {/* Decision banner */}
            <div style={{ background: r1.decision === 'Approved' ? 'var(--dark)' : r1.decision === 'Rejected' ? 'var(--redL)' : 'var(--amberL)', borderRadius: 12, padding: 24, display: 'flex', alignItems: 'center', gap: 20, border: r1.decision === 'Rejected' ? '1px solid #F0C0C0' : r1.decision === 'Approved' ? 'none' : '1px solid #FAC775' }}>
              <div style={{ flex: 1 }}>
                <div style={{ marginBottom: 8 }}>
                  <span style={decisionStyle(r1.decision)}>{r1.decision}</span>
                </div>
                <div style={{ fontSize: 13, color: r1.decision === 'Approved' ? 'rgba(255,255,255,.8)' : r1.decision === 'Rejected' ? 'var(--red)' : '#633806', lineHeight: 1.6 }}>
                  {r1.decision_rationale}
                </div>
              </div>
              <div style={{ textAlign: 'center', background: 'rgba(255,255,255,.1)', borderRadius: 10, padding: '16px 24px' }}>
                <div style={{ fontSize: 36, fontWeight: 700, color: r1.decision === 'Approved' ? 'var(--bright)' : r1.decision === 'Rejected' ? 'var(--red)' : 'var(--amber)' }}>{r1.overall_score}</div>
                <div style={{ fontSize: 11, color: r1.decision === 'Approved' ? 'rgba(255,255,255,.6)' : 'var(--textL)' }}>Overall score</div>
              </div>
            </div>

            {/* Dimension scores */}
            <div className="card">
              <div className="card-title">Review dimensions — click to expand</div>
              {DIMENSIONS.map(dim => {
                const d = (r1 as any)[dim.key] as DimensionScore
                if (!d) return null
                const isExp = expandedDims.has(dim.key)
                const items = [...(d.missing || []), ...(d.issues || []), ...(d.misalignments || []), ...(d.gaps || [])]
                return (
                  <div key={dim.key} className="criterion-row">
                    <div className="criterion-header" onClick={() => toggleDim(dim.key)}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: scoreBg(d.score), color: scoreColor(d.score), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, flexShrink: 0 }}>{d.score}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{dim.label}</div>
                        <div style={{ fontSize: 11, color: 'var(--textL)' }}>{dim.sub}</div>
                      </div>
                      <div style={{ width: 120, height: 6, background: 'var(--grayM)', borderRadius: 3, overflow: 'hidden', marginRight: 12 }}>
                        <div style={{ height: 6, borderRadius: 3, width: `${(d.score / 5) * 100}%`, background: scoreColor(d.score) }} />
                      </div>
                      <span style={{ color: 'var(--grayB)', transform: isExp ? 'rotate(90deg)' : '', transition: 'transform .2s' }}>›</span>
                    </div>
                    {isExp && (
                      <div className="criterion-body open">
                        <div style={{ fontSize: 12, lineHeight: 1.7, color: 'var(--text)', marginBottom: items.length ? 12 : 0 }}>{d.assessment}</div>
                        {items.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {items.map((item, i) => (
                              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, color: 'var(--red)', background: 'var(--redL)', padding: '8px 12px', borderRadius: 6 }}>
                                <span style={{ flexShrink: 0 }}>⚠</span>{item}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Strengths and gaps */}
            <div className="g2">
              <div className="card">
                <div className="card-title">Key strengths</div>
                {r1.key_strengths.map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, padding: '8px 0', borderBottom: i < r1.key_strengths.length - 1 ? '1px solid var(--grayM)' : 'none' }}>
                    <span style={{ color: 'var(--green)', flexShrink: 0, fontWeight: 700 }}>✓</span>{s}
                  </div>
                ))}
              </div>
              <div className="card">
                <div className="card-title">Critical gaps</div>
                {r1.critical_gaps.length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--textL)' }}>No critical gaps identified.</div>
                ) : r1.critical_gaps.map((g, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, padding: '8px 0', borderBottom: i < r1.critical_gaps.length - 1 ? '1px solid var(--grayM)' : 'none' }}>
                    <span style={{ color: 'var(--red)', flexShrink: 0, fontWeight: 700 }}>✕</span>{g}
                  </div>
                ))}
              </div>
            </div>

            {/* Comments for architect */}
            <div className="card">
              <div className="card-title">Comments for architect</div>
              <div className="callout callout-amber" style={{ marginBottom: 12 }}>
                These comments must be sent to the architect. {r1.second_round_required ? 'A second round review is required before this architecture can be approved.' : 'A second round is optional but recommended.'}
              </div>
              {r1.comments_for_architect.map((c, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: i < r1.comments_for_architect.length - 1 ? '1px solid var(--grayM)' : 'none' }}>
                  <div style={{ width: 22, height: 22, borderRadius: 6, background: 'var(--dark)', color: 'var(--bright)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
                  <div style={{ fontSize: 12, lineHeight: 1.6 }}>{c}</div>
                </div>
              ))}
              {r1.second_round_instructions && (
                <div style={{ marginTop: 12, padding: 12, background: 'var(--grayL)', borderRadius: 8, fontSize: 12, color: 'var(--textM)', lineHeight: 1.6 }}>
                  <strong style={{ display: 'block', marginBottom: 4 }}>Instructions for second round:</strong>
                  {r1.second_round_instructions}
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {(r1.decision === 'Rejected' || r1.decision === 'Proceed with comments') && (
                <button className="btn-primary" onClick={startSecondRound}>
                  Start second round review →
                </button>
              )}
              {(r1.decision === 'Approved' || r1.decision === 'Proceed with comments') && (
                <button className="btn-success">
                  Use in proposal Part B →
                </button>
              )}
              <button className="btn-second" onClick={() => window.print()}>Print review</button>
            </div>
          </>
        )}

        {/* SECOND ROUND RESULTS */}
        {r2 && (
          <>
            <div style={{ background: r2.decision === 'Approved' ? 'var(--dark)' : r2.decision === 'Escalate to delivery director' ? 'var(--mid)' : r2.decision === 'Rejected' ? 'var(--redL)' : 'var(--amberL)', borderRadius: 12, padding: 24, border: r2.decision === 'Approved' ? 'none' : '1px solid var(--grayM)' }}>
              <div style={{ marginBottom: 8 }}>
                <span style={decisionStyle(r2.decision)}>{r2.decision}</span>
              </div>
              <div style={{ fontSize: 13, color: r2.decision === 'Approved' ? 'rgba(255,255,255,.8)' : 'var(--text)', lineHeight: 1.6, marginBottom: 8 }}>{r2.decision_rationale}</div>
              {r2.escalate_to_director && (
                <div style={{ fontSize: 12, color: 'var(--bright)', marginTop: 8 }}>
                  <strong>Escalation reason:</strong> {r2.escalation_reason}
                </div>
              )}
            </div>

            <div className="card">
              <div className="card-title">Response assessment</div>
              <div style={{ fontSize: 12, lineHeight: 1.7, color: 'var(--text)' }}>{r2.response_assessment}</div>
            </div>

            <div className="card">
              <div className="card-title">Gap resolution status</div>
              {r2.gaps_addressed.map((g, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 0', borderBottom: i < r2.gaps_addressed.length - 1 ? '1px solid var(--grayM)' : 'none' }}>
                  <span style={gapStatusStyle(g.status)}>{g.status}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 3 }}>{g.gap}</div>
                    <div style={{ fontSize: 11, color: 'var(--textL)' }}>{g.comment}</div>
                  </div>
                </div>
              ))}
            </div>

            {r2.new_issues.length > 0 && (
              <div className="card">
                <div className="card-title">New issues introduced</div>
                {r2.new_issues.map((n, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, color: 'var(--red)', background: 'var(--redL)', padding: '8px 12px', borderRadius: 6, marginBottom: 6 }}>
                    <span style={{ flexShrink: 0, fontWeight: 700 }}>⚠ {n.severity}</span>{n.issue}
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              {(r2.decision === 'Approved' || r2.decision === 'Proceed with comments') && (
                <button className="btn-success">Use in proposal Part B →</button>
              )}
              <button className="btn-second" onClick={() => window.print()}>Print review</button>
            </div>
          </>
        )}
      </div>
    </>
  )
}
