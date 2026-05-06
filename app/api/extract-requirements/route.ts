import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { rfp_text, dow_text, client, project, api_key } = await req.json()
    const apiKey = process.env.ANTHROPIC_API_KEY || api_key || ''
    if (!apiKey) return NextResponse.json({ error: 'No API key configured.' }, { status: 500 })

    const source = rfp_text || dow_text || ''
    if (source.trim().length < 50) {
      return NextResponse.json({ error: 'RFP text too short to extract requirements.' }, { status: 400 })
    }

    const prompt = `You are a senior pre-sales consultant at emaratech Technology Solutions analysing an RFP or Description of Work document.

CLIENT: ${client || '[Client]'}
PROJECT: ${project || '[Project]'}

DOCUMENT TEXT:
${source.slice(0, 5000)}

Extract ALL requirements and key information from this document. Be thorough and specific — do not generalise. Every requirement should be traceable back to the source document.

Return ONLY valid JSON with no markdown:
{
  "functional_requirements": [
    {"ref": "FR-01", "requirement": "exact requirement description", "priority": "Must", "source": "exact quote or section from document", "category": "Identity / CMS / Portal / Integration / UI / Accessibility / Other"},
    {"ref": "FR-02", "requirement": "...", "priority": "Should", "source": "...", "category": "..."}
  ],
  "non_functional_requirements": [
    {"ref": "NFR-01", "category": "Performance", "requirement": "exact requirement", "target": "specific target if stated e.g. <3 sec response time", "priority": "Must"},
    {"ref": "NFR-02", "category": "Availability", "requirement": "...", "target": "...", "priority": "Must"},
    {"ref": "NFR-03", "category": "Security", "requirement": "...", "target": "...", "priority": "Must"},
    {"ref": "NFR-04", "category": "Accessibility", "requirement": "...", "target": "...", "priority": "Should"}
  ],
  "technical_requirements": [
    {"ref": "TR-01", "area": "Platform", "requirement": "exact technical requirement", "notes": "any additional context", "priority": "Must"},
    {"ref": "TR-02", "area": "Integration", "requirement": "...", "notes": "...", "priority": "Must"}
  ],
  "submission_timeline": {
    "submission_deadline": "exact date or TBD",
    "project_start": "exact date or TBD",
    "project_end": "exact date or TBD",
    "delivery_duration": "e.g. 27 weeks or TBD",
    "key_dates": [
      {"date": "exact date or period", "event": "description of milestone or deadline"}
    ]
  },
  "constraints": [
    {"ref": "CON-01", "constraint": "exact constraint description", "type": "Technical / Commercial / Regulatory / Timeline / Resource"},
    {"ref": "CON-02", "constraint": "...", "type": "..."}
  ],
  "risks": [
    {"ref": "RISK-01", "risk": "specific risk description", "likelihood": "High / Medium / Low", "impact": "High / Medium / Low", "source": "where this risk was identified"},
    {"ref": "RISK-02", "risk": "...", "likelihood": "...", "impact": "...", "source": "..."}
  ],
  "commercial": {
    "estimated_value": "exact value if stated or TBD",
    "bid_bond": "exact requirement if stated or Not stated",
    "payment_terms": "exact terms if stated or Not stated",
    "warranty_period": "exact period if stated or Not stated",
    "validity_period": "exact period if stated or Not stated"
  },
  "evaluation_criteria": [
    {"criterion": "e.g. Technical approach", "weight": "e.g. 35%", "notes": "any additional detail"}
  ],
  "additional_notes": "Any other important observations, ambiguities, or items that pre-sales should be aware of — written as a professional summary paragraph.",
  "extraction_summary": {
    "total_requirements": 15,
    "must_count": 10,
    "should_count": 4,
    "nice_count": 1,
    "risk_count": 3,
    "constraint_count": 4,
    "confidence": "High / Medium / Low",
    "confidence_note": "Brief note on quality of extraction based on document clarity"
  }
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
      const err = await response.text()
      throw new Error(`Anthropic error ${response.status}: ${err}`)
    }

    const data = await response.json()
    const raw = data.content[0].text
    const clean = raw.replace(/```json|```/g, '').trim()
    const extracted = JSON.parse(clean)

    // Build compliance sheet from extracted requirements
    const complianceItems: any[] = []

    extracted.functional_requirements?.forEach((r: any) => {
      complianceItems.push({
        ref: r.ref,
        type: 'Functional',
        requirement: r.requirement,
        priority: r.priority,
        category: r.category,
        stage1_status: 'not_started',
        stage1_part: null,
        stage2_status: 'not_started',
        notes: '',
      })
    })

    extracted.non_functional_requirements?.forEach((r: any) => {
      complianceItems.push({
        ref: r.ref,
        type: 'Non-functional',
        requirement: r.requirement,
        priority: r.priority,
        category: r.category,
        stage1_status: 'not_started',
        stage1_part: null,
        stage2_status: 'not_started',
        notes: '',
      })
    })

    extracted.technical_requirements?.forEach((r: any) => {
      complianceItems.push({
        ref: r.ref,
        type: 'Technical',
        requirement: r.requirement,
        priority: r.priority,
        category: r.area,
        stage1_status: 'not_started',
        stage1_part: null,
        stage2_status: 'not_started',
        notes: '',
      })
    })

    extracted.constraints?.forEach((r: any) => {
      complianceItems.push({
        ref: r.ref,
        type: 'Constraint',
        requirement: r.constraint,
        priority: 'Must',
        category: r.type,
        stage1_status: 'not_started',
        stage1_part: null,
        stage2_status: 'not_started',
        notes: '',
      })
    })

    return NextResponse.json({
      success: true,
      extracted,
      compliance_items: complianceItems,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
