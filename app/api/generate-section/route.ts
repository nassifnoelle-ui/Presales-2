import { NextRequest, NextResponse } from 'next/server'

const PROMPTS: Record<string, (ctx: any) => string> = {
  A: (ctx) => `Write Part A — Opportunity and Scope for a technical proposal by emaratech Technology Solutions.
CLIENT: ${ctx.client} | PROJECT: ${ctx.project} | REF: ${ctx.ref} | VALUE: AED ${ctx.value} | TIMELINE: ${ctx.timeline}
RFP: ${ctx.rfp.slice(0, 2000)}
Return ONLY JSON:
{"executive_summary":"4 professional paragraphs about this specific opportunity and emaratech approach","scope_overview":"2 paragraphs describing overall scope","in_scope":["item1","item2","item3","item4","item5","item6","item7"],"out_of_scope":["item1","item2","item3","item4"],"functional_requirements":[{"ref":"FR-01","category":"Category","requirement":"Full description","priority":"Must"},{"ref":"FR-02","category":"Category","requirement":"Full description","priority":"Must"},{"ref":"FR-03","category":"Category","requirement":"Full description","priority":"Should"},{"ref":"FR-04","category":"Category","requirement":"Full description","priority":"Must"},{"ref":"FR-05","category":"Category","requirement":"Full description","priority":"Should"},{"ref":"FR-06","category":"Category","requirement":"Full description","priority":"Must"}],"nfr":[{"category":"Performance","requirements":["req1","req2","req3"]},{"category":"Availability","requirements":["req1","req2","req3"]},{"category":"Security","requirements":["req1","req2","req3"]},{"category":"Accessibility","requirements":["req1","req2"]},{"category":"Scalability","requirements":["req1","req2"]},{"category":"Compatibility","requirements":["req1","req2"]}],"exclusions":["excl1","excl2","excl3","excl4","excl5"],"assumptions":["assum1","assum2","assum3","assum4","assum5"],"constraints":["constr1","constr2","constr3","constr4"]}`,

  B: (ctx) => `Write Part B — Technical Solution for a technical proposal by emaratech Technology Solutions.
CLIENT: ${ctx.client} | PROJECT: ${ctx.project}
RFP: ${ctx.rfp.slice(0, 1500)}
Return ONLY JSON:
{"technical_understanding":"3 paragraphs on technical challenge and approach","architecture_overview":"3 paragraphs on layered architecture","architecture_principles":["principle1","principle2","principle3","principle4","principle5"],"technology_stack":[{"layer":"Frontend web","technologies":"HTML5, CSS3, JavaScript, TypeScript","purpose":"Responsive interfaces, UAE Design System, Arabic RTL"},{"layer":"CMS platform","technologies":"Umbraco CMS, ASP.NET, .NET Core","purpose":"Content management, multilingual support"},{"layer":"Portal platform","technologies":"Oracle APEX, Oracle ORDS, Oracle DB","purpose":"Citizen and supplier portals"},{"layer":"Mobile","technologies":"Flutter, Dart","purpose":"Cross-platform iOS and Android"},{"layer":"Backend API","technologies":"Java Spring Boot, Node.js, RESTful APIs","purpose":"Business logic and integrations"},{"layer":"Identity","technologies":"UAEPASS, OAuth 2.0, OIDC","purpose":"National identity and SSO"},{"layer":"Security","technologies":"WAF, OWASP CRS 3.x, TLS 1.3, SIEM","purpose":"Perimeter security and monitoring"},{"layer":"Infrastructure","technologies":"NGINX, Apache, Docker","purpose":"Reverse proxy and containerisation"},{"layer":"DevOps","technologies":"Jira, Jenkins, xl-deploy, Git, Confluence","purpose":"CI/CD and release automation"},{"layer":"Monitoring","technologies":"Grafana, Prometheus, ELK Stack","purpose":"Real-time dashboards and alerting"}],"integration_approach":"3 paragraphs on integration methodology","infrastructure_model":"2 paragraphs on hybrid delivery model"}`,

  C: (ctx) => `Write Part C — Security for a technical proposal by emaratech Technology Solutions.
CLIENT: ${ctx.client} | PROJECT: ${ctx.project}
RFP: ${ctx.rfp.slice(0, 1500)}
Return ONLY JSON:
{"security_overview":"3 paragraphs on defence in depth, UAE IA, sister company cybersecurity","cybersecurity_scope":["scope1","scope2","scope3","scope4","scope5","scope6"],"compliance_standards":[{"standard":"UAE IA","description":"Full compliance with UAE national information assurance standards"},{"standard":"OWASP CRS 3.x","description":"WAF rules based on OWASP Core Rule Set version 3.x"},{"standard":"TLS 1.3","description":"All traffic encrypted. TLS 1.0 and 1.1 disabled"},{"standard":"WCAG 2.1","description":"Accessibility compliance as security and legal requirement"},{"standard":"UAEPASS","description":"Certified UAEPASS integration — OAuth 2.0/OIDC compliant"}],"penetration_testing":"2 paragraphs on pre go-live testing and annual testing post support","iam_approach":"2 paragraphs on UAEPASS as primary IdP, RBAC, token management, fallback auth"}`,

  D: (ctx) => `Write Part D — Delivery Methodology for a technical proposal by emaratech Technology Solutions.
CLIENT: ${ctx.client} | PROJECT: ${ctx.project} | TIMELINE: ${ctx.timeline}
Return ONLY JSON:
{"methodology_overview":"3 paragraphs on Agile SDLC, iterative delivery, client-centred approach","sprint_model":"2 paragraphs on 2-4 week sprint cycle — plan, design, build, test, demo, retro","change_management":"2 paragraphs on formal CR process, CAB review, impact assessment","release_management":"2 paragraphs on continuous delivery, pre-production rehearsal, DevOps toolchain","governance":"2 paragraphs on steering committee, PM role, RACI, escalation path","reporting":"2 paragraphs on weekly status, sprint demos, steering committee","approval_process":"1 paragraph on 1-day acknowledge, 5-day comments, 5-day sign-off, 8-day max cycle"}`,

  E: (ctx) => `Write Part E — Support Services for a technical proposal by emaratech Technology Solutions.
CLIENT: ${ctx.client} | PROJECT: ${ctx.project}
Return ONLY JSON:
{"support_overview":"3 paragraphs on ITIL three-level support model — L1 client helpdesk, L2 emaratech app support, L3 advanced engineering","recommended_package":"Gold","package_recommendation_rationale":"2 paragraphs on why Gold package suits this engagement","sla_summary":"2 paragraphs on P1/P2 committed response and recovery, P3/P4 response only, release cycle for resolution","availability_commitment":"99.95%","operational_model":"2 paragraphs on three-layer 24x7 — automated monitoring, on-call rotation, self-healing automation"}`,

  F: (ctx) => `Write Part F — Company Credentials for emaratech Technology Solutions.
CLIENT: ${ctx.client} | PROJECT: ${ctx.project}
Return ONLY JSON:
{"company_profile":"3 paragraphs — UAE-based, 10+ years, 85+ engineers, Oracle partner, UAEPASS certified, government track record","key_differentiators":["diff1","diff2","diff3","diff4","diff5"],"project_references":[{"client":"UAE Federal Government Entity","project":"Government Portal and Identity Integration","description":"Full redevelopment of a federal government citizen portal with UAEPASS OAuth 2.0/OIDC integration, UAE Design System compliance, and Arabic/English bilingual support. Delivered on time within a 24-week programme.","technologies":"Oracle APEX · UAEPASS · UAE Design System"},{"client":"UAE Emirate Government","project":"Supplier Management Platform","description":"Oracle APEX Universal Theme re-skin and supplier portal enhancement. Zero disruption to existing business workflows.","technologies":"Oracle APEX · Oracle ORDS · Oracle DB"},{"client":"UAE Government Agency","project":"Umbraco CMS Website and Content Migration","description":"Corporate website redevelopment on Umbraco CMS with full content migration, bilingual support, and WCAG 2.1 compliance. Editorial team fully independent post handover.","technologies":"Umbraco · ASP.NET · WCAG 2.1"}],"certifications":["UAE Trade Licence — valid and current","Oracle Partner Network — certified","UAEPASS integration certified","UAE IA standards compliance delivered"],"key_team":[{"role":"Solution Architect","experience":"8+ years Oracle APEX and enterprise architecture. Led 3 UAE government portal projects."},{"role":"Senior UI/UX Designer","experience":"Arabic RTL design specialist. UAE Design System certified. WCAG 2.1 AAA delivered."},{"role":"Identity Engineer","experience":"Certified UAEPASS OAuth 2.0/OIDC specialist. 2 federal government SSO implementations."},{"role":"Project Manager (PMP)","experience":"PMP certified. 6 UAE government projects delivered on time."}]}`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { part, client, project, ref, value, timeline, rfp, api_key } = body
    const apiKey = process.env.ANTHROPIC_API_KEY || api_key || ''

    if (!apiKey) return NextResponse.json({ error: 'No API key. Add ANTHROPIC_API_KEY in Vercel or enter it on screen.' }, { status: 500 })
    if (!PROMPTS[part]) return NextResponse.json({ error: 'Unknown part: ' + part }, { status: 400 })

    const ctx = {
      client: client || '[Client]',
      project: project || '[Project]',
      ref: ref || '[Ref]',
      value: value || 'TBD',
      timeline: timeline || '[Timeline]',
      rfp: (rfp || '').replace(/[\\"]/g, ' ').replace(/[\u0000-\u001F]/g, ' '),
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 2500,
        messages: [{ role: 'user', content: PROMPTS[part](ctx) }]
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
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
