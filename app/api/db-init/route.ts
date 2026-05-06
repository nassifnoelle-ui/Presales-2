import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'

export async function GET() {
  return POST(new Request('http://localhost/api/db-init', { method: 'POST' }) as any)
}

export async function POST(req: NextRequest) {
  try {
    // Proposals table
    await sql`
      CREATE TABLE IF NOT EXISTS proposals (
        id TEXT PRIMARY KEY,
        client TEXT NOT NULL DEFAULT '',
        project TEXT NOT NULL DEFAULT '',
        ref TEXT NOT NULL DEFAULT '',
        sector TEXT NOT NULL DEFAULT '',
        value TEXT NOT NULL DEFAULT '',
        timeline TEXT NOT NULL DEFAULT '',
        submission_date TEXT NOT NULL DEFAULT '',
        rfp_text TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'draft',
        parts_data JSONB NOT NULL DEFAULT '{}',
        parts_complete JSONB NOT NULL DEFAULT '{}',
        generated_sections JSONB NOT NULL DEFAULT '{}',
        arch_review JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `

    // Dictionary table
    await sql`
      CREATE TABLE IF NOT EXISTS dictionary (
        id TEXT PRIMARY KEY,
        part TEXT NOT NULL,
        category TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'block',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `

    // Seed dictionary if empty
    const { rows } = await sql`SELECT COUNT(*) as count FROM dictionary`
    if (parseInt(rows[0].count) === 0) {
      await seedDictionary()
    }

    return NextResponse.json({ ok: true, message: 'Database initialised' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

async function seedDictionary() {
  const blocks = [
    // Part A - Scope statements
    { id: 'a-scope-1', part: 'A', category: 'Scope statements', title: 'Standard digital platform scope', content: 'emaratech Technology Solutions shall design, develop, test, and deploy a fully functional digital platform in accordance with the requirements defined in the Business Requirements Document (BRD) agreed and signed by both parties at project initiation.', type: 'block' },
    { id: 'a-scope-2', part: 'A', category: 'Scope statements', title: 'UAE Design System compliance', content: 'All user-facing interfaces shall be designed and developed in full compliance with the UAE Government Unified Design System, including Arabic RTL layout, bilingual Arabic and English content support, approved colour palettes, and typographic standards.', type: 'block' },
    { id: 'a-scope-3', part: 'A', category: 'Scope statements', title: 'Content migration scope', content: 'emaratech shall migrate all existing content from the current platform to the new system as specified in the agreed migration plan. Content volume and structure will be confirmed during the BRD workshop. Any material variation in content volume may be subject to a formal Change Request.', type: 'block' },
    // Part A - Exclusion clauses
    { id: 'a-excl-1', part: 'A', category: 'Exclusion clauses', title: 'Third-party licences excluded', content: 'Commercial licences for all third-party platforms, including but not limited to Oracle APEX, Umbraco CMS, Microsoft Azure, and AWS, are the responsibility of [Client] and are excluded from this proposal. emaratech will advise on required licences during project initiation.', type: 'clause' },
    { id: 'a-excl-2', part: 'A', category: 'Exclusion clauses', title: 'Hardware excluded', content: 'Hardware procurement, physical server installation, network cabling, and all physical infrastructure activities are explicitly excluded from this scope of work.', type: 'clause' },
    { id: 'a-excl-3', part: 'A', category: 'Exclusion clauses', title: 'ERP integration excluded', content: 'Integration with [Client]\'s ERP system is excluded from this proposal scope. Should this integration be required, it will be assessed separately and subject to a formal Change Request with its own timeline and commercial terms.', type: 'clause' },
    { id: 'a-excl-4', part: 'A', category: 'Exclusion clauses', title: 'Out-of-scope features excluded', content: 'Any functionality, feature, workflow, or deliverable not explicitly described in the agreed Business Requirements Document (BRD) is considered out of scope. Requests for additional functionality will be assessed through the formal Change Request process.', type: 'clause' },
    // Part A - Assumptions
    { id: 'a-assum-1', part: 'A', category: 'Assumptions', title: 'Client SME availability', content: '[Client] will make designated subject matter experts (SMEs) and a named project manager available throughout the project lifecycle, with decision-making authority to approve requirements, accept deliverables, and sign off on milestones within the agreed timelines.', type: 'block' },
    { id: 'a-assum-2', part: 'A', category: 'Assumptions', title: 'Infrastructure readiness', content: '[Client]\'s infrastructure environment meets the minimum specifications required to host the delivered application. Any required infrastructure upgrades are the responsibility of [Client] and are outside emaratech scope.', type: 'block' },
    { id: 'a-assum-3', part: 'A', category: 'Assumptions', title: 'Testing environment availability', content: 'Testing environments — including development, SIT, UAT, and staging — will be made available by [Client] within two weeks of project kick-off and will remain accessible throughout the delivery lifecycle.', type: 'block' },

    // Part B - Architecture
    { id: 'b-arch-1', part: 'B', category: 'Architecture paragraphs', title: 'Layered architecture overview', content: 'emaratech proposes a layered architecture that separates concerns clearly — placing security at the perimeter, business logic in the application layer, and integrations in a dedicated integration layer that insulates the application from changes in external systems. This approach is proven across multiple UAE government digital engagements and provides a scalable, maintainable foundation for future growth.', type: 'block' },
    { id: 'b-arch-2', part: 'B', category: 'Architecture paragraphs', title: 'Reverse proxy design principle', content: 'All backend systems — including Oracle ORDS, application servers, and database interfaces — are shielded from direct internet access via a reverse proxy layer. This ensures that no application component is directly exploitable from the public internet, reducing the attack surface to a single, hardened entry point.', type: 'block' },
    { id: 'b-arch-3', part: 'B', category: 'Architecture paragraphs', title: 'Non-disruptive modernisation', content: 'emaratech\'s approach to existing system modernisation is explicitly non-disruptive. Existing business logic, data structures, and workflows are preserved in their current form. Only the presentation and integration layers are modified, eliminating migration risk and protecting [Client]\'s current operational processes.', type: 'block' },
    // Part B - Tech stack
    { id: 'b-tech-1', part: 'B', category: 'Tech stack descriptions', title: 'Oracle APEX capability', content: 'emaratech holds demonstrated Oracle APEX delivery capability across four completed UAE government projects. Our team applies the Universal Theme and Oracle APEX component framework to deliver compliant, responsive interfaces without modifying existing application business logic or database structures.', type: 'block' },
    { id: 'b-tech-2', part: 'B', category: 'Tech stack descriptions', title: 'Umbraco CMS capability', content: 'emaratech has delivered three Umbraco CMS implementations for UAE clients, including full content migration, multilingual Arabic and English configuration, editorial workflow setup, and end-user training. All implementations achieved WCAG 2.1 AA compliance.', type: 'block' },
    { id: 'b-tech-3', part: 'B', category: 'Tech stack descriptions', title: 'Flutter mobile capability', content: 'emaratech develops cross-platform mobile applications using Flutter, delivering a single codebase that runs natively on iOS and Android. This approach reduces development time by approximately 40% compared to native development while maintaining full platform-specific performance and UX standards.', type: 'block' },
    // Part B - Integration
    { id: 'b-int-1', part: 'B', category: 'Integration statements', title: 'UAEPASS integration approach', content: 'emaratech holds certified UAEPASS integration experience across two completed federal government projects. Our implementation follows the OAuth 2.0/OIDC protocol specification, with server-side token validation, refresh token management, and a tested fallback authentication flow for periods of UAEPASS unavailability. The certification process is initiated at contract award — not at go-live — to ensure it does not impact the project timeline.', type: 'block' },
    { id: 'b-int-2', part: 'B', category: 'Integration statements', title: 'API-first integration principle', content: 'emaratech applies an API-first integration approach across all external system connections. No direct database connections are made to external systems. All integrations are implemented as RESTful API-to-API calls through the integration layer, with centralised authentication, rate limiting, error handling, and audit logging.', type: 'block' },
    { id: 'b-int-3', part: 'B', category: 'Integration statements', title: 'Integration fallback design', content: 'Every integration point is designed with explicit fallback behaviour. The platform continues to function — in a degraded but operational state — when any external system is unavailable. Fallback behaviour for each integration is defined in the Integrations Document and tested as part of the System Integration Testing (SIT) phase.', type: 'block' },

    // Part C - Security
    { id: 'c-sec-1', part: 'C', category: 'Security overview', title: 'Defence in depth approach', content: 'emaratech applies a defence-in-depth security architecture across all delivered solutions. Security is not implemented as a single perimeter control but as overlapping layers — network, application, identity, data, and monitoring — each independently capable of detecting and containing threats. This approach ensures that no single control failure results in a full system compromise.', type: 'block' },
    { id: 'c-sec-2', part: 'C', category: 'Security overview', title: 'Sister company cybersecurity', content: 'emaratech works in partnership with its sister company, a dedicated cybersecurity entity, to deliver security design, WAF management, penetration testing, and UAE IA compliance review. This partnership provides [Client] with specialist security expertise without the overhead of engaging a separate security vendor.', type: 'block' },
    { id: 'c-comp-1', part: 'C', category: 'Compliance statements', title: 'UAE IA compliance statement', content: 'All delivered components shall comply with the UAE Information Assurance (IA) standards as published by the UAE Cybersecurity Council. emaratech has delivered UAE IA-compliant solutions across multiple government engagements and will provide documented evidence of compliance as part of the project deliverable set.', type: 'clause' },
    { id: 'c-comp-2', part: 'C', category: 'Compliance statements', title: 'TLS and encryption statement', content: 'All data in transit shall be encrypted using TLS 1.3 as a minimum standard. TLS 1.0 and TLS 1.1 shall be explicitly disabled across all endpoints. Certificate management, renewal, and automated expiry alerting are included in the emaratech support service for the duration of the support term.', type: 'clause' },
    { id: 'c-pen-1', part: 'C', category: 'Pen test clauses', title: 'Pre go-live penetration testing', content: 'emaratech shall commission a penetration test and vulnerability assessment of the delivered solution prior to go-live. All critical and high severity findings shall be remediated before production deployment. A remediation confirmation report shall be provided to [Client] as a formal project deliverable.', type: 'clause' },
    { id: 'c-pen-2', part: 'C', category: 'Pen test clauses', title: 'Annual penetration testing', content: 'emaratech includes an annual penetration test as part of the post-go-live support service for Gold and Platinum package clients. Results are provided in a formal report with remediation recommendations and a tracked remediation plan.', type: 'clause' },

    // Part D - Methodology
    { id: 'd-meth-1', part: 'D', category: 'Methodology paragraphs', title: 'Agile SDLC overview', content: 'emaratech delivers all projects using the Agile Software Development Life Cycle — an iterative, incremental framework that enables evolutionary delivery with fixed-interval sprints, continuous [Client] involvement, and transparent governance throughout the project lifecycle. Every sprint produces working, demonstrable software that [Client] can test and accept before the next sprint begins.', type: 'block' },
    { id: 'd-meth-2', part: 'D', category: 'Methodology paragraphs', title: 'Why Agile for government projects', content: 'Government digital projects frequently evolve as stakeholder requirements become clearer during delivery. Agile\'s iterative nature accommodates this evolution in a controlled manner — changes are assessed, prioritised, and incorporated through the sprint planning process rather than through ad-hoc scope modifications that disrupt delivery timelines.', type: 'block' },
    { id: 'd-gov-1', part: 'D', category: 'Governance clauses', title: 'BRD sign-off clause', content: '[Client] is required to review and sign the Business Requirements Document within five business days of receipt. The signed BRD constitutes the agreed baseline scope for the engagement. Any change to the BRD scope after sign-off is subject to the formal Change Request process.', type: 'clause' },
    { id: 'd-gov-2', part: 'D', category: 'Governance clauses', title: 'Change request clause', content: 'All changes to agreed project scope, design, or methodology are managed through formal Change Requests. Each CR is assessed for impact on timeline, cost, and quality before approval. Minor changes with no material impact may be absorbed at emaratech\'s discretion. Changes with timeline or cost impact require written approval from both parties before implementation.', type: 'clause' },
    { id: 'd-raci-1', part: 'D', category: 'Standard RACI', title: 'Standard project RACI', content: 'Project scope definition: A=[Client], R=PM · Architecture decisions: A=Delivery Director, R=Architect · Sprint delivery: A=Delivery Director, R=Dev Team · Requirements (BRD): A=[Client], R=BA · Change request approval: A=[Client], R=PM · Quality sign-off (UAT): R=[Client], A=QA · Go-live approval: A=[Client], R=PM', type: 'block' },

    // Part E - Support
    { id: 'e-sup-1', part: 'E', category: 'Support overview', title: 'Three-level support model', content: 'emaratech operates a structured three-level support model aligned with ITIL best practices. L1 is the client-side frontline helpdesk responsible for request intake and categorisation. L2 is emaratech\'s application support team — the primary resolution layer for P3/P4 incidents and the communication bridge for P1/P2. L3 is emaratech\'s advanced engineering team, engaged only for blocking incidents requiring code-level intervention.', type: 'block' },
    { id: 'e-sup-2', part: 'E', category: 'Support overview', title: 'Knowledge base model', content: 'emaratech maintains a continuously updated Knowledge Base containing documented workarounds, resolution procedures, and best practices. L2 consults the Knowledge Base before escalating any incident to L3. Every P1/P2 resolution results in a Knowledge Base update, reducing the time to resolve recurring incidents over the support term.', type: 'block' },
    { id: 'e-sla-1', part: 'E', category: 'SLA statements', title: 'P1 recovery commitment', content: 'For Priority 1 (Critical) incidents — defined as complete system outages with no available workaround — emaratech commits to a recovery time of 4 hours (Silver), 2 hours (Gold), or 1 hour (Platinum) from the point of confirmed escalation to L3. Recovery is defined as restoration of service availability, not resolution of root cause.', type: 'clause' },
    { id: 'e-sla-2', part: 'E', category: 'SLA statements', title: 'Rollback rights', content: 'For P1 and P2 incidents where root cause cannot be resolved within the committed recovery time, emaratech reserves the right to initiate a rollback to the last stable release as the recovery action. This restores service availability. Resolution of the underlying defect proceeds through the standard fix and release cycle.', type: 'clause' },
    { id: 'e-pkg-1', part: 'E', category: 'Package descriptions', title: 'Gold package recommendation rationale', content: 'emaratech recommends the Gold support package for this engagement. Gold provides 16x5 coverage with a 99.95% availability commitment, named L2 contact, enhanced priority handling, monthly SLA reporting, and quarterly service reviews. This level of support is appropriate for business-critical government services that require enhanced response but do not mandate round-the-clock staffed coverage.', type: 'block' },

    // Part F - Company
    { id: 'f-co-1', part: 'F', category: 'Company profile', title: 'Company overview', content: 'emaratech Technology Solutions is a UAE-based technology company with over ten years of experience delivering digital transformation programmes for UAE federal and emirate government entities, financial institutions, and enterprise clients. With a team of more than 85 engineers, architects, and delivery specialists, emaratech combines deep regional knowledge with certified technical capability across the full digital stack.', type: 'block' },
    { id: 'f-co-2', part: 'F', category: 'Company profile', title: 'Government track record', content: 'emaratech has delivered more than twelve UAE government digital projects in the past five years, spanning federal ministries, emirate government departments, and government-linked entities. Our team holds certified UAEPASS integration experience, Oracle Partner Network membership, and a track record of UAE IA-compliant delivery across all government engagements.', type: 'block' },
    { id: 'f-diff-1', part: 'F', category: 'Differentiator statements', title: 'UAEPASS differentiator', content: 'emaratech is one of a small number of UAE technology vendors with certified, production-deployed UAEPASS OAuth 2.0/OIDC integration experience. Our team has implemented national identity integration for two federal government entities, providing [Client] with a proven, low-risk approach to this mandatory requirement.', type: 'block' },
    { id: 'f-diff-2', part: 'F', category: 'Differentiator statements', title: 'Arabic RTL design differentiator', content: 'emaratech\'s design team specialises in Arabic-first digital interfaces. Every interface delivered by emaratech is designed RTL-native — not adapted from an LTR design — ensuring that Arabic users experience a platform built for their reading direction, not retrofitted to accommodate it.', type: 'block' },
    { id: 'f-diff-3', part: 'F', category: 'Differentiator statements', title: 'Sister company security differentiator', content: 'emaratech clients benefit from direct access to our sister company\'s cybersecurity capabilities, including penetration testing, WAF management, UAE IA compliance review, and SOC monitoring. This embedded security partnership eliminates the coordination overhead of engaging a separate security vendor and ensures security is integrated into delivery — not bolted on at go-live.', type: 'block' },
  ]

  for (const block of blocks) {
    await sql`
      INSERT INTO dictionary (id, part, category, title, content, type)
      VALUES (${block.id}, ${block.part}, ${block.category}, ${block.title}, ${block.content}, ${block.type})
      ON CONFLICT (id) DO NOTHING
    `
  }
}
