import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { client, ref, project, value, timeline, sections } = await req.json()

    const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
      AlignmentType, BorderStyle, WidthType, ShadingType, LevelFormat,
      Header, Footer, ImageRun, PageBreak, HeadingLevel } = await import('docx')

    const C = {
      dark: '043336', mid: '184A4F', teal: '297D7D', bright: '2ED5C8',
      white: 'FFFFFF', off: 'F0FAFA', grayL: 'F5FAFA', grayM: 'D5EEEC',
      textL: '297D7D', amber: 'BA7517', amberL: 'FFF8E0'
    }

    const noBdrs = () => ({ top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' } })
    const bdr = (c = C.grayM, s = 1) => ({ style: BorderStyle.SINGLE, size: s, color: c })
    const bdrs = (c = C.grayM) => ({ top: bdr(c), bottom: bdr(c), left: bdr(c), right: bdr(c) })

    const T = (t: string, o: any = {}) => new TextRun({ text: String(t || ''), font: 'Arial', size: 20, color: C.dark, ...o })
    const Tw = (t: string, o: any = {}) => T(t, { color: C.white, ...o })
    const P = (ch: any, o: any = {}) => new Paragraph({ children: Array.isArray(ch) ? ch : [ch], spacing: { after: 140 }, ...o })
    const Pc = (ch: any, o: any = {}) => P(ch, { alignment: AlignmentType.CENTER, ...o })
    const Space = () => new Paragraph({ children: [T('')], spacing: { after: 120 } })
    const PgBrk = () => new Paragraph({ children: [new PageBreak()], spacing: { after: 0 } })
    const Bul = (t: string) => new Paragraph({ numbering: { reference: 'bul', level: 0 }, children: [T(t, { size: 19 })], spacing: { after: 80 } })
    const H2 = (t: string) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [T(t, { bold: true, size: 22, color: C.mid })], spacing: { before: 280, after: 120 } })

    const Banner = (title: string, sub = '') => new Table({
      width: { size: 9200, type: WidthType.DXA }, columnWidths: [9200],
      rows: [new TableRow({ children: [new TableCell({ children: [P([Tw(title, { bold: true, size: 26 })], { spacing: { after: sub ? 60 : 0 } }), ...(sub ? [P([Tw(sub, { size: 18, color: 'B0D5D3' })], { spacing: { after: 0 } })] : [])], width: { size: 9200, type: WidthType.DXA }, margins: { top: 220, bottom: 220, left: 280, right: 280 }, borders: noBdrs(), shading: { fill: C.dark, type: ShadingType.CLEAR } })] })]
    })

    const mkCell = (children: any[], width: number, bg = C.white, opts: any = {}) => {
      const { borders: b = bdrs(), margins = { top: 100, bottom: 100, left: 140, right: 140 } } = opts
      return new TableCell({ children, width: { size: width, type: WidthType.DXA }, shading: { fill: bg, type: ShadingType.CLEAR }, borders: b, margins })
    }
    const Hc = (t: string, w: number, bg = C.dark) => mkCell([P([Tw(t, { bold: true, size: 18 })], { alignment: AlignmentType.CENTER, spacing: { after: 0 } })], w, bg, { borders: bdrs(bg) })
    const Dc = (t: string, w: number, bg = C.white, bold = false) => mkCell([P([T(t, { bold, size: 18 })], { spacing: { after: 0 } })], w, bg)

    const PART_LABELS: Record<string, string> = {
      A: 'Part A — Opportunity and Scope', B: 'Part B — Technical Solution',
      C: 'Part C — Security', D: 'Part D — Delivery Methodology',
      E: 'Part E — Support Services', F: 'Part F — Company Credentials',
    }

    const children: any[] = []

    // Cover
    children.push(new Table({
      width: { size: 9200, type: WidthType.DXA }, columnWidths: [9200],
      rows: [new TableRow({ children: [new TableCell({
        children: [
          Pc([Tw('TECHNICAL PROPOSAL', { size: 16, characterSpacing: 400, color: C.bright })], { spacing: { after: 100 } }),
          Pc([Tw(project || '[Project Name]', { bold: true, size: 48, color: C.white })], { spacing: { after: 100 } }),
          Pc([T('emaratech Technology Solutions', { size: 22, color: 'B0D5D3' })], { spacing: { after: 400 } }),
          new Table({
            width: { size: 8400, type: WidthType.DXA }, columnWidths: [2100, 2100, 2100, 2100],
            rows: [new TableRow({ children: [
              mkCell([P([Tw('Client', { size: 13, color: '7DD5CF' })], { spacing: { after: 30 } }), P([Tw(client || '[Client]', { bold: true, size: 18 })], { spacing: { after: 0 } })], 2100, C.mid, { borders: noBdrs() }),
              mkCell([P([Tw('Reference', { size: 13, color: '7DD5CF' })], { spacing: { after: 30 } }), P([Tw(ref || '[Ref]', { bold: true, size: 18 })], { spacing: { after: 0 } })], 2100, C.mid, { borders: noBdrs() }),
              mkCell([P([Tw('Value (AED)', { size: 13, color: '7DD5CF' })], { spacing: { after: 30 } }), P([Tw(value || 'TBD', { bold: true, size: 18 })], { spacing: { after: 0 } })], 2100, C.mid, { borders: noBdrs() }),
              mkCell([P([Tw('Timeline', { size: 13, color: '7DD5CF' })], { spacing: { after: 30 } }), P([Tw(timeline || 'TBD', { bold: true, size: 18 })], { spacing: { after: 0 } })], 2100, C.mid, { borders: noBdrs() }),
            ] })]
          }),
        ],
        width: { size: 9200, type: WidthType.DXA }, margins: { top: 600, bottom: 600, left: 400, right: 400 },
        borders: noBdrs(), shading: { fill: C.dark, type: ShadingType.CLEAR },
      })] })]
    }))
    children.push(Space())
    children.push(PgBrk())

    // Sections
    for (const part of ['A', 'B', 'C', 'D', 'E', 'F']) {
      const d = sections[part]
      if (!d) continue

      children.push(Banner(PART_LABELS[part]))
      children.push(Space())

      const addText = (field: string, heading: string) => {
        if (!d[field]) return
        children.push(H2(heading))
        String(d[field]).split('\n').filter((p: string) => p.trim()).forEach((para: string) => {
          children.push(P([T(para, { size: 20 })], { spacing: { after: 160 } }))
        })
        children.push(Space())
      }

      const addList = (field: string, heading: string) => {
        if (!d[field]?.length) return
        children.push(H2(heading))
        d[field].forEach((item: string) => children.push(Bul(item)))
        children.push(Space())
      }

      if (part === 'A') {
        addText('executive_summary', 'Executive Summary')
        addText('scope_overview', 'Scope of Work')
        addList('in_scope', 'In Scope')
        addList('out_of_scope', 'Out of Scope')
        if (d.functional_requirements?.length) {
          children.push(H2('Functional Requirements'))
          children.push(new Table({
            width: { size: 9200, type: WidthType.DXA }, columnWidths: [700, 1400, 5700, 1400],
            rows: [
              new TableRow({ children: [Hc('Ref', 700), Hc('Category', 1400), Hc('Requirement', 5700), Hc('Priority', 1400)] }),
              ...d.functional_requirements.map((r: any, i: number) => new TableRow({ children: [Dc(r.ref, 700, i % 2 === 0 ? C.grayL : C.white, true), Dc(r.category, 1400, i % 2 === 0 ? C.grayL : C.white), Dc(r.requirement, 5700, i % 2 === 0 ? C.grayL : C.white), Dc(r.priority, 1400, i % 2 === 0 ? C.grayL : C.white)] }))
            ]
          }))
          children.push(Space())
        }
        addList('exclusions', 'Exclusions')
        addList('assumptions', 'Assumptions')
        addList('constraints', 'Constraints')
      }
      else if (part === 'B') {
        addText('technical_understanding', 'Technical Understanding')
        addText('architecture_overview', 'Architecture Overview')
        addList('architecture_principles', 'Architecture Principles')
        if (d.technology_stack?.length) {
          children.push(H2('Technology Stack'))
          children.push(new Table({
            width: { size: 9200, type: WidthType.DXA }, columnWidths: [1600, 2400, 5200],
            rows: [new TableRow({ children: [Hc('Layer', 1600), Hc('Technologies', 2400), Hc('Purpose', 5200)] }), ...d.technology_stack.map((s: any, i: number) => new TableRow({ children: [Dc(s.layer, 1600, i % 2 === 0 ? C.grayL : C.white, true), Dc(s.technologies, 2400, i % 2 === 0 ? C.grayL : C.white), Dc(s.purpose, 5200, i % 2 === 0 ? C.grayL : C.white)] }))]
          }))
          children.push(Space())
        }
        addText('integration_approach', 'Integration Approach')
        addText('infrastructure_model', 'Infrastructure Model')
      }
      else if (part === 'C') {
        addText('security_overview', 'Security Overview')
        addList('cybersecurity_scope', 'Cybersecurity Scope')
        if (d.compliance_standards?.length) {
          children.push(H2('Compliance Standards'))
          children.push(new Table({
            width: { size: 9200, type: WidthType.DXA }, columnWidths: [2400, 6800],
            rows: [new TableRow({ children: [Hc('Standard', 2400), Hc('Description', 6800)] }), ...d.compliance_standards.map((s: any, i: number) => new TableRow({ children: [Dc(s.standard, 2400, i % 2 === 0 ? C.grayL : C.white, true), Dc(s.description, 6800, i % 2 === 0 ? C.grayL : C.white)] }))]
          }))
          children.push(Space())
        }
        addText('penetration_testing', 'Penetration Testing')
        addText('iam_approach', 'Identity and Access Management')
      }
      else if (part === 'D') {
        addText('methodology_overview', 'Methodology Overview')
        addText('sprint_model', 'Sprint Model')
        addText('change_management', 'Change Management')
        addText('release_management', 'Release Management')
        addText('governance', 'Project Governance')
        addText('reporting', 'Reporting and Communication')
        addText('approval_process', 'Approval Process')
      }
      else if (part === 'E') {
        addText('support_overview', 'Support Model Overview')
        if (d.recommended_package) {
          children.push(H2('Recommended Package'))
          children.push(P([T(`emaratech recommends the ${d.recommended_package} support package for this engagement, providing ${d.availability_commitment || '99.95%'} availability commitment.`, { size: 20 })]))
          children.push(Space())
        }
        addText('package_recommendation_rationale', 'Package Rationale')
        addText('sla_summary', 'SLA Summary')
        addText('operational_model', 'Operational Model')
      }
      else if (part === 'F') {
        addText('company_profile', 'Company Profile')
        addList('key_differentiators', 'Key Differentiators')
        if (d.project_references?.length) {
          children.push(H2('Project References'))
          d.project_references.forEach((r: any, i: number) => {
            children.push(new Table({
              width: { size: 9200, type: WidthType.DXA }, columnWidths: [9200],
              rows: [new TableRow({ children: [new TableCell({ children: [P([T(r.project, { bold: true, size: 20 })], { spacing: { after: 40 } }), P([T(r.client, { size: 17, color: C.textL })], { spacing: { after: 60 } }), P([T(r.description, { size: 18 })], { spacing: { after: 60 } }), P([T('Technologies: ' + r.technologies, { size: 16, color: C.teal, italics: true })], { spacing: { after: 0 } })], width: { size: 9200, type: WidthType.DXA }, margins: { top: 140, bottom: 140, left: 160, right: 160 }, borders: bdrs(C.grayM), shading: { fill: i % 2 === 0 ? C.grayL : C.white, type: ShadingType.CLEAR } })] })]
            }))
            children.push(new Paragraph({ children: [T('')], spacing: { after: 80 } }))
          })
        }
        addList('certifications', 'Certifications')
      }

      children.push(PgBrk())
    }

    // Sign off
    children.push(Banner('Review and Sign-off'))
    children.push(Space())
    children.push(P([T('This proposal has been prepared by emaratech Technology Solutions. All content is confidential and intended solely for the named client.', { size: 20 })]))
    children.push(Space())
    children.push(new Table({
      width: { size: 9200, type: WidthType.DXA }, columnWidths: [3680, 2760, 2760],
      rows: [
        new TableRow({ children: [Hc('Name and title', 3680), Hc('Date', 2760), Hc('Signature', 2760)] }),
        ...['Noelle Nassif  ·  Technical Manager, Pre-Sales', '[Solution Architect]', 'Waleed Darwish  ·  General Manager'].map((name, i) =>
          new TableRow({ children: [Dc(name, 3680, i % 2 === 0 ? C.grayL : C.white, i === 0), Dc('', 2760, i % 2 === 0 ? C.grayL : C.white), Dc('', 2760, i % 2 === 0 ? C.grayL : C.white)] })
        )
      ]
    }))

    const doc = new Document({
      numbering: { config: [{ reference: 'bul', levels: [{ level: 0, format: LevelFormat.BULLET, text: '›', alignment: AlignmentType.LEFT, style: { run: { color: C.bright, bold: true }, paragraph: { indent: { left: 480, hanging: 280 } } } }] }] },
      styles: {
        default: { document: { run: { font: 'Arial', size: 20, color: C.dark } } },
        paragraphStyles: [
          { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 26, bold: true, font: 'Arial', color: C.dark }, paragraph: { spacing: { before: 400, after: 160 }, outlineLevel: 0 } },
          { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 22, bold: true, font: 'Arial', color: C.mid }, paragraph: { spacing: { before: 280, after: 120 }, outlineLevel: 1 } },
        ]
      },
      sections: [{
        properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 900, right: 850, bottom: 900, left: 850 } } },
        headers: {
          default: new Header({ children: [new Paragraph({ children: [T('emaratech Technology Solutions  |  Technical Proposal  |  ' + (client || '[Client]'), { size: 14, color: C.textL })], border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: C.bright, space: 3 } }, spacing: { after: 0 } })] })
        },
        footers: {
          default: new Footer({ children: [new Paragraph({ children: [T('Confidential — emaratech Technology Solutions', { size: 14, color: C.textL, italics: true })], border: { top: { style: BorderStyle.SINGLE, size: 4, color: C.bright, space: 3 } }, alignment: AlignmentType.CENTER, spacing: { before: 0 } })] })
        },
        children
      }]
    })

    const buffer = await Packer.toBuffer(doc)
    const body = buffer.toString('base64')
    const binary = Buffer.from(body, 'base64')
    return new Response(binary, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': 'attachment; filename="Emaratech_Technical_Proposal.docx"',
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
