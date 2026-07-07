import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fileName = searchParams.get('file')
    if (!fileName) return NextResponse.json({ error: 'No file specified' }, { status: 400 })

    const supabase = getServerClient()
    const { data, error } = await supabase.storage
      .from('resume')
      .createSignedUrl(fileName, 3600) // 1 hour

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ url: data.signedUrl })
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to get URL' }, { status: 500 })
  }
}
