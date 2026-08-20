/**
 * Aadhaar hashing utility.
 * Uses the Web Crypto API (SHA-256) to deterministically hash a 12-digit Aadhaar number.
 * The raw Aadhaar number is NEVER stored, logged, or transmitted.
 * 
 * For demo/prototype use only. Not UIDAI-certified authentication.
 */

/**
 * Returns a hex SHA-256 hash of the given Aadhaar string.
 * Always use this before storing or comparing any Aadhaar-derived value.
 */
export async function hashAadhaar(aadhaarNumber: string): Promise<string> {
  // Add a fixed salt to prevent rainbow table attacks on the small 12-digit space
  const salted = `CIVICCONNECT_PROTO_2026:${aadhaarNumber.trim()}`
  const encoder = new TextEncoder()
  const data = encoder.encode(salted)
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return hashHex
}

/**
 * Validates a raw Aadhaar number string.
 * Only checks format (12 digits). Does NOT verify against UIDAI.
 */
export function validateAadhaar(value: string): { valid: boolean; error: string | null } {
  const cleaned = value.replace(/\s/g, '')
  if (!cleaned) return { valid: false, error: 'Aadhaar number is required.' }
  if (!/^\d{12}$/.test(cleaned)) return { valid: false, error: 'Aadhaar number must be exactly 12 digits.' }
  return { valid: true, error: null }
}

/**
 * Demo/test Aadhaar numbers for prototype demonstrations.
 * These map to predictable hashes and can be used during demos
 * without entering real Aadhaar numbers.
 */
export const DEMO_AADHAAR_NUMBERS = [
  { label: 'Demo Citizen 1', number: '123456789012' },
  { label: 'Demo Citizen 2', number: '234567890123' },
  { label: 'Demo Authority', number: '000000000000' },
]
