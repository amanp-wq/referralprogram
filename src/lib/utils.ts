import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPhone(value: string): string {
  // Strip everything except digits
  const digits = value.replace(/\D/g, '')
  // Take last 10 digits (handles 11-digit numbers starting with 1)
  const ten = digits.length > 10 ? digits.slice(-10) : digits
  if (ten.length === 0) return ''
  if (ten.length <= 3) return `+1 (${ten}`
  if (ten.length <= 6) return `+1 (${ten.slice(0, 3)}) ${ten.slice(3)}`
  return `+1 (${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`
}
