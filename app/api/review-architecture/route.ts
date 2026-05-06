import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { arch_text, rfp_text, client, project, round, previous_review, response_to_comments, api_key } = body
    const apiKey = process.env.ANTHROPIC_API_KEY || api_key || ''

    if (!apiKey) return NextResponse.json({ error: 'No API key configured.' }, { status: 500 })
    if (!arch_text || arch_text.trim().length < 100) return NextResponse.json({ error: 'Architecture document too short or could not be read.' }, { status: 400 })

    const isSecondRound = round === 2

    const prompt = isSecondRound ? `You are a senior solution architect reviewer at emaratech Technology Solutions conducting a SECOND ROUND architecture review.

PROJECT: ${project || '[Project]'}
CLIENT: ${client || '[Client]'}

ORIGINAL REVIEW GAPS AND COMMENTS:
${previous_review || 'Not provided'}

ARCHITECT RESPONSE TO COMMENTS:
${response_to_comments || 'Not provided'}

REVISED ARCHITECTURE DOCUMENT:
${arch_text.slice(0, 4000)}

RFP REQUIREMENTS (for reference):
${(rfp_text || '').slice(0, 1500)}

This is a FOCUSED second round review. Do not re-review the entire document. Focus ONLY on:
1. Were the flagged gaps addressed?
2. Are the architect's responses to comments satisfactory?
3. Were any new issues introduced?

Return ONLY valid JSON:
{
  "round": 2,
  "gaps_addressed": [
    {"gap": "original gap description", "status": "Resolved", "comment": "how it was addressed"},
    {"gap": "original gap description", "status": "Partially resolved", "comment": "what is still missing"},
    {"gap": "original gap description", "status": "Not addressed", "comment": "still missing from document"}
  ],
  "new_issues": [
    {"issue": "description of new issue introduced", "severity": "High"}
  ],
  "response_assessment": "2 sentences assessing whether the architect's written responses to comments are satisfactory and demonstrate understanding of the gaps.",
  "decision": "Approved",
  "decision_rationale": "2 specific sentences explaining the final decision based on what was and was not addressed.",
  "escalate_to_director": false,
  "escalation_reason": ""
}

Decision must be one of: Approved / Proceed with comments / Escalate to delivery director` 

    : `You are a senior solution architect reviewer at emaratech Technology Solutions conducting a FIRST ROUND architecture review.

PROJECT: ${project || '[Project]'}
CLIENT: ${client || '[Client]'}

ARCHITECTURE DOCUMENT:
${arch_text.slice(0, 4000)}

RFP REQUIREMENTS:
${(rfp_text || '').slice(0, 1500)}

Review this architecture document rigorously across five dimensions. Return ONLY valid JSON:
{
  "round": 1,
  "completeness": {
    "score": 3,
    "assessment": "2 sentences on whether all RFP components are addressed in the architecture.",
    "missing": ["missing item 1", "missing item 2", "missing item 3"]
  },
  "soundness": {
    "score": 4,
    "assessment": "2 sentences on whether the design is logically consistent, defensible, and free of contradictions.",
    "issues": ["issue 1 if any", "issue 2 if any"]
  },
  "technology_alignment": {
    "score": 3,
    "assessment": "2 sentences on whether technology choices match RFP requirements and emaratech capabilities.",
    "misalignments": ["misalignment 1 if any", "misalignment 2 if any"]
  },
  "security_coverage": {
    "score": 4,
    "assessment": "2 sentences on WAF, TLS, UAEPASS, UAE IA, penetration testing coverage.",
    "gaps": ["gap 1 if any"]
  },
  "integration_coverage": {
    "score": 3,
    "assessment": "2 sentences on whether all named integrations are designed with sufficient detail.",
    "gaps": ["gap 1 if any", "gap 2 if any"]
  },
  "overall_score": 70,
  "key_strengths": ["strength 1", "strength 2", "strength 3"],
  "critical_gaps": ["critical gap 1", "critical gap 2"],
  "comments_for_architect": ["specific actionable comment 1", "specific actionable comment 2", "specific actionable comment 3", "specific actionable comment 4"],
  "decision": "Proceed with comments",
  "decision_rationale": "2 specific sentences explaining the decision based on the review findings.",
  "second_round_required": true,
  "second_round_instructions": "Specific instructions to the architect on what must be addressed before second round approval."
}

Scores are 1-5. Overall score is 0-100.
Decision must be exactly one of: Approved / Proceed with comments / Rejected`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 2500,
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
    const review = JSON.parse(clean)
    return NextResponse.json({ success: true, review })
  } catch (err: any) {
    const msg = typeof err === 'string' ? err : (err?.message || 'Server error')
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
