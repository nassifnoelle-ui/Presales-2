import { NextRequest, NextResponse } from 'next/server'

function buildPrompt(part: string, ctx: any, inputs: any, archReview: any): string {
  const base = `You are writing Part ${part} of a technical proposal for emaratech Technology Solutions.
CLIENT: ${ctx.client} | PROJECT: ${ctx.project} | REF: ${ctx.ref} | VALUE: AED ${ctx.value} | TIMELINE: ${ctx.timeline}
RFP TEXT: ${(ctx.rfp || '').slice(0, 1500)}

STRUCTURED INPUTS FROM PRE-SALES:
${JSON.stringify(inputs || {}, null, 2)}

Return ONLY valid JSON. Use the structured inputs above as the primary source — they represent pre-sales' decisions for this specific deal. Enrich with professional language but do not contradict the inputs.`

  const PROMPTS: Record<string, string> = {
    A: `${base}

Return:
{"executive_summary":"4 professional paragraphs based on exec_notes and differentiators inputs. Para1: client challenge. Para2: emaratech approach. Para3: why emaratech. Para4: delivery commitment.","scope_overview":"2 paragraphs based on scope_items input.","in_scope":${JSON.stringify(inputs?.scope_items || ['[To be defined]'])},"out_of_scope":${JSON.stringify(inputs?.oos_items || ['[To be defined]'])},"functional_requirements":[{"ref":"FR-01","category":"Design","requirement":"Full requirement","priority":"Must"},{"ref":"FR-02","category":"Identity","requirement":"Full requirement","priority":"Must"},{"ref":"FR-03","category":"Integration","requirement":"Full requirement","priority":"Should"}],"nfr":[{"category":"Performance","requirements":["req1","req2"]},{"category":"Availability","requirements":["req1","req2"]},{"category":"Security","requirements":["req1","req2"]},{"category":"Accessibility","requirements":["req1","req2"]}],"exclusions":["excl1","excl2","excl3"],"assumptions":["assum1","assum2","assum3"],"constraints":["constr1","constr2"]}`,

    B: `${base}
ARCHITECTURE REVIEW RESULT: ${archReview ? JSON.stringify(archReview) : 'Not yet reviewed'}

Return:
{"technical_understanding":"3 paragraphs based on tech_notes input. Reference architecture review decision if available.","architecture_overview":"3 paragraphs. Reference any gaps flagged in architecture review.","architecture_principles":["principle1","principle2","principle3","principle4"],"technology_stack":${JSON.stringify((inputs?.tech_stack || ['Oracle APEX','UAEPASS']).map((t: string, i: number) => ({layer: t, technologies: t, purpose: 'As selected for this engagement'})))},"integration_approach":"3 paragraphs based on integration_notes input.","infrastructure_model":"2 paragraphs on delivery model."}`,

    C: `${base}

Return:
{"security_overview":"3 paragraphs based on sec_approach input.","cybersecurity_scope":["scope1","scope2","scope3","scope4"],"compliance_standards":${JSON.stringify((inputs?.standards || ['UAE IA']).map((s: string) => ({standard: s, description: `Full compliance with ${s} requirements across all delivered components.`})))},"penetration_testing":"2 paragraphs on pre go-live testing approach.","iam_approach":"2 paragraphs on UAEPASS and identity management."}`,

    D: `${base}

Return:
{"methodology_overview":"3 paragraphs on Agile SDLC based on delivery_constraints input.","sprint_model":"2 paragraphs. Sprint length: ${inputs?.sprint_length || '2 weeks'}. Team size: ${inputs?.team_size || 'TBD'}. Sprints: ${inputs?.num_sprints || 'TBD'}.","change_management":"2 paragraphs on CR process.","release_management":"2 paragraphs on CI/CD and release pipeline.","governance":"2 paragraphs based on governance_notes input.","reporting":"2 paragraphs on reporting cadence.","approval_process":"1 paragraph on approval timelines."}`,

    E: `${base}

Return:
{"support_overview":"3 paragraphs on ITIL three-level support model.","recommended_package":"${(inputs?.package || 'Gold').split(' — ')[0]}","package_recommendation_rationale":"2 paragraphs on why ${(inputs?.package || 'Gold').split(' — ')[0]} suits this engagement based on sla_requirements and support_notes inputs.","sla_summary":"2 paragraphs on P1/P2 committed SLAs. Reference any RFP SLA requirements.","availability_commitment":"${inputs?.package?.includes('Platinum') ? '99.99%' : inputs?.package?.includes('Gold') ? '99.95%' : '99.9%'}","operational_model":"2 paragraphs on 24x7 model — automated monitoring, on-call rotation, self-healing."}`,

    F: `${base}

Return:
{"company_profile":"3 paragraphs on emaratech. Use credentials input: ${inputs?.credentials || 'Standard emaratech credentials'}.","key_differentiators":${JSON.stringify((inputs?.deal_differentiators || 'UAEPASS certified · Oracle APEX · Arabic RTL · Government track record · Sister company security').split('·').map((s: string) => s.trim()).filter(Boolean))},"project_references":[{"client":"UAE Federal Government Entity","project":"Government Portal and Identity Integration","description":"${inputs?.references || 'Full redevelopment of a federal government citizen portal with UAEPASS integration, UAE Design System compliance, and bilingual support. Delivered on time.'}","technologies":"Oracle APEX · UAEPASS · UAE Design System"},{"client":"UAE Emirate Government","project":"Supplier Management Platform","description":"Oracle APEX re-skin and supplier portal enhancement. Zero disruption to existing workflows.","technologies":"Oracle APEX · Oracle ORDS"},{"client":"UAE Government Agency","project":"Umbraco CMS Website","description":"Corporate website on Umbraco CMS with full content migration and WCAG 2.1 compliance.","technologies":"Umbraco · ASP.NET · WCAG 2.1"}],"certifications":["UAE Trade Licence — valid","Oracle Partner Network — certified","UAEPASS integration certified","UAE IA standards compliance"],"key_team":[{"role":"Solution Architect","experience":"${inputs?.team_notes || '8+ years Oracle APEX and enterprise architecture. Led 3 UAE government portal projects.'}"},{"role":"Senior UI/UX Designer","experience":"Arabic RTL specialist. UAE Design System certified. WCAG 2.1 AAA delivered."},{"role":"Identity Engineer","experience":"Certified UAEPASS OAuth 2.0/OIDC specialist. 2 federal government SSO implementations."},{"role":"Project Manager (PMP)","experience":"PMP certified. 6 UAE government projects delivered on time."}]}`,
  }

  return PROMPTS[part] || `${base}\nReturn a JSON object with the key sections for Part ${part}.`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { part, client, project, ref, value, timeline, rfp, part_inputs, arch_review, api_key } = body
    const apiKey = process.env.ANTHROPIC_API_KEY || api_key || ''

    if (!apiKey) return NextResponse.json({ error: 'No API key configured.' }, { status: 500 })

    const ctx = {
      client: client || '[Client]',
      project: project || '[Project]',
      ref: ref || '[Ref]',
      value: value || 'TBD',
      timeline: timeline || '[Timeline]',
      rfp: (rfp || '').replace(/[^\x20-\x7E\n\r\t\u0600-\u06FF]/g, ' '),
    }

    const prompt = buildPrompt(part, ctx, part_inputs || {}, arch_review || null)

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
    const section = JSON.parse(clean)
    return NextResponse.json({ success: true, section })
  } catch (err: any) {
    const msg = typeof err === 'string' ? err : (err?.message || 'Server error')
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
