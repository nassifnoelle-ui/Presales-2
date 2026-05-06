import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'

export async function GET(req: NextRequest) {
  try {
    const part = req.nextUrl.searchParams.get('part')

    if (part) {
      const { rows } = await sql`
        SELECT * FROM dictionary WHERE part = ${part} ORDER BY category, title
      `
      // Group by category
      const grouped: Record<string, any[]> = {}
      rows.forEach(row => {
        if (!grouped[row.category]) grouped[row.category] = []
        grouped[row.category].push(row)
      })
      return NextResponse.json({ grouped, total: rows.length })
    }

    const { rows } = await sql`SELECT * FROM dictionary ORDER BY part, category, title`
    return NextResponse.json({ blocks: rows })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { part, category, title, content, type } = await req.json()
    const id = 'custom_' + Date.now().toString(36)
    await sql`
      INSERT INTO dictionary (id, part, category, title, content, type)
      VALUES (${id}, ${part}, ${category}, ${title}, ${content}, ${type || 'block'})
    `
    return NextResponse.json({ ok: true, id })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'No id' }, { status: 400 })
    await sql`DELETE FROM dictionary WHERE id = ${id}`
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
