// ============================================================
// Secure Admin Account Creator
// ============================================================
// Usage: bun run scripts/create-admin.ts <email> <password>
//
// Creates the first admin user directly in Supabase.
// Run this ONCE after deploying to a fresh database.
// Do NOT commit the password you choose to the repo.
// ============================================================

import bcrypt from 'bcryptjs'
import { createClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'

async function main() {
  const email = process.argv[2]
  const password = process.argv[3]

  if (!email || !password) {
    console.error('Usage: bun run scripts/create-admin.ts <email> <password>')
    console.error('Example: bun run scripts/create-admin.ts admin@example.com "S3cure!Pass-2026"')
    process.exit(1)
  }

  if (password.length < 12) {
    console.error('Password must be at least 12 characters long.')
    process.exit(1)
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Check if admin already exists
  const { data: existing } = await supabase
    .from('User')
    .select('id, email')
    .eq('email', email)
    .single()

  if (existing) {
    console.error(`User with email ${email} already exists (id=${existing.id}).`)
    console.error('If you forgot the password, delete the user first or use the password reset flow.')
    process.exit(1)
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const id = `usr_${uuidv4().substring(0, 12)}`

  const { error } = await supabase.from('User').insert({
    id,
    email,
    name: 'Administrator',
    passwordHash,
    role: 'admin',
    status: 'active',
    emailVerified: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })

  if (error) {
    console.error('Failed to create admin:', error.message)
    process.exit(1)
  }

  console.log(`✅ Admin user created successfully.`)
  console.log(`   Email: ${email}`)
  console.log(`   ID:    ${id}`)
  console.log(`   Role:  admin`)
  console.log('')
  console.log('You can now log in at /login with these credentials.')
  console.log('Please change the password after first login.')
}

main().catch((err) => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
