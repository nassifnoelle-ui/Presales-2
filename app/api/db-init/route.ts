import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'

export async function GET() {
  return init()
}

export async function POST() {
  return init()
}

async function init() {
  try {
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
        dow_text TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'draft',
        stage0_data JSONB,
        stage0_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
        compliance_items JSONB NOT NULL DEFAULT '[]',
        parts_data JSONB NOT NULL DEFAULT '{}',
        parts_complete JSONB NOT NULL DEFAULT '{}',
        generated_sections JSONB NOT NULL DEFAULT '{}',
        arch_review JSONB,
        cost_sheet JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `

    // Add missing columns to existing tables (safe to run multiple times)
    const alterColumns = [
      `ALTER TABLE proposals ADD COLUMN IF NOT EXISTS dow_text TEXT NOT NULL DEFAULT ''`,
      `ALTER TABLE proposals ADD COLUMN IF NOT EXISTS stage0_data JSONB`,
      `ALTER TABLE proposals ADD COLUMN IF NOT EXISTS stage0_confirmed BOOLEAN NOT NULL DEFAULT FALSE`,
      `ALTER TABLE proposals ADD COLUMN IF NOT EXISTS compliance_items JSONB NOT NULL DEFAULT '[]'`,
      `ALTER TABLE proposals ADD COLUMN IF NOT EXISTS cost_sheet JSONB`,
    ]
    for (const stmt of alterColumns) {
      try { await sql.query(stmt) } catch {}
    }

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

    const { rows } = await sql`SELECT COUNT(*) as count FROM dictionary`
    if (parseInt(rows[0].count) === 0) {
      await seedDictionary()
    }

    return NextResponse.json({ ok: true, message: 'Database initialised successfully' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

async function seedDictionary() {
  const blocks = [
    { id:'a-scope-1', part:'A', category:'Scope statements', title:'Standard digital platform scope', content:'emaratech Technology Solutions shall design, develop, test, and deploy a fully functional digital platform in accordance with the requirements defined in the Business Requirements Document (BRD) agreed and signed by both parties at project initiation.', type:'block' },
    { id:'a-scope-2', part:'A', category:'Scope statements', title:'UAE Design System compliance', content:'All user-facing interfaces shall be designed and developed in full compliance with the UAE Government Unified Design System, including Arabic RTL layout, bilingual Arabic and English content support, approved colour palettes, and typographic standards.', type:'block' },
    { id:'a-scope-3', part:'A', category:'Scope statements', title:'Content migration scope', content:'emaratech shall migrate all existing content from the current platform to the new system as specified in the agreed migration plan. Content volume and structure will be confirmed during the BRD workshop. Any material variation in content volume may be subject to a formal Change Request.', type:'block' },
    { id:'a-excl-1', part:'A', category:'Exclusion clauses', title:'Third-party licences excluded', content:'Commercial licences for all third-party platforms, including but not limited to Oracle APEX, Umbraco CMS, Microsoft Azure, and AWS, are the responsibility of [Client] and are excluded from this proposal.', type:'clause' },
    { id:'a-excl-2', part:'A', category:'Exclusion clauses', title:'Hardware excluded', content:'Hardware procurement, physical server installation, network cabling, and all physical infrastructure activities are explicitly excluded from this scope of work.', type:'clause' },
    { id:'a-excl-3', part:'A', category:'Exclusion clauses', title:'Out-of-scope features excluded', content:'Any functionality, feature, workflow, or deliverable not explicitly described in the agreed Business Requirements Document (BRD) is considered out of scope. Requests for additional functionality will be assessed through the formal Change Request process.', type:'clause' },
    { id:'a-assum-1', part:'A', category:'Assumptions', title:'Client SME availability', content:'[Client] will make designated subject matter experts (SMEs) and a named project manager available throughout the project lifecycle, with decision-making authority to approve requirements, accept deliverables, and sign off on milestones within the agreed timelines.', type:'block' },
    { id:'a-assum-2', part:'A', category:'Assumptions', title:'Infrastructure readiness', content:'[Client]\'s infrastructure environment meets the minimum specifications required to host the delivered application. Any required infrastructure upgrades are the responsibility of [Client] and are outside emaratech scope.', type:'block' },
    { id:'a-assum-3', part:'A', category:'Assumptions', title:'Testing environment availability', content:'Testing environments — including development, SIT, UAT, and staging — will be made available by [Client] within two weeks of project kick-off and will remain accessible throughout the delivery lifecycle.', type:'block' },
    { id:'b-arch-1', part:'B', category:'Architecture paragraphs', title:'Layered architecture overview', content:'emaratech proposes a layered architecture that separates concerns clearly — placing security at the perimeter, business logic in the application layer, and integrations in a dedicated integration layer that insulates the application from changes in external systems.', type:'block' },
    { id:'b-arch-2', part:'B', category:'Architecture paragraphs', title:'Reverse proxy design principle', content:'All backend systems are shielded from direct internet access via a reverse proxy layer. This ensures that no application component is directly exploitable from the public internet, reducing the attack surface to a single, hardened entry point.', type:'block' },
    { id:'b-arch-3', part:'B', category:'Architecture paragraphs', title:'Non-disruptive modernisation', content:'emaratech\'s approach to existing system modernisation is explicitly non-disruptive. Existing business logic, data structures, and workflows are preserved. Only the presentation and integration layers are modified, eliminating migration risk.', type:'block' },
    { id:'b-tech-1', part:'B', category:'Tech stack descriptions', title:'Oracle APEX capability', content:'emaratech holds demonstrated Oracle APEX delivery capability across four completed UAE government projects. Our team applies the Universal Theme and Oracle APEX component framework to deliver compliant, responsive interfaces without modifying existing application business logic.', type:'block' },
    { id:'b-tech-2', part:'B', category:'Tech stack descriptions', title:'Umbraco CMS capability', content:'emaratech has delivered three Umbraco CMS implementations for UAE clients, including full content migration, multilingual Arabic and English configuration, editorial workflow setup, and end-user training.', type:'block' },
    { id:'b-int-1', part:'B', category:'Integration statements', title:'UAEPASS integration approach', content:'emaratech holds certified UAEPASS integration experience. Our implementation follows the OAuth 2.0/OIDC protocol specification, with server-side token validation, refresh token management, and a tested fallback authentication flow for periods of UAEPASS unavailability.', type:'block' },
    { id:'b-int-2', part:'B', category:'Integration statements', title:'API-first integration principle', content:'emaratech applies an API-first integration approach across all external system connections. No direct database connections are made to external systems. All integrations are implemented as RESTful API-to-API calls through the integration layer.', type:'block' },
    { id:'c-sec-1', part:'C', category:'Security overview', title:'Defence in depth approach', content:'emaratech applies a defence-in-depth security architecture across all delivered solutions. Security is implemented as overlapping layers — network, application, identity, data, and monitoring — each independently capable of detecting and containing threats.', type:'block' },
    { id:'c-sec-2', part:'C', category:'Security overview', title:'Sister company cybersecurity', content:'emaratech works in partnership with its sister company, a dedicated cybersecurity entity, to deliver security design, WAF management, penetration testing, and UAE IA compliance review.', type:'block' },
    { id:'c-comp-1', part:'C', category:'Compliance statements', title:'UAE IA compliance statement', content:'All delivered components shall comply with the UAE Information Assurance (IA) standards as published by the UAE Cybersecurity Council. emaratech will provide documented evidence of compliance as part of the project deliverable set.', type:'clause' },
    { id:'c-comp-2', part:'C', category:'Compliance statements', title:'TLS and encryption statement', content:'All data in transit shall be encrypted using TLS 1.3 as a minimum standard. TLS 1.0 and TLS 1.1 shall be explicitly disabled across all endpoints.', type:'clause' },
    { id:'c-pen-1', part:'C', category:'Pen test clauses', title:'Pre go-live penetration testing', content:'emaratech shall commission a penetration test and vulnerability assessment prior to go-live. All critical and high severity findings shall be remediated before production deployment.', type:'clause' },
    { id:'d-meth-1', part:'D', category:'Methodology paragraphs', title:'Agile SDLC overview', content:'emaratech delivers all projects using the Agile Software Development Life Cycle — an iterative, incremental framework that enables evolutionary delivery with fixed-interval sprints, continuous client involvement, and transparent governance throughout.', type:'block' },
    { id:'d-gov-1', part:'D', category:'Governance clauses', title:'BRD sign-off clause', content:'[Client] is required to review and sign the Business Requirements Document within five business days of receipt. The signed BRD constitutes the agreed baseline scope. Any change after sign-off is subject to the formal Change Request process.', type:'clause' },
    { id:'d-gov-2', part:'D', category:'Governance clauses', title:'Change request clause', content:'All changes to agreed project scope, design, or methodology are managed through formal Change Requests. Each CR is assessed for impact on timeline, cost, and quality before approval.', type:'clause' },
    { id:'e-sup-1', part:'E', category:'Support overview', title:'Three-level support model', content:'emaratech operates a structured three-level support model aligned with ITIL best practices. L1 is the client-side frontline helpdesk. L2 is emaratech\'s application support team. L3 is emaratech\'s advanced engineering team, engaged only for blocking incidents requiring code-level intervention.', type:'block' },
    { id:'e-sla-1', part:'E', category:'SLA statements', title:'P1 recovery commitment', content:'For Priority 1 incidents — complete system outages with no available workaround — emaratech commits to a recovery time of 4 hours (Silver), 2 hours (Gold), or 1 hour (Platinum) from confirmed escalation to L3.', type:'clause' },
    { id:'e-pkg-1', part:'E', category:'Package descriptions', title:'Gold package recommendation', content:'emaratech recommends the Gold support package for this engagement. Gold provides 16x5 coverage with a 99.95% availability commitment, named L2 contact, enhanced priority handling, monthly SLA reporting, and quarterly service reviews.', type:'block' },
    { id:'f-co-1', part:'F', category:'Company profile', title:'Company overview', content:'emaratech Technology Solutions is a UAE-based technology company with over ten years of experience delivering digital transformation programmes for UAE federal and emirate government entities. With a team of more than 85 engineers, architects, and delivery specialists, emaratech combines deep regional knowledge with certified technical capability.', type:'block' },
    { id:'f-co-2', part:'F', category:'Company profile', title:'Government track record', content:'emaratech has delivered more than twelve UAE government digital projects in the past five years, spanning federal ministries, emirate government departments, and government-linked entities. Our team holds certified UAEPASS integration experience, Oracle Partner Network membership, and a track record of UAE IA-compliant delivery.', type:'block' },
    { id:'f-diff-1', part:'F', category:'Differentiator statements', title:'UAEPASS differentiator', content:'emaratech is one of a small number of UAE technology vendors with certified, production-deployed UAEPASS OAuth 2.0/OIDC integration experience across two completed federal government entities.', type:'block' },
    { id:'f-diff-2', part:'F', category:'Differentiator statements', title:'Arabic RTL design differentiator', content:'emaratech\'s design team specialises in Arabic-first digital interfaces. Every interface is designed RTL-native — not adapted from an LTR design — ensuring Arabic users experience a platform built for their reading direction.', type:'block' },
  ]

  for (const block of blocks) {
    await sql`
      INSERT INTO dictionary (id, part, category, title, content, type)
      VALUES (${block.id}, ${block.part}, ${block.category}, ${block.title}, ${block.content}, ${block.type})
      ON CONFLICT (id) DO NOTHING
    `
  }
}
