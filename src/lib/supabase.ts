import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Server-side client with service role (bypasses RLS)
export function createServerClient() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

// Browser-side client with anon key (respects RLS)
export function createBrowserClient() {
  return createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}

// Singleton for server-side usage
let _serverClient: ReturnType<typeof createClient> | null = null

export function getServerClient() {
  if (!_serverClient) {
    _serverClient = createServerClient()
  }
  return _serverClient
}

// Type definitions for our database
export interface DbUser {
  id: string
  email: string
  name: string
  passwordHash: string | null
  role: 'admin' | 'affiliate'
  avatarUrl: string | null
  phone: string | null
  company: string | null
  status: 'active' | 'inactive' | 'suspended'
  emailVerified: boolean
  createdAt: string
  updatedAt: string
}

export interface DbSession {
  id: string
  userId: string
  token: string
  expiresAt: string
  createdAt: string
}

export interface DbAffiliate {
  id: string
  userId: string
  referralCode: string
  tier: 'standard' | 'pro' | 'elite'
  commissionRate: number
  totalEarnings: number
  totalReferrals: number
  totalConversions: number
  balance: number
  bankName: string | null
  bankAccount: string | null
  bankIfsc: string | null
  upiId: string | null
  payoutMethod: 'bank' | 'upi' | 'paypal'
  payoutEmail: string | null
  status: 'active' | 'pending' | 'inactive' | 'suspended'
  joinedAt: string
  updatedAt: string
}

export interface DbProgram {
  id: string
  name: string
  slug: string
  description: string | null
  commissionType: 'percentage' | 'fixed'
  commissionValue: number
  minPayout: number
  cookieDuration: number
  isActive: boolean
  startDate: string | null
  endDate: string | null
  imageUrl: string | null
  landingPageUrl: string | null
  terms: string | null
  createdAt: string
  updatedAt: string
}

export interface DbLink {
  id: string
  affiliateId: string
  programId: string
  code: string
  url: string
  clicks: number
  conversions: number
  isActive: boolean
  label: string | null
  createdAt: string
  updatedAt: string
}

export interface DbReferral {
  id: string
  affiliateId: string
  programId: string
  linkId: string | null
  referralCode: string
  visitorEmail: string | null
  visitorName: string | null
  visitorIp: string | null
  source: string | null
  status: 'clicked' | 'registered' | 'converted' | 'cancelled'
  convertedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface DbCommission {
  id: string
  affiliateId: string
  programId: string
  referralId: string | null
  amount: number
  rate: number
  type: 'referral' | 'bonus' | 'adjustment'
  status: 'pending' | 'approved' | 'paid' | 'cancelled' | 'refunded'
  payoutId: string | null
  description: string | null
  createdAt: string
  updatedAt: string
}

export interface DbPayout {
  id: string
  affiliateId: string
  amount: number
  method: 'bank' | 'upi' | 'paypal'
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  reference: string | null
  notes: string | null
  processedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface DbInvoice {
  id: string
  payoutId: string
  affiliateId: string
  amount: number
  invoiceNo: string
  status: 'generated' | 'sent' | 'paid'
  pdfUrl: string | null
  issuedAt: string
  dueDate: string | null
  paidAt: string | null
}

export interface DbActivity {
  id: string
  userId: string | null
  action: string
  entity: string | null
  entityId: string | null
  details: string | null
  createdAt: string
}

export interface DbSetting {
  id: string
  key: string
  value: string
  updatedAt: string
}
