import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { rfp_text, dow_text, client, project, api_key } = await req.json()
    const apiKey = process.env.ANTHROPIC_API_KEY || api_key || ''
    if (!apiKey) return NextResponse.json({ error: 'No API key configured.' }, { status: 500 })

    const rawSource = rfp_text || dow_text || ''
    if (rawSource.trim().length < 50) {
      return NextResponse.json({ error: 'RFP text too short to extract requirements.' }, { status: 400 })
    }

    // Aggressive sanitisation — strip everything that can break JSON
    const source = rawSource
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ')
      .replace(/\\/g, '/')
      .replace(/`/g, "'")
      .replace(/\u2019|\u2018/g, "'")
      .replace(/\u201C|\u201D/g, '"')
      .replace(/\u2013|\u2014/g, '-')
      .trim()

    const safeSrc = source
      .replace(/[^\x20-\x7E\n\r\t\u0600-\u06FF\u0750-\u077F]/g, ' ')
      .slice(0, 5000)

    const prompt = `You are a senior pre-sales consultant and bid manager at emaratech Technology Solutions conducting a THOROUGH and RIGOROUS extraction of an RFP document.

CLIENT: ${client || '[Client]'}
PROJECT: ${project || '[Project]'}

YOUR TASK:
Read every line of this document carefully. Extract EVERYTHING that matters — do not summarise vaguely. Be specific, literal, and exhaustive. A requirement missed here will result in a non-compliant proposal.

CRITICAL EXTRACTION RULES:
1. Extract EXACT requirements — quote directly from the document where possible
2. Identify ALL deadlines, dates, and timeframes — missing a submission deadline is catastrophic
3. Extract ALL penalties, liquidated damages, and financial risks — these are HIGH priority risks
4. Extract ALL mandatory submission documents — missing one can disqualify the bid
5. Extract ALL named technologies, platforms, and tools mentioned — these define the tech stack
6. Extract ALL compliance standards, certifications, and regulatory requirements
7. Extract ALL commercial terms — bid bond, validity period, payment milestones, warranty
8. Flag ALL contradictions and ambiguities in the document as risks
9. Rate confidence HIGH only if the document is clear and complete — be honest

DOCUMENT:
${safeSrc}

Return ONLY valid JSON with no markdown, no code blocks, no explanation. Every string value must use only standard ASCII quotes and no special characters.

{
  "functional_requirements": [
    {
      "ref": "FR-01",
      "requirement": "EXACT requirement text from document — be specific not vague",
      "priority": "Must",
      "source": "exact section or quote from document",
      "category": "one of: Identity/CMS/Portal/Integration/UI/Accessibility/Mobile/AI/Reporting/Admin/Other",
      "severity": "one of: Critical/High/Medium/Low"
    }
  ],
  "non_functional_requirements": [
    {
      "ref": "NFR-01",
      "category": "one of: Performance/Availability/Security/Accessibility/Scalability/Compatibility/Data/Disaster Recovery",
      "requirement": "EXACT requirement with specific targets if stated",
      "target": "specific measurable target e.g. 99.9% uptime, less than 3 second page load",
      "priority": "Must"
    }
  ],
  "technical_requirements": [
    {
      "ref": "TR-01",
      "area": "one of: Platform/Infrastructure/Integration/Security/DevOps/Architecture/Database/Hosting/Licensing",
      "requirement": "EXACT technical requirement — name specific technologies if mentioned",
      "notes": "any constraints or additional context",
      "priority": "Must"
    }
  ],
  "mandatory_submissions": [
    {
      "ref": "MS-01",
      "document": "exact name of mandatory document or deliverable",
      "description": "what it must contain",
      "consequence": "what happens if missing e.g. bid disqualified"
    }
  ],
  "submission_timeline": {
    "submission_deadline": "EXACT date and time if stated — this is CRITICAL",
    "project_start": "exact date or TBD",
    "project_end": "exact date or TBD",
    "delivery_duration": "exact duration if stated",
    "proposal_validity": "exact validity period if stated e.g. 90 days",
    "key_dates": [
      {
        "date": "exact date or relative period",
        "event": "exact description of milestone, deadline, or phase",
        "critical": true
      }
    ]
  },
  "commercial_terms": {
    "estimated_value": "exact value if stated",
    "bid_bond": "exact requirement — amount, format, validity",
    "performance_bond": "exact requirement if stated",
    "payment_terms": "exact payment milestone structure if stated",
    "warranty_period": "exact period if stated",
    "validity_period": "exact proposal validity if stated",
    "pricing_structure": "description of required pricing format e.g. phase-wise BoQ"
  },
  "evaluation_criteria": [
    {
      "criterion": "exact criterion name",
      "weight": "exact percentage or score if stated",
      "threshold": "minimum pass score if stated",
      "notes": "any specific sub-criteria"
    }
  ],
  "constraints": [
    {
      "ref": "CON-01",
      "constraint": "EXACT constraint — be specific",
      "type": "one of: Technical/Commercial/Regulatory/Timeline/Resource/Legal",
      "impact": "what this means for emaratech's delivery or proposal"
    }
  ],
  "risks": [
    {
      "ref": "RISK-01",
      "risk": "SPECIFIC risk — name the exact clause, penalty, or condition creating the risk",
      "likelihood": "High/Medium/Low",
      "impact": "High/Medium/Low",
      "financial_exposure": "exact penalty or exposure if stated e.g. 2x contract value, 0.5% per day",
      "source": "exact section or quote from document",
      "mitigation": "suggested mitigation for pre-sales"
    }
  ],
  "compliance_standards": [
    {
      "ref": "COMP-01",
      "standard": "exact standard or regulation name",
      "mandatory": true,
      "evidence_required": "what proof or certification is needed in the proposal"
    }
  ],
  "additional_notes": "Detailed paragraph covering: ambiguities in the document, contradictions between sections, items that need clarification before submission, strategic observations for pre-sales.",
  "extraction_summary": {
    "total_functional": 0,
    "total_nfr": 0,
    "total_technical": 0,
    "total_risks": 0,
    "total_constraints": 0,
    "mandatory_docs_count": 0,
    "critical_risks": 0,
    "confidence": "High/Medium/Low",
    "confidence_note": "Honest assessment of document clarity and extraction completeness",
    "top_3_risks": ["most critical risk 1", "most critical risk 2", "most critical risk 3"]
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
        max_tokens: 8000,
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

    let extracted: any
    try {
      extracted = JSON.parse(clean)
    } catch {
      // Try to extract just the JSON object if there's surrounding text
      const match = clean.match(/\{[\s\S]*\}/)
      if (match) {
        extracted = JSON.parse(match[0])
      } else {
        throw new Error('Could not parse AI response as JSON. The document may contain unusual characters.')
      }
    }

    // Build compliance sheet — include everything important
    const complianceItems: any[] = []

    const addItems = (items: any[], type: string, reqField: string) => {
      ;(items || []).forEach((r: any) => {
        complianceItems.push({
          ref: r.ref,
          type,
          requirement: r[reqField] || r.requirement || r.constraint || r.document || '',
          priority: r.priority || r.mandatory ? 'Must' : 'Should',
          category: r.category || r.area || r.type || 'General',
          severity: r.severity || r.impact || 'Medium',
          source: r.source || '',
          financial_exposure: r.financial_exposure || '',
          stage1_status: 'not_started',
          stage1_part: null,
          stage2_status: 'not_started',
          notes: '',
        })
      })
    }

    addItems(extracted.functional_requirements || [], 'Functional', 'requirement')
    addItems(extracted.non_functional_requirements || [], 'Non-functional', 'requirement')
    addItems(extracted.technical_requirements || [], 'Technical', 'requirement')
    addItems(extracted.mandatory_submissions || [], 'Mandatory submission', 'document')
    addItems(extracted.constraints || [], 'Constraint', 'constraint')
    addItems(extracted.compliance_standards || [], 'Compliance', 'standard')

    // Add risks as high-priority items
    ;(extracted.risks || []).forEach((r: any) => {
      complianceItems.push({
        ref: r.ref,
        type: 'Risk',
        requirement: r.risk,
        priority: r.impact === 'High' ? 'Must' : 'Should',
        category: 'Risk',
        severity: r.impact || 'Medium',
        source: r.source || '',
        financial_exposure: r.financial_exposure || '',
        stage1_status: 'not_started',
        stage1_part: null,
        stage2_status: 'not_started',
        notes: r.mitigation || '',
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
