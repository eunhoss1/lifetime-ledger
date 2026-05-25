import { afterEach, describe, expect, it, vi } from 'vitest'
import { createId } from './id'

const originalCryptoDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto')

describe('createId', () => {
  afterEach(() => {
    if (originalCryptoDescriptor) {
      Object.defineProperty(globalThis, 'crypto', originalCryptoDescriptor)
    } else {
      Reflect.deleteProperty(globalThis, 'crypto')
    }
    vi.restoreAllMocks()
  })

  it('uses crypto.randomUUID when available', () => {
    const randomUUID = vi.fn(() => '11111111-1111-4111-8111-111111111111')

    setCryptoMock({
      randomUUID,
      getRandomValues: vi.fn(),
    })

    expect(createId()).toBe('11111111-1111-4111-8111-111111111111')
    expect(randomUUID).toHaveBeenCalledOnce()
  })

  it('creates UUID v4 from getRandomValues when randomUUID is missing', () => {
    setCryptoMock({
      getRandomValues: vi.fn((array: Uint8Array) => {
        for (let index = 0; index < array.length; index += 1) {
          array[index] = index * 11
        }

        return array
      }),
    })

    expect(createId()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    )
  })

  it('falls back to local id when Web Crypto is unavailable', () => {
    Reflect.deleteProperty(globalThis, 'crypto')

    expect(createId()).toMatch(/^local-[a-z0-9]+-[a-z0-9]+$/)
  })
})

function setCryptoMock(mock: Record<string, unknown>) {
  Object.defineProperty(globalThis, 'crypto', {
    configurable: true,
    value: mock,
  })
}
