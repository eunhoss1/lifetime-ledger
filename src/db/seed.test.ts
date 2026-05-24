import { describe, expect, it } from 'vitest'
import {
  DEFAULT_ACCOUNT_DEFINITIONS,
  DEFAULT_CATEGORY_DEFINITIONS,
} from './seed'

describe('seed definitions', () => {
  it('contains the MVP display-only account kinds', () => {
    expect(DEFAULT_ACCOUNT_DEFINITIONS.map((account) => account.kind)).toEqual([
      'cash',
      'debitCard',
      'creditCard',
      'bankAccount',
      'other',
    ])
    expect(
      DEFAULT_ACCOUNT_DEFINITIONS.every(
        (account) => account.assetTrackingEnabled === false,
      ),
    ).toBe(true)
  })

  it('contains income, fixed expense, variable expense, and saving categories', () => {
    expect(
      DEFAULT_CATEGORY_DEFINITIONS.some((category) => category.type === 'income'),
    ).toBe(true)
    expect(
      DEFAULT_CATEGORY_DEFINITIONS.some(
        (category) => category.expenseRole === 'fixed',
      ),
    ).toBe(true)
    expect(
      DEFAULT_CATEGORY_DEFINITIONS.some(
        (category) => category.expenseRole === 'variable',
      ),
    ).toBe(true)
    expect(
      DEFAULT_CATEGORY_DEFINITIONS.some(
        (category) => category.expenseRole === 'savingInvestment',
      ),
    ).toBe(true)
  })
})
