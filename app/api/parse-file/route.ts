import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const fileName = file.name.toLowerCase()
    const buffer = Buffer.from(await file.arrayBuffer())
    let text = ''

    if (fileName.endsWith('.pdf')) {
      const pdfParse = (await import('pdf-parse')).default
      const result = await pdfParse(buffer)
      text = result.text
    } else if (fileName.endsWith('.docx')) {
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      text = result.value
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const XLSX = await import('xlsx')
      const wb = XLSX.read(buffer, { type: 'buffer' })
      const lines: string[] = []
      wb.SheetNames.forEach(name => {
        lines.push(`=== ${name} ===`)
        lines.push(XLSX.utils.sheet_to_csv(wb.Sheets[name]))
      })
      text = lines.join('\n')
    } else {
      text = buffer.toString('utf-8')
    }

    const cleaned = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
    if (cleaned.length < 50) {
      return NextResponse.json({ error: 'Could not extract enough text. Please paste the text manually.' }, { status: 400 })
    }

    return NextResponse.json({ text: cleaned.slice(0, 10000), truncated: cleaned.length > 10000 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
