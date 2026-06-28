import { describe, expect, it } from 'vitest'
import {
  demoOnboardingDraft,
  loadDraft,
  normalizeOnboardingDraft,
  onboardingDraftStorageKey,
  saveDraft,
} from './profile-demo.js'

function createMemoryStorage(): Storage {
  const data = new Map<string, string>()

  return {
    clear() {
      data.clear()
    },
    getItem(key: string) {
      return data.get(key) ?? null
    },
    key(index: number) {
      return [...data.keys()][index] ?? null
    },
    length: 0,
    removeItem(key: string) {
      data.delete(key)
    },
    setItem(key: string, value: string) {
      data.set(key, value)
    },
  }
}

describe('profile demo helpers', () => {
  it('persists onboarding drafts in local storage format', () => {
    const storage = createMemoryStorage()

    saveDraft(storage, onboardingDraftStorageKey, demoOnboardingDraft)

    expect(loadDraft(storage, onboardingDraftStorageKey)).toEqual(demoOnboardingDraft)
  })

  it('normalizes the onboarding draft for Thai defaults', () => {
    expect(
      normalizeOnboardingDraft({
        countryCode: 'th',
        displayName: '  สมชาย   เมกเกอร์ ',
        locale: 'th_th',
        onboardingRoleCode: 'buyer',
        phoneE164: '+66 81 234 5678',
      }),
    ).toEqual({
      countryCode: 'TH',
      displayName: 'สมชาย เมกเกอร์',
      locale: 'th-TH',
      onboardingRoleCode: 'BUYER',
      phoneE164: '+66812345678',
    })
  })
})
