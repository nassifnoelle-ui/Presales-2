import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { rfp_text, dow_text, client, project, api_key } = await req.json()
    const apiKey = process.env.ANTHROPIC_API_KEY || api_key || ''
    if (!apiKey) return NextResponse.json({ error: 'No API key. Enter your key in the API key field on screen.' }, { status: 500 })

    const rawSource = rfp_text || dow_text || ''
    if (rawSource.trim().length < 50) return NextResponse.json({ error: 'Document too short to extract requirements.' }, { status: 400 })

    // Clean and limit to 4000 chars to stay well within timeout
    const source = rawSource
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ')
      .replace(/\\/g, '/')
      .replace(/`/g, "'")
      .replace(/\u2019|\u2018/g, "'")
      .replace(/\u201C|\u201D/g, '"')
      .replace(/\u2013|\u2014/g, '-')
      .replace(/[^\x20-\x7E\n\r\t\u0600-\u06FF\u0750-\u077F]/g, ' ')
      .replace(/\s{3,}/g, '\n')
      .trim()
      .slice(0, 4000)

    const prompt = `Extract requirements from this RFP for emaratech Technology Solutions.
CLIENT: ${client || '[Client]'} | PROJECT: ${project || '[Project]'}

DOCUMENT:
${source}

Return ONLY valid JSON, no markdown. Be specific and literal — quote exact wording. Extract ALL penalties and deadlines.

{
  "overview": "2 sentence project description",
  "submission_deadline": "exact date and time or TBD",
  "proposal_validity": "e.g. 90 days or TBD",
  "project_duration": "e.g. 12 months or TBD",
  "commercial_terms": {
    "pricing_model": "exact or Not stated",
    "currency": "exact or Not stated",
    "vat": "exact or Not stated",
    "payment": "exact or Not stated",
    "bid_bond": "exact or Not stated",
    "performance_bond": "exact or Not stated",
    "warranty": "exact or Not stated",
    "validity": "exact or Not stated",
    "boq_format": "exact or Not stated"
  },
  "key_dates": [{"date": "exact date", "event": "description", "critical": true}],
  "phases": [{"name": "Phase name", "duration": "duration", "go_live": "date or TBD", "scope": ["item1","item2"], "deliverables": ["del1"]}],
  "scope_of_work": "2-3 paragraphs on full scope",
  "functional_requirements": [{"ref":"FR-01","phase":"Phase 1","category":"Identity","requirement":"exact requirement","priority":"Must"}],
  "non_functional_requirements": [{"ref":"NFR-01","category":"Performance","requirement":"exact requirement","target":"specific target","priority":"Must"}],
  "technical_requirements": [{"ref":"TR-01","area":"Platform","requirement":"exact requirement","constraint":"hard constraint if any","priority":"Must"}],
  "mandatory_submission_docs": [{"ref":"MS-01","document":"exact name","detail":"what it must contain","consequence":"e.g. Bid disqualified"}],
  "evaluation_criteria": [{"criterion":"name","weight":"percentage","threshold":"pass mark if stated"}],
  "risks": [{"ref":"RISK-01","category":"Commercial","risk":"specific risk with clause reference","financial_exposure":"exact penalty or None stated","likelihood":"High","impact":"High","mitigation":"suggested action"}],
  "additional_notes": "ambiguities, contradictions, strategic observations",
  "confidence": "High",
  "confidence_note": "reason"
}`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }]
      })
    })

    if (!response.ok) {
      const errText = await response.text()
      let errMsg = `Anthropic API error (${response.status})`
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
