import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'

function generateId() {
  return 'prop_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id')
    if (id) {
      const { rows } = await sql`SELECT * FROM proposals WHERE id = ${id}`
      if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      return NextResponse.json({ proposal: rows[0] })
    }
    const { rows } = await sql`
      SELECT id, client, project, ref, sector, value, status, parts_complete, stage0_confirmed, created_at, updated_at
      FROM proposals ORDER BY updated_at DESC
    `
    return NextResponse.json({ proposals: rows })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const id = generateId()
    const {
      client = '', project = '', ref = '', sector = '',
      value = '', timeline = '', submission_date = '',
      rfp_text = '', dow_text = ''
    } = body

    await sql`
      INSERT INTO proposals (
        id, client, project, ref, sector, value, timeline,
        submission_date, rfp_text, dow_text
      )
      VALUES (
        ${id}, ${client}, ${project}, ${ref}, ${sector}, ${value}, ${timeline},
        ${submission_date}, ${rfp_text}, ${dow_text}
      )
    `
    return NextResponse.json({ id })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, field, value } = body
    if (!id) return NextResponse.json({ error: 'No id' }, { status: 400 })

    if (field === 'parts_data') {
      await sql`UPDATE proposals SET parts_data = ${JSON.stringify(value)}, updated_at = NOW() WHERE id = ${id}`
    } else if (field === 'parts_complete') {
      await sql`UPDATE proposals SET parts_complete = ${JSON.stringify(value)}, updated_at = NOW() WHERE id = ${id}`
    } else if (field === 'generated_sections') {
      await sql`UPDATE proposals SET generated_sections = ${JSON.stringify(value)}, updated_at = NOW() WHERE id = ${id}`
    } else if (field === 'arch_review') {
      await sql`UPDATE proposals SET arch_review = ${JSON.stringify(value)}, updated_at = NOW() WHERE id = ${id}`
    } else if (field === 'status') {
      await sql`UPDATE proposals SET status = ${value}, updated_at = NOW() WHERE id = ${id}`
    } else if (field === 'stage0_data') {
      await sql`UPDATE proposals SET stage0_data = ${JSON.stringify(value)}, updated_at = NOW() WHERE id = ${id}`
    } else if (field === 'stage0_confirmed') {
      await sql`UPDATE proposals SET stage0_confirmed = ${value}, updated_at = NOW() WHERE id = ${id}`
    } else if (field === 'compliance_items') {
      await sql`UPDATE proposals SET compliance_items = ${JSON.stringify(value)}, updated_at = NOW() WHERE id = ${id}`
    } else if (field === 'meta') {
      const m = value
      await sql`
        UPDATE proposals SET
          client = ${m.client || ''},
          project = ${m.project || ''},
          ref = ${m.ref || ''},
          sector = ${m.sector || ''},
          value = ${m.value || ''},
          timeline = ${m.timeline || ''},
          submission_date = ${m.submission_date || ''},
          rfp_text = ${m.rfp_text || ''},
          dow_text = ${m.dow_text || ''},
          updated_at = NOW()
        WHERE id = ${id}
      `
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'No id' }, { status: 400 })
    await sql`DELETE FROM proposals WHERE id = ${id}`
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
