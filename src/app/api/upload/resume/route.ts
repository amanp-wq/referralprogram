import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const referralId = formData.get('referralId') as string | null

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Only PDF and Word documents are allowed' }, { status: 400 })
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File must be under 5MB' }, { status: 400 })
    }

    const supabase = getServerClient()
    const ext = file.name.split('.').pop()
    const fileName = `${referralId || Date.now()}-${Date.now()}.${ext}`
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await supabase.storage
      .from('resume')
      .upload(fileName, buffer, { contentType: file.type, upsert: true })

    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

    // If referralId provided, update the Referral record
    if (referralId) {
      await (supabase.from('Referral') as any).update({ resumeUrl: fileName, updatedAt: new Date().toISOString() }).eq('id', referralId)
    }

    return NextResponse.json({ fileName })
  } catch (error: any) {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
