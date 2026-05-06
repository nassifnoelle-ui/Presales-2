import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { message, part, part_data, rfp_text, history, api_key } = await req.json()
    const apiKey = process.env.ANTHROPIC_API_KEY || api_key || ''
    if (!apiKey) return NextResponse.json({ error: 'No API key configured.' }, { status: 500 })

    const PART_CONTEXT: Record<string, string> = {
      A: 'Part A — Opportunity and Scope. You help pre-sales with executive summaries, scope statements, exclusions, assumptions, and constraints.',
      B: 'Part B — Technical Solution. You help pre-sales with technical understanding, architecture descriptions, technology stack justifications, and integration approaches.',
      C: 'Part C — Security. You help pre-sales with security frameworks, UAE IA compliance, UAEPASS IAM, WAF, penetration testing, and cybersecurity scope.',
      D: 'Part D — Delivery Methodology. You help pre-sales with Agile SDLC descriptions, sprint models, change management, governance structures, and reporting cadences.',
      E: 'Part E — Support Services. You help pre-sales with support model descriptions, SLA commitments, package recommendations, and operational model explanations.',
      F: 'Part F — Company Credentials. You help pre-sales with company profile writing, differentiator statements, and reference descriptions.',
    }

    const systemPrompt = `You are an expert pre-sales proposal consultant at emaratech Technology Solutions — a UAE government technology company.

You are helping a pre-sales team member fill in ${PART_CONTEXT[part] || 'a proposal section'}.

CONTEXT — what the pre-sales person has entered so far:
${JSON.stringify(part_data || {}, null, 2)}

RFP REQUIREMENTS (what the client asked for):
${(rfp_text || '').slice(0, 1500)}

YOUR ROLE:
- Review what has been entered and suggest improvements
- Flag anything that seems incomplete, weak, or inconsistent with the RFP
- Suggest specific content additions
- Help write or rewrite specific sections when asked
- Be direct and specific — no generic advice
- Keep responses concise and actionable
- Always write in professional proposal language appropriate for UAE government clients

Respond conversationally but professionally. When suggesting content, format it clearly so it can be copied directly into the proposal.`

    const messages = [
      ...(history || []).map((h: any) => ({ role: h.role, content: h.content })),
      { role: 'user', content: message }
    ]

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 1000,
        system: systemPrompt,
        messages,
      })
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Anthropic error ${response.status}: ${err}`)
    }

    const data = await response.json()
    return NextResponse.json({ reply: data.content[0].text })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
