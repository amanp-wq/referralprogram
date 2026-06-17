// ============================================================
// Bank Field Encryption Utility
// ============================================================
// Encrypts sensitive financial PII (bankAccount, bankIfsc, upiId)
// at the application layer before storage in Supabase.
//
// Algorithm: AES-256-GCM with random 12-byte IV per record.
// Output format: base64(iv || ciphertext || authTag)
//
// The BANK_ENCRYPTION_KEY env var must be a 32-byte base64 string.
// Generate with: openssl rand -base64 32
//
// If BANK_ENCRYPTION_KEY is not set, the utility falls back to
// plaintext (with a loud warning) so dev environments keep working.
// Production MUST set the env var — see checkEncryptionConfigured().
// ============================================================

import crypto from 'crypto'

const ALGO = 'aes-256-gcm'
const IV_LENGTH = 12
const TAG_LENGTH = 16

let cachedKey: Buffer | null = null
let warnedAboutMissingKey = false

function getKey(): Buffer | null {
  if (cachedKey) return cachedKey
  const raw = process.env.BANK_ENCRYPTION_KEY
  if (!raw) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        '[SECURITY] BANK_ENCRYPTION_KEY env var is not set in production. ' +
          'Bank fields cannot be stored without encryption. ' +
          'Set BANK_ENCRYPTION_KEY to a 32-byte base64 string (openssl rand -base64 32).'
      )
    }
    if (!warnedAboutMissingKey) {
      console.warn(
        '[SECURITY] BANK_ENCRYPTION_KEY env var is not set. ' +
          'Bank fields will be stored as PLAINTEXT. ' +
          'This is unacceptable for production. Set BANK_ENCRYPTION_KEY ' +
          'to a 32-byte base64 string (openssl rand -base64 32).'
      )
      warnedAboutMissingKey = true
    }
    return null
  }
  // Buffer.from handles both raw and base64 — we expect base64 from `openssl rand -base64 32`
  const key = Buffer.from(raw, 'base64')
  if (key.length !== 32) {
    throw new Error(
      `BANK_ENCRYPTION_KEY must decode to 32 bytes, got ${key.length}. ` +
        'Generate with: openssl rand -base64 32'
    )
  }
  cachedKey = key
  return key
}

/** Returns true if encryption is properly configured (env var set + valid). */
export function isEncryptionConfigured(): boolean {
  try {
    return getKey() !== null
  } catch {
    return false
  }
}

/**
 * Encrypt a plaintext string. Returns `null` for null/empty input.
 * Falls back to returning the plaintext (with warning) if no key configured.
 */
export function encryptField(plaintext: string | null | undefined): string | null {
  if (plaintext == null || plaintext === '') return null

  const key = getKey()
  if (!key) return plaintext // dev fallback — never in production

  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGO, key, iv)
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()

  // Pack: iv (12) || ciphertext (n) || tag (16)
  const packed = Buffer.concat([iv, ciphertext, tag])
  return `enc:v1:${packed.toString('base64')}`
}

/**
 * Decrypt a value produced by encryptField. Returns `null` for null/empty input.
 * If the input doesn't have the `enc:v1:` prefix (i.e. legacy plaintext),
 * returns it as-is so old records keep working until re-encrypted.
 */
export function decryptField(value: string | null | undefined): string | null {
  if (value == null || value === '') return null
  if (!value.startsWith('enc:v1:')) {
    // Legacy plaintext value — return as-is. Migrate by re-saving.
    return value
  }

  const key = getKey()
  if (!key) {
    // Shouldn't happen in production — we should be able to decrypt
    // something we previously encrypted. Log loudly.
    console.error(
      '[SECURITY] BANK_ENCRYPTION_KEY missing while trying to decrypt. ' +
        'Returning masked value.'
    )
    return '••••••••'
  }

  const packed = Buffer.from(value.slice('enc:v1:'.length), 'base64')
  if (packed.length < IV_LENGTH + TAG_LENGTH) {
    console.error('[CRYPTO] Ciphertext too short — corrupted record.')
    return null
  }

  const iv = packed.subarray(0, IV_LENGTH)
  const tag = packed.subarray(packed.length - TAG_LENGTH)
  const ciphertext = packed.subarray(IV_LENGTH, packed.length - TAG_LENGTH)

  const decipher = crypto.createDecipheriv(ALGO, key, iv)
  decipher.setAuthTag(tag)
  try {
    const plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ])
    return plaintext.toString('utf8')
  } catch (err) {
    console.error('[CRYPTO] Decryption failed (auth tag mismatch?):', err)
    return null
  }
}

/**
 * Mask a sensitive value for display: show only the last 4 characters.
 * Used when rendering bank account numbers in the admin UI.
 */
export function maskSensitive(value: string | null | undefined): string {
  if (!value) return '—'
  const plain = value.startsWith('enc:v1:') ? decryptField(value) : value
  if (!plain) return '—'
  if (plain.length <= 4) return '••••'
  return '••••••' + plain.slice(-4)
}
