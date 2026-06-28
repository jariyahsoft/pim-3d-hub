import {
  defaultNotificationPreferences,
  defaultPrivacyPreferences,
  normalizeCountryCode,
  normalizeLocaleCode,
  normalizePhoneE164,
  type CurrentUserProfileDto,
  type PublicUserProfileDto,
  type UserAddressDto,
} from '@pim/application'
import { parseUtcTimestamp, parseUuidv7 } from '@pim/domain'

export const onboardingDraftStorageKey = 'pim-3d-hub:onboarding-draft'
export const profileDraftStorageKey = 'pim-3d-hub:profile-draft'

export type DraftStorageLike = Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>

export type OnboardingDraft = Readonly<{
  countryCode: string
  displayName: string
  locale: string
  onboardingRoleCode: string
  phoneE164: string
}>

export type ProfileDraft = Readonly<{
  countryCode: string
  displayName: string
  locale: string
  notificationPreferences: CurrentUserProfileDto['notificationPreferences']
  onboardingRoleCode: string
  phoneE164: string
  privacyPreferences: CurrentUserProfileDto['privacyPreferences']
}>

export const demoOnboardingDraft: OnboardingDraft = Object.freeze({
  countryCode: 'TH',
  displayName: 'สมชาย เมกเกอร์',
  locale: 'th-TH',
  onboardingRoleCode: 'BUYER',
  phoneE164: '+66812345678',
})

export const demoPublicProfile: PublicUserProfileDto = Object.freeze({
  displayName: 'สมชาย เมกเกอร์',
  id: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8f8a01'),
  locale: 'th-TH',
  onboardingCompletedAt: parseUtcTimestamp('2026-06-27T12:00:00.000Z'),
  onboardingRoleCode: 'BUYER',
  profileImageAssetId: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8f8a02'),
  version: 4,
})

export const demoUserAddress: UserAddressDto = Object.freeze({
  addressLine1: '99/1 ถนนสุขุมวิท',
  addressLine2: 'ชั้น 3',
  countryCode: 'TH',
  district: 'วัฒนา',
  id: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8f8b01'),
  isDefault: true,
  label: 'บ้าน',
  ownerId: demoPublicProfile.id,
  ownerType: 'USER',
  phoneE164: '+66812345678',
  postalCode: '10110',
  province: 'กรุงเทพมหานคร',
  recipientName: 'สมชาย เมกเกอร์',
  status: 'ACTIVE',
  subdistrict: 'คลองตันเหนือ',
  version: 2,
})

export const demoCurrentUserProfile: CurrentUserProfileDto = Object.freeze({
  addresses: [demoUserAddress],
  notificationPreferences: defaultNotificationPreferences,
  privateProfile: Object.freeze({
    countryCode: 'TH',
    phoneE164: '+66812345678',
  }),
  privacyPreferences: defaultPrivacyPreferences,
  publicProfile: demoPublicProfile,
})

function parseJson<T>(value: string | null): T | null {
  if (!value) {
    return null
  }

  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

export function loadDraft<T>(storage: DraftStorageLike, key: string): T | null {
  return parseJson<T>(storage.getItem(key))
}

export function saveDraft<T>(storage: DraftStorageLike, key: string, draft: T): void {
  storage.setItem(key, JSON.stringify(draft))
}

export function clearDraft(storage: DraftStorageLike, key: string): void {
  storage.removeItem(key)
}

export function normalizeOnboardingDraft(input: OnboardingDraft): OnboardingDraft {
  return Object.freeze({
    countryCode: normalizeCountryCode(input.countryCode) ?? 'TH',
    displayName: input.displayName.trim().replace(/\s+/g, ' '),
    locale: normalizeLocaleCode(input.locale) ?? 'th-TH',
    onboardingRoleCode: input.onboardingRoleCode.trim().toUpperCase(),
    phoneE164: normalizePhoneE164(input.phoneE164) ?? '+66812345678',
  })
}
