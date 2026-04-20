import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Remove a CID from Pinata (availability erasure for GDPR-style requests).
 * Uses server-side credentials only — never expose secrets as NEXT_PUBLIC_* in production.
 *
 * Pinata: DELETE https://api.pinata.cloud/pinning/unpin/{cid}
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { cid?: string }
    const cid = typeof body.cid === 'string' ? body.cid.trim() : ''

    if (!cid) {
      return NextResponse.json({ error: 'Missing cid' }, { status: 400 })
    }

    // Demo / simulated CIDs were never pinned — nothing to unpin
    if (cid.startsWith('QmDemo') || cid.includes('Demo')) {
      return NextResponse.json({ ok: true, skipped: true, reason: 'demo_cid' })
    }

    const jwt = process.env.PINATA_JWT?.trim()
    const apiKey = process.env.PINATA_API_KEY?.trim() || process.env.NEXT_PUBLIC_PINATA_API_KEY?.trim()
    const apiSecret =
      process.env.PINATA_SECRET_API_KEY?.trim() || process.env.NEXT_PUBLIC_PINATA_SECRET_KEY?.trim()

    if (!jwt && (!apiKey || !apiSecret)) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: 'no_pinata_credentials',
        message:
          'Pinata credentials not set on server. Set PINATA_JWT or PINATA_API_KEY + PINATA_SECRET_API_KEY in .env.local (see README).',
      })
    }

    const url = `https://api.pinata.cloud/pinning/unpin/${encodeURIComponent(cid)}`

    let res: Response
    if (jwt) {
      res = await fetch(url, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${jwt}` },
      })
    } else {
      res = await fetch(url, {
        method: 'DELETE',
        headers: {
          pinata_api_key: apiKey!,
          pinata_secret_api_key: apiSecret!,
        },
      })
    }

    const text = await res.text()

    // 404 = pin not found (already unpinned or never existed) — treat as success for erasure intent
    if (res.ok || res.status === 404) {
      return NextResponse.json({ ok: true, status: res.status })
    }

    return NextResponse.json(
      { error: text || `Pinata unpin failed (${res.status})` },
      { status: res.status >= 400 ? res.status : 502 }
    )
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unpin failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
