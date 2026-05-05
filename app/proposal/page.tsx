'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Topbar from '@/components/Topbar'

const PARTS = [
  { id: 'A', name: 'Opportunity and scope', desc: 'Executive summary · scope · requirements · NFR · exclusions' },
  { id: 'B', name: 'Technical solution', desc: 'Architecture · tech stack · integration · infrastructure' },
  { id: 'C', name: 'Security', desc: 'Security framework · UAE IA · penetration testing · IAM' },
  { id: 'D', name: 'Delivery methodology', desc: 'Agile SDLC · sprint model · governance · reporting' },
  { id: 'E', name: 'Support services', desc: 'Support model · SLA · packages · 24×7 model' },
  { id: 'F', name: 'Company credentials', desc: 'Company profile · references · certifications · team' },
]

const PART_LABELS: Record<string, string> = {
  A: 'Part A — Opportunity and Scope',
  B: 'Part B — Technical Solution',
  C: 'Part C — Security',
  D: 'Part D — Delivery Methodology',
  E: 'Part E — Support Services',
  F: 'Part F — Company Credentials',
}

function ProposalContent() {
  const searchParams = useSearchParams()
  const [client, setClient] = useState(searchParams.get('client') || '')
  const [ref, setRef] = useState(searchParams.get('ref') || '')
  const [project, setProject] = useState(searchParams.get('project') || '')
  const [value, setValue] = useState(searchParams.get('value') || '')
  const [timeline, setTimeline] = useState('')
  const [rfp, setRfp] = useState(searchParams.get('rfp') || '')
  const [selected, setSelected] = useState<Set<string>>(new Set(['A', 'B', 'C', 'D', 'E', 'F']))
  const [generating, setGenerating] = useState(false)
  const [genStatus, setGenStatus] = useState<Record<string, 'pending' | 'active' | 'done' | 'error'>>({})
  const [genErrors, setGenErrors] = useState<Record<string, string>>({})
  const [sections, setSections] = useState<Record<string, any>>({})
  const [progress, setProgress] = useState(0)
  const [step, setStep] = useState<'setup' | 'generating' | 'editor'>('setup')
  const [error, setError] = useState('')
  const [expandedPanels, setExpandedPanels] = useState<Set<string>>(new Set(['A']))
  const [exporting, setExporting] = useState(false)

  function togglePart(id: string) {
    const next = new Set(selected)
    next.has(id) ? next.delete(id) : next.add(id)
    setSelected(next)
  }

  function togglePanel(id: string) {
    const next = new Set(expandedPanels)
    next.has(id) ? next.delete(id) : next.add(id)
    setExpandedPanels(next)
  }

  async function generateAll() {
    if (!rfp.trim()) return setError('Please enter RFP text.')
    if (selected.size === 0) return setError('Please select at least one part.')
    setError('')
    setGenerating(true)
    setStep('generating')

    const parts = ['A', 'B', 'C', 'D', 'E', 'F'].filter(p => selected.has(p))
    const initStatus: Record<string, any> = {}
    parts.forEach(p => initStatus[p] = 'pending')
    setGenStatus(initStatus)
    setProgress(0)

    const newSections: Record<string, any> = {}
    const newErrors: Record<string, string> = {}

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      setGenStatus(prev => ({ ...prev, [part]: 'active' }))
      try {
        const res = await fetch('/api/generate-section', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ part, client, project, ref, value, timeline, rfp }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        newSections[part] = data.section
        setGenStatus(prev => ({ ...prev, [part]: 'done' }))
      } catch (e: any) {
        newErrors[part] = e.message
        setGenStatus(prev => ({ ...prev, [part]: 'error' }))
      }
      setProgress(Math.round(((i + 1) / parts.length) * 100))
    }

    setSections(newSections)
    setGenErrors(newErrors)
    setGenerating(false)
    setStep('editor')
    setExpandedPanels(new Set([Object.keys(newSections)[0] || 'A']))
  }

  function updateField(part: string, field: string, value: string) {
    setSections(prev => ({
      ...prev,
      [part]: { ...prev[part], [field]: value }
    }))
  }

  function updateListField(part: string, field: string, value: string) {
    const items = value.split('\n').map((l: string) => l.replace(/^[•·›\-]\s*/, '')).filter((l: string) => l.trim())
    setSections(prev => ({
      ...prev,
      [part]: { ...prev[part], [field]: items }
    }))
  }

  async function exportWord() {
    setExporting(true)
    try {
      const res = await fetch('/api/export-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client, ref, project, value, timeline, sections }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Emaratech_Technical_Proposal_${client.replace(/[^a-zA-Z0-9]/g, '_')}.docx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e: any) {
      setError('Export failed: ' + e.message)
    } finally {
      setExporting(false)
    }
  }

  const scoreColor = (s: number) => s >= 4 ? 'var(--green)' : s >= 3 ? 'var(--amber)' : 'var(--red)'

  return (
    <>
      <Topbar title={project || undefined} />
      <div className="main">

        {error && (
          <div className="error-bar">⚠ {error}
            <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 16 }}>✕</button>
          </div>
        )}

        {/* SETUP */}
        {step === 'setup' && (
          <div className="card">
            <div className="card-title">Proposal setup</div>
            <div className="g3" style={{ marginBottom: 12 }}>
              <div><label className="f-label">Client name</label><input type="text" value={client} onChange={e => setClient(e.target.value)} placeholder="e.g. Ministry of Finance" /></div>
              <div><label className="f-label">Project name</label><input type="text" value={project} onChange={e => setProject(e.target.value)} placeholder="e.g. Ministry Portal Redevelopment" /></div>
              <div><label className="f-label">RFP reference</label><input type="text" value={ref} onChange={e => setRef(e.target.value)} placeholder="e.g. MOF-IT-2026-001" /></div>
            </div>
            <div className="g3" style={{ marginBottom: 14 }}>
              <div><label className="f-label">Estimated value (AED)</label><input type="text" value={value} onChange={e => setValue(e.target.value)} placeholder="e.g. 1,200,000" /></div>
              <div><label className="f-label">Delivery timeline</label><input type="text" value={timeline} onChange={e => setTimeline(e.target.value)} placeholder="e.g. 27 weeks" /></div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label className="f-label">RFP text</label>
              <textarea rows={5} value={rfp} onChange={e => setRfp(e.target.value)} placeholder="Paste RFP text here — or use the Proceed button from the qualification tool to auto-fill" />
            </div>

            <div className="card-title" style={{ marginBottom: 10 }}>Select parts to generate</div>
            <div className="parts-grid">
              {PARTS.map(p => (
                <div key={p.id} className={`part-card ${selected.has(p.id) ? 'selected' : ''}`} onClick={() => togglePart(p.id)}>
                  <div className="part-letter">{p.id}</div>
                  <div className="part-name">{p.name}</div>
                  <div className="part-desc">{p.desc}</div>
                </div>
              ))}
            </div>

            <div className="row-btns" style={{ marginTop: 16 }}>
              <button className="btn-primary" onClick={generateAll} disabled={generating}>
                {generating ? 'Generating...' : 'Generate proposal'}
              </button>
              {generating && <div className="spinner" />}
            </div>
          </div>
        )}

        {/* GENERATING */}
        {step === 'generating' && (
          <div className="card">
            <div className="card-title">Generating proposal sections</div>
            <div className="progress-bar"><div className="progress-fill" style={{ width: progress + '%' }} /></div>
            <div style={{ marginTop: 8 }}>
              {['A', 'B', 'C', 'D', 'E', 'F'].filter(p => selected.has(p)).map(p => (
                <div key={p} className="gen-row">
                  <div className={`gen-icon ${genStatus[p] || 'pending'}`}>
                    {genStatus[p] === 'done' ? '✓' : genStatus[p] === 'active' ? '…' : genStatus[p] === 'error' ? '!' : '○'}
                  </div>
                  <span style={{ flex: 1 }}>{PART_LABELS[p]}</span>
                  <span style={{ fontSize: 11, color: genStatus[p] === 'done' ? 'var(--green)' : genStatus[p] === 'error' ? 'var(--red)' : 'var(--grayB)' }}>
                    {genStatus[p] === 'done' ? 'Complete' : genStatus[p] === 'active' ? 'Generating...' : genStatus[p] === 'error' ? 'Error' : 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* EDITOR */}
        {step === 'editor' && (
          <>
            <div className="callout">
              Proposal generated — review and edit each section below. Click any section header to expand. Changes save automatically as you type.
            </div>

            {Object.keys(sections).map(part => {
              const d = sections[part]
              const isExp = expandedPanels.has(part)
              return (
                <div key={part} className="section-panel">
                  <div className="section-panel-header" onClick={() => togglePanel(part)}>
                    <div className="section-letter">{part}</div>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{PART_LABELS[part]}</span>
                    <span className="pill pill-green" style={{ fontSize: 9 }}>Generated</span>
                    <span style={{ color: 'var(--grayB)', transform: isExp ? 'rotate(90deg)' : '', transition: 'transform .2s' }}>›</span>
                  </div>

                  <div className={`section-panel-body ${isExp ? 'open' : ''}`}>

                    {part === 'A' && (
                      <>
                        <SubSection title="Executive Summary" value={d.executive_summary || ''} onChange={v => updateField('A', 'executive_summary', v)} />
                        <SubSection title="Scope Overview" value={d.scope_overview || ''} onChange={v => updateField('A', 'scope_overview', v)} />
                        <ListSection title="In Scope" value={(d.in_scope || []).map((i: string) => '• ' + i).join('\n')} onChange={v => updateListField('A', 'in_scope', v)} />
                        <ListSection title="Out of Scope" value={(d.out_of_scope || []).map((i: string) => '• ' + i).join('\n')} onChange={v => updateListField('A', 'out_of_scope', v)} />
                        {d.functional_requirements?.length > 0 && (
                          <div className="sub-section">
                            <div className="sub-section-title">Functional Requirements</div>
                            <table className="data-table">
                              <thead><tr style={{ background: 'var(--dark)' }}><th style={{ color: 'var(--bright)', width: 60 }}>Ref</th><th style={{ color: 'var(--bright)', width: 130 }}>Category</th><th style={{ color: 'var(--bright)' }}>Requirement</th><th style={{ color: 'var(--bright)', width: 80, textAlign: 'center' }}>Priority</th></tr></thead>
                              <tbody>
                                {d.functional_requirements.map((r: any, i: number) => (
                                  <tr key={i}><td style={{ fontWeight: 700, color: 'var(--bright)' }}>{r.ref}</td><td style={{ color: 'var(--textM)' }}>{r.category}</td><td>{r.requirement}</td><td style={{ textAlign: 'center' }}><span className={`pill ${r.priority === 'Must' ? 'pill-red' : r.priority === 'Should' ? 'pill-amber' : 'pill-teal'}`} style={{ fontSize: 9 }}>{r.priority}</span></td></tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                        <ListSection title="Exclusions" value={(d.exclusions || []).map((i: string) => '• ' + i).join('\n')} onChange={v => updateListField('A', 'exclusions', v)} />
                        <ListSection title="Assumptions" value={(d.assumptions || []).map((i: string) => '• ' + i).join('\n')} onChange={v => updateListField('A', 'assumptions', v)} />
                        <ListSection title="Constraints" value={(d.constraints || []).map((i: string) => '• ' + i).join('\n')} onChange={v => updateListField('A', 'constraints', v)} />
                      </>
                    )}

                    {part === 'B' && (
                      <>
                        <SubSection title="Technical Understanding" value={d.technical_understanding || ''} onChange={v => updateField('B', 'technical_understanding', v)} />
                        <SubSection title="Architecture Overview" value={d.architecture_overview || ''} onChange={v => updateField('B', 'architecture_overview', v)} />
                        <ListSection title="Architecture Principles" value={(d.architecture_principles || []).map((i: string) => '• ' + i).join('\n')} onChange={v => updateListField('B', 'architecture_principles', v)} />
                        {d.technology_stack?.length > 0 && (
                          <div className="sub-section">
                            <div className="sub-section-title">Technology Stack</div>
                            <table className="data-table">
                              <thead><tr style={{ background: 'var(--dark)' }}><th style={{ color: 'var(--bright)', width: 140 }}>Layer</th><th style={{ color: 'var(--bright)', width: 220 }}>Technologies</th><th style={{ color: 'var(--bright)' }}>Purpose</th></tr></thead>
                              <tbody>{d.technology_stack.map((s: any, i: number) => <tr key={i}><td style={{ fontWeight: 700 }}>{s.layer}</td><td style={{ color: 'var(--textM)', fontSize: 11 }}>{s.technologies}</td><td>{s.purpose}</td></tr>)}</tbody>
                            </table>
                          </div>
                        )}
                        <SubSection title="Integration Approach" value={d.integration_approach || ''} onChange={v => updateField('B', 'integration_approach', v)} />
                        <SubSection title="Infrastructure Model" value={d.infrastructure_model || ''} onChange={v => updateField('B', 'infrastructure_model', v)} />
                      </>
                    )}

                    {part === 'C' && (
                      <>
                        <SubSection title="Security Overview" value={d.security_overview || ''} onChange={v => updateField('C', 'security_overview', v)} />
                        <ListSection title="Cybersecurity Scope" value={(d.cybersecurity_scope || []).map((i: string) => '• ' + i).join('\n')} onChange={v => updateListField('C', 'cybersecurity_scope', v)} />
                        {d.compliance_standards?.length > 0 && (
                          <div className="sub-section">
                            <div className="sub-section-title">Compliance Standards</div>
                            <table className="data-table">
                              <thead><tr style={{ background: 'var(--dark)' }}><th style={{ color: 'var(--bright)', width: 200 }}>Standard</th><th style={{ color: 'var(--bright)' }}>Description</th></tr></thead>
                              <tbody>{d.compliance_standards.map((s: any, i: number) => <tr key={i}><td style={{ fontWeight: 700 }}>{s.standard}</td><td>{s.description}</td></tr>)}</tbody>
                            </table>
                          </div>
                        )}
                        <SubSection title="Penetration Testing" value={d.penetration_testing || ''} onChange={v => updateField('C', 'penetration_testing', v)} />
                        <SubSection title="Identity and Access Management" value={d.iam_approach || ''} onChange={v => updateField('C', 'iam_approach', v)} />
                      </>
                    )}

                    {part === 'D' && (
                      <>
                        <SubSection title="Methodology Overview" value={d.methodology_overview || ''} onChange={v => updateField('D', 'methodology_overview', v)} />
                        <SubSection title="Sprint Model" value={d.sprint_model || ''} onChange={v => updateField('D', 'sprint_model', v)} />
                        <SubSection title="Change Management" value={d.change_management || ''} onChange={v => updateField('D', 'change_management', v)} />
                        <SubSection title="Release Management" value={d.release_management || ''} onChange={v => updateField('D', 'release_management', v)} />
                        <SubSection title="Project Governance" value={d.governance || ''} onChange={v => updateField('D', 'governance', v)} />
                        <SubSection title="Reporting and Communication" value={d.reporting || ''} onChange={v => updateField('D', 'reporting', v)} />
                        <SubSection title="Approval Process" value={d.approval_process || ''} onChange={v => updateField('D', 'approval_process', v)} />
                      </>
                    )}

                    {part === 'E' && (
                      <>
                        <SubSection title="Support Model Overview" value={d.support_overview || ''} onChange={v => updateField('E', 'support_overview', v)} />
                        <div className="sub-section">
                          <div className="sub-section-title">Recommended Package</div>
                          <select value={d.recommended_package || 'Gold'} onChange={e => updateField('E', 'recommended_package', e.target.value)} style={{ maxWidth: 200 }}>
                            <option>Silver</option><option>Gold</option><option>Platinum</option>
                          </select>
                        </div>
                        <SubSection title="Package Rationale" value={d.package_recommendation_rationale || ''} onChange={v => updateField('E', 'package_recommendation_rationale', v)} />
                        <SubSection title="SLA Summary" value={d.sla_summary || ''} onChange={v => updateField('E', 'sla_summary', v)} />
                        <SubSection title="Operational Model" value={d.operational_model || ''} onChange={v => updateField('E', 'operational_model', v)} />
                      </>
                    )}

                    {part === 'F' && (
                      <>
                        <SubSection title="Company Profile" value={d.company_profile || ''} onChange={v => updateField('F', 'company_profile', v)} />
                        <ListSection title="Key Differentiators" value={(d.key_differentiators || []).map((i: string) => '• ' + i).join('\n')} onChange={v => updateListField('F', 'key_differentiators', v)} />
                        {d.project_references?.length > 0 && (
                          <div className="sub-section">
                            <div className="sub-section-title">Project References</div>
                            {d.project_references.map((r: any, i: number) => (
                              <div key={i} style={{ border: '1px solid var(--grayM)', borderRadius: 8, padding: 14, marginBottom: 8, background: i % 2 === 0 ? 'var(--grayL)' : '#fff' }}>
                                <div style={{ fontWeight: 700, marginBottom: 3 }}>{r.project}</div>
                                <div style={{ fontSize: 11, color: 'var(--textL)', marginBottom: 6 }}>{r.client}</div>
                                <div style={{ fontSize: 12, lineHeight: 1.6, marginBottom: 6 }}>{r.description}</div>
                                <div style={{ fontSize: 10, color: 'var(--teal)' }}>{r.technologies}</div>
                              </div>
                            ))}
                          </div>
                        )}
                        <ListSection title="Certifications" value={(d.certifications || []).map((i: string) => '• ' + i).join('\n')} onChange={v => updateListField('F', 'certifications', v)} />
                        {d.key_team?.length > 0 && (
                          <div className="sub-section">
                            <div className="sub-section-title">Key Team Members</div>
                            <div className="g2">
                              {d.key_team.map((t: any, i: number) => (
                                <div key={i} style={{ background: 'var(--grayL)', border: '1px solid var(--grayM)', borderRadius: 8, padding: 12 }}>
                                  <div style={{ fontWeight: 700, marginBottom: 4 }}>{t.role}</div>
                                  <div style={{ fontSize: 11, color: 'var(--textL)', lineHeight: 1.5 }}>{t.experience}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )
            })}

            <div className="export-card">
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: 17, fontWeight: 600, color: '#fff', marginBottom: 5 }}>Export proposal to Word</h3>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,.6)', lineHeight: 1.5 }}>Downloads a formatted .docx with Emaratech branding, all sections, tables, and sign-off page.</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button className="btn-success" onClick={exportWord} disabled={exporting}>
                  {exporting ? 'Exporting...' : 'Download Word document'}
                </button>
                <button className="btn-second" onClick={() => { setStep('setup'); setSections({}); setGenStatus({}) }}>← Start over</button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}

function SubSection({ title, value, onChange }: { title: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="sub-section">
      <div className="sub-section-title">{title}</div>
      <textarea className="content-area" rows={5} value={value} onChange={e => onChange(e.target.value)} />
    </div>
  )
}

function ListSection({ title, value, onChange }: { title: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="sub-section">
      <div className="sub-section-title">{title}</div>
      <textarea className="content-area" rows={4} value={value} onChange={e => onChange(e.target.value)} />
    </div>
  )
}

export default function ProposalPage() {
  return (
    <Suspense fallback={<div className="main"><div className="card">Loading...</div></div>}>
      <ProposalContent />
    </Suspense>
  )
}
