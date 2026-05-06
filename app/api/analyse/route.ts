import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { rfp_text, client, ref, sector, estimated_value, api_key } = body
    const apiKey = process.env.ANTHROPIC_API_KEY || api_key || ''

    if (!apiKey) return NextResponse.json({ error: 'No API key. Add ANTHROPIC_API_KEY in Vercel or enter it on screen.' }, { status: 500 })
    if (!rfp_text || rfp_text.trim().length < 50) return NextResponse.json({ error: 'RFP text too short.' }, { status: 400 })

    const safe = rfp_text.replace(/[^\x20-\x7E\n\r\t\u0600-\u06FF]/g, ' ').slice(0, 3000)

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 3000,
        messages: [{
          role: 'user',
          content: `Analyse this RFP for emaratech Technology Solutions. Return ONLY valid JSON, no markdown.

CLIENT: ${client || 'Unknown'}
REFERENCE: ${ref || 'REF-001'}
SECTOR: ${sector || 'Government'}
VALUE: ${estimated_value || 'TBD'}

RFP:
${safe}

Return this JSON:
{
  "summary": {
    "deadline": "extract or TBD",
    "est_value": "${estimated_value || 'TBD'}",
    "key_requirements": ["req1","req2","req3","req4","req5","req6"],
    "tech_stack_mentioned": ["tech1","tech2","tech3"],
    "risks_identified": ["risk1","risk2","risk3"]
  },
  "scorecard": {
    "total_weighted_score": 74,
    "decision": "Proceed with Caution",
    "rationale": "Two specific sentences about this RFP.",
    "risk_flags": ["risk1","risk2"],
    "category_averages": [
      {"name":"Strategic Alignment","avg":3.8,"weight":20},
      {"name":"Client and Stakeholder","avg":3.3,"weight":15},
      {"name":"Business and Financial","avg":4.0,"weight":20},
      {"name":"Technical Feasibility","avg":3.5,"weight":20},
      {"name":"Delivery Capability","avg":3.3,"weight":15},
      {"name":"Risk and Governance","avg":3.5,"weight":10}
    ],
    "criteria": [
      {"category":"Strategic Alignment","criterion":"Strategic Fit","weight":5,"score":4,"comment":"specific comment"},
      {"category":"Strategic Alignment","criterion":"Sector Alignment","weight":5,"score":4,"comment":"specific comment"},
      {"category":"Strategic Alignment","criterion":"Capability Match","weight":5,"score":4,"comment":"specific comment"},
      {"category":"Strategic Alignment","criterion":"Innovation Value","weight":5,"score":3,"comment":"specific comment"},
      {"category":"Client and Stakeholder","criterion":"Client Credibility","weight":4,"score":4,"comment":"specific comment"},
      {"category":"Client and Stakeholder","criterion":"Decision Authority","weight":4,"score":3,"comment":"specific comment"},
      {"category":"Client and Stakeholder","criterion":"Relationship Strength","weight":4,"score":3,"comment":"specific comment"},
      {"category":"Client and Stakeholder","criterion":"Stakeholder Alignment","weight":3,"score":3,"comment":"specific comment"},
      {"category":"Business and Financial","criterion":"Revenue Potential","weight":6,"score":4,"comment":"specific comment"},
      {"category":"Business and Financial","criterion":"Profitability","weight":6,"score":4,"comment":"specific comment"},
      {"category":"Business and Financial","criterion":"Budget Availability","weight":5,"score":4,"comment":"specific comment"},
      {"category":"Business and Financial","criterion":"Payment Risk","weight":3,"score":4,"comment":"specific comment"},
      {"category":"Technical Feasibility","criterion":"Solution Complexity","weight":6,"score":3,"comment":"specific comment"},
      {"category":"Technical Feasibility","criterion":"Technology Fit","weight":5,"score":4,"comment":"specific comment"},
      {"category":"Technical Feasibility","criterion":"Integration Requirements","weight":5,"score":3,"comment":"specific comment"},
      {"category":"Technical Feasibility","criterion":"Security and Compliance","weight":4,"score":4,"comment":"specific comment"},
      {"category":"Delivery Capability","criterion":"Resource Availability","weight":4,"score":3,"comment":"specific comment"},
      {"category":"Delivery Capability","criterion":"Timeline Feasibility","weight":4,"score":3,"comment":"specific comment"},
      {"category":"Delivery Capability","criterion":"SMD Readiness","weight":4,"score":4,"comment":"specific comment"},
      {"category":"Delivery Capability","criterion":"Delivery Risk","weight":3,"score":3,"comment":"specific comment"},
      {"category":"Risk and Governance","criterion":"Regulatory Compliance","weight":3,"score":4,"comment":"specific comment"},
      {"category":"Risk and Governance","criterion":"Contractual Acceptability","weight":2,"score":3,"comment":"specific comment"},
      {"category":"Risk and Governance","criterion":"Competitive Position","weight":2,"score":3,"comment":"specific comment"},
      {"category":"Risk and Governance","criterion":"Reputational Risk","weight":3,"score":4,"comment":"specific comment"}
    ]
  }
}`
        }]
      })
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Anthropic error ${response.status}: ${err}`)
    }

    const data = await response.json()
    const raw = data.content[0].text
    const clean = raw.replace(/```json|```/g, '').trim()
    const analysis = JSON.parse(clean)
    return NextResponse.json({ success: true, analysis })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
