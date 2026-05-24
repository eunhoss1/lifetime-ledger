import { describe, expect, it } from 'vitest'
import { formatKrwAmount, formatKrwNumber, normalizeKrwAmount } from './money'

describe('money utilities', () => {
  it('normalizes integer KRW amounts', () => {
    expect(normalizeKrwAmount(12000)).toBe(12000)
    expect(normalizeKrwAmount('12,000')).toBe(12000)
  })

  it('rejects decimal, negative, and non-numeric amounts', () => {
    expect(() => normalizeKrwAmount('12.5')).toThrow()
    expect(() => normalizeKrwAmount(-1)).toThrow()
    expect(() => normalizeKrwAmount('abc')).toThrow()
  })

  it('formats KRW amounts without fractional digits', () => {
    expect(formatKrwNumber(1234567)).toBe('1,234,567')
    expect(formatKrwAmount(1234567)).toContain('1,234,567')
  })
})
