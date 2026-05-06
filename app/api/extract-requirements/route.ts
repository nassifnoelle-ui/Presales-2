import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { rfp_text, dow_text, client, project, api_key } = await req.json()
    const apiKey = process.env.ANTHROPIC_API_KEY || api_key || ''
    if (!apiKey) return NextResponse.json({ error: 'No API key. Enter your key in the API key field.' }, { status: 500 })

    const rawSource = rfp_text || dow_text || ''
    if (rawSource.trim().length < 50) return NextResponse.json({ error: 'Document too short.' }, { status: 400 })

    const source = rawSource
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ')
      .replace(/\\/g, '/')
      .replace(/`/g, "'")
      .replace(/\u2019|\u2018/g, "'")
      .replace(/\u201C|\u201D/g, '"')
      .replace(/\u2013|\u2014/g, '-')
      .replace(/[^\x20-\x7E\n\r\t\u0600-\u06FF\u0750-\u077F]/g, ' ')
      .trim()
      .slice(0, 8000)

    const prompt = `You are a senior bid manager at emaratech Technology Solutions. Extract every requirement, risk, commercial term and deadline from this document.

CLIENT: ${client || '[Client]'} | PROJECT: ${project || '[Project]'}

DOCUMENT:
${source}

RULES — be literal and exhaustive:
- Extract EXACT wording, not summaries
- Capture ALL penalties, liquidated damages, liability clauses as HIGH risks with financial_exposure
- Capture ALL dates — submission deadline is CRITICAL
- Capture ALL mandatory submission documents — missing one disqualifies the bid
- If phased delivery, break scope into separate phase entries
- Risks include: penalty clauses, compressed timelines, resource requirements, tech stack mandates, compliance obligations, liability clauses, OSS obligations, VAPT requirements
- Confidence HIGH only if document is clear and complete

Return ONLY valid JSON, no markdown:
{
  "overview": "2-3 sentence paragraph describing what this project is, who the client is, and the overall objective",
  "submission_deadline": "EXACT date and time — e.g. 29 Apr 2026 15:30",
  "proposal_validity": "e.g. 90 days",
  "project_duration": "e.g. 12-18 months across 3 phases",
  "commercial_terms": {
    "pricing_model": "e.g. Firm fixed price per phase",
    "currency": "e.g. AED",
    "vat": "e.g. 5%",
    "payment": "e.g. Against validated milestones, paid within 45 days",
    "bid_bond": "exact requirement or Not stated",
    "performance_bond": "exact requirement or Not stated",
    "warranty": "exact period or Not stated",
    "validity": "exact period or Not stated",
    "boq_format": "exact BoQ structure required or Not stated"
  },
  "key_dates": [
    {"date": "exact date", "event": "exact description", "critical": true}
  ],
  "phases": [
    {
      "name": "Phase 1 — e.g. Mobile Pilot",
      "duration": "e.g. 3 months",
      "go_live": "e.g. September 2026",
      "scope": ["exact scope item 1", "exact scope item 2"],
      "deliverables": ["deliverable 1", "deliverable 2"]
    }
  ],
  "scope_of_work": "2-3 paragraph description of the full scope — what is in scope, what is explicitly out of scope, overall approach",
  "functional_requirements": [
    {
      "ref": "FR-01",
      "phase": "Phase 1 / All phases / Phase 2",
      "category": "Identity / Portal / Mobile / Integration / AI / CMS / Contact Centre / Accessibility / Other",
      "requirement": "EXACT requirement from document",
      "priority": "Must",
      "source": "section reference"
    }
  ],
  "non_functional_requirements": [
    {
      "ref": "NFR-01",
      "category": "Performance / Availability / Security / Scalability / Accessibility / Data / DR",
      "requirement": "EXACT requirement",
      "target": "specific measurable target if stated",
      "priority": "Must"
    }
  ],
  "technical_requirements": [
    {
      "ref": "TR-01",
      "area": "Platform / Infrastructure / Integration / Security / DevOps / Architecture / Hosting / Licensing",
      "requirement": "EXACT technical requirement — name specific technologies",
      "constraint": "any hard constraint e.g. must use X, must not use Y",
      "priority": "Must"
    }
  ],
  "mandatory_submission_docs": [
    {
      "ref": "MS-01",
      "document": "exact document name",
      "detail": "what it must contain",
      "consequence": "e.g. Bid disqualified / Negatively impacts score"
    }
  ],
  "evaluation_criteria": [
    {"criterion": "e.g. Functional Requirements", "weight": "25%", "threshold": "70% to proceed to commercial"}
  ],
  "risks": [
    {
      "ref": "RISK-01",
      "category": "Commercial / Technical / Resource / Legal / Timeline / Compliance",
      "risk": "SPECIFIC risk — name the clause, penalty, or condition",
      "financial_exposure": "exact penalty if stated — e.g. 2x contract value, 0.5% per day, or None stated",
      "likelihood": "High / Medium / Low",
      "impact": "High / Medium / Low",
      "mitigation": "concrete mitigation pre-sales should take"
    }
  ],
  "additional_notes": "Paragraph covering ambiguities, contradictions, items needing clarification, strategic observations",
  "confidence": "High / Medium / Low",
  "confidence_note": "Why this confidence level"
}`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-5', max_tokens: 8000, messages: [{ role: 'user', content: prompt }] })
    })

    if (!response.ok) {
      const errText = await response.text()
      let errMsg = `API error (${response.status})`
      try { const j = JSON.parse(errText); errMsg = j?.error?.message || errMsg } catch {}
      throw new Error(errMsg)
    }

    const data = await response.json()
    const raw = data.content[0].text
    const clean = raw.replace(/```json|```/g, '').trim()
    const trimmed = clean.replace(/^\uFEFF/, '').replace(/^\s+/, '')

    let extracted: any
    try {
      extracted = JSON.parse(trimmed)
    } catch {
      const match = trimmed.match(/\{[\s\S]*\}/)
      if (match) {
        extracted = JSON.parse(match[0])
      } else {
        throw new Error('Could not parse AI response. Try again.')
      }
    }

    // Build compliance items from all requirement types
    const complianceItems: any[] = []

    const addItems = (items: any[], type: string, reqField: string) => {
      ;(items || []).forEach((r: any) => {
        complianceItems.push({
          ref: r.ref,
          type,
          requirement: r[reqField] || r.requirement || '',
          priority: r.priority || 'Must',
          category: r.category || r.area || type,
          phase: r.phase || 'All',
          financial_exposure: r.financial_exposure || '',
          stage1_status: 'not_started',
          stage1_part: null,
          stage2_status: 'not_started',
          notes: r.mitigation || '',
        })
      })
    }

    addItems(extracted.functional_requirements || [], 'Functional', 'requirement')
    addItems(extracted.non_functional_requirements || [], 'Non-functional', 'requirement')
    addItems(extracted.technical_requirements || [], 'Technical', 'requirement')
    addItems(extracted.mandatory_submission_docs || [], 'Mandatory doc', 'document')
    addItems(extracted.risks || [], 'Risk', 'risk')

    return NextResponse.json({ success: true, extracted, compliance_items: complianceItems })
  } catch (err: any) {
    const msg = typeof err === 'string' ? err : (err?.message || 'Server error')
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
