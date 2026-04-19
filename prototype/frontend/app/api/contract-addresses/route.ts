import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Serves `prototype/contract-addresses.json` (written by `npm run deploy`)
 * so the browser always targets the latest deploy without rebuilding the app.
 */
export async function GET() {
  const filePath = join(process.cwd(), '..', 'contract-addresses.json')
  if (!existsSync(filePath)) {
    return NextResponse.json(
      { error: 'contract-addresses.json not found. Run: cd prototype && npm run deploy' },
      { status: 404 }
    )
  }
  try {
    const raw = readFileSync(filePath, 'utf-8')
    const data = JSON.parse(raw) as Record<string, unknown>
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Invalid contract-addresses.json' }, { status: 500 })
  }
}
