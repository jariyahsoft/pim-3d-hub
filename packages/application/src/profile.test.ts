import { describe, expect, it } from 'vitest'
import { RepositoryConflictError, parseUuidv7 } from '@pim/domain'
import {
  createFakeClock,
  createFakeUuidGenerator,
} from '../../testkit/src/repository-fakes.js'
import {
  createInMemoryUserAddressRepository,
  createInMemoryUserRepository,
} from '../../infrastructure/src/in-memory-user-repositories.js'
import {
  createUserProfileService,
  normalizeCountryCode,
  normalizeLocaleCode,
  normalizePhoneE164,
} from './index.js'

describe('profile service', () => {
  it('completes onboarding, normalizes profile data, and keeps private fields out of the public profile', async () => {
    const clock = createFakeClock('2026-06-27T12:00:00.000Z')
    const users = createInMemoryUserRepository({ clock })
    const addresses = createInMemoryUserAddressRepository({ clock })
    const uuidGenerator = createFakeUuidGenerator([
      '018f18b2-4c4f-7c7a-9e12-4c0b8a8f8101',
    ])

    const user = await users.create({
      id: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8f8100'),
    })

    const service = createUserProfileService({
      addresses,
      clock,
      users,
      uuidGenerator,
    })

    const profile = await service.completeOnboarding({
      countryCode: 'th',
      displayName: '  สมชาย   เมกเกอร์  ',
      expectedVersion: user.version,
      locale: 'th_th',
      onboardingRoleCode: 'BUYER',
      phoneE164: '+66 81 234 5678',
      profileImageAssetId: null,
      userId: user.id,
    })

    expect(profile.publicProfile.displayName).toBe('สมชาย เมกเกอร์')
    expect(profile.publicProfile.locale).toBe('th-TH')
    expect(profile.privateProfile.countryCode).toBe('TH')
    expect(profile.privateProfile.phoneE164).toBe('+66812345678')
    expect(JSON.stringify(profile.publicProfile)).not.toContain('+66812345678')
    expect(profile.publicProfile.onboardingCompletedAt).toBe('2026-06-27T12:00:00.000Z')
    expect(profile.addresses).toEqual([])
    expect(profile.notificationPreferences).toMatchObject({
      orderStatusEmail: true,
      orderStatusPush: true,
    })
  })

  it('rejects stale expectedVersion updates without overwriting stored profile data', async () => {
    const clock = createFakeClock('2026-06-27T12:00:00.000Z')
    const users = createInMemoryUserRepository({ clock })
    const addresses = createInMemoryUserAddressRepository({ clock })
    const uuidGenerator = createFakeUuidGenerator([])
    const service = createUserProfileService({
      addresses,
      clock,
      users,
      uuidGenerator,
    })

    const user = await users.create({
      id: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8f8110'),
    })

    const firstUpdate = await service.updateProfile({
      displayName: 'Somchai Maker',
      expectedVersion: user.version,
      locale: 'en-us',
      userId: user.id,
    })

    await expect(
      service.updateProfile({
        displayName: 'Somchai Maker 2',
        expectedVersion: user.version,
        locale: 'en-gb',
        userId: user.id,
      }),
    ).rejects.toBeInstanceOf(RepositoryConflictError)

    const stored = await users.findById(user.id)
    expect(stored?.displayName).toBe('Somchai Maker')
    expect(firstUpdate.publicProfile.displayName).toBe('Somchai Maker')
  })

  it('creates, updates, and deletes reusable addresses for the authenticated user', async () => {
    const clock = createFakeClock('2026-06-27T12:00:00.000Z')
    const users = createInMemoryUserRepository({ clock })
    const addresses = createInMemoryUserAddressRepository({ clock })
    const uuidGenerator = createFakeUuidGenerator([
      '018f18b2-4c4f-7c7a-9e12-4c0b8a8f8121',
    ])
    const service = createUserProfileService({
      addresses,
      clock,
      users,
      uuidGenerator,
    })

    const user = await users.create({
      id: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8f8120'),
    })

    const created = await service.createAddress({
      addressLine1: '99/1 ถนนสุขุมวิท',
      addressLine2: 'ชั้น 3',
      countryCode: 'th',
      district: 'วัฒนา',
      isDefault: true,
      label: 'บ้าน',
      phoneE164: '+66 81 234 5678',
      postalCode: '10110',
      province: 'กรุงเทพมหานคร',
      recipientName: 'สมชาย เมกเกอร์',
      subdistrict: 'คลองตันเหนือ',
      userId: user.id,
    })

    expect(created.countryCode).toBe('TH')
    expect(created.phoneE164).toBe('+66812345678')
    expect(addresses.snapshot()).toHaveLength(1)

    const updated = await service.updateAddress({
      addressLine1: '99/2 ถนนสุขุมวิท',
      addressLine2: null,
      countryCode: 'TH',
      district: 'วัฒนา',
      expectedVersion: created.version,
      id: created.id,
      isDefault: false,
      label: 'ที่บ้าน',
      phoneE164: null,
      postalCode: '10110',
      province: 'กรุงเทพมหานคร',
      recipientName: 'สมชาย เมกเกอร์',
      subdistrict: 'คลองตันเหนือ',
      userId: user.id,
    })

    expect(updated.addressLine1).toBe('99/2 ถนนสุขุมวิท')
    expect(updated.addressLine2).toBeNull()
    expect(updated.version).toBe(created.version + 1)

    const deleted = await service.deleteAddress({
      expectedVersion: updated.version,
      id: updated.id,
      userId: user.id,
    })

    expect(deleted.status).toBe('DELETED')
    expect(await addresses.findById(updated.id)).toBeNull()
    expect(await service.getCurrentProfile({ userId: user.id })).toMatchObject({
      addresses: [],
    })
  })
})

describe('profile normalization helpers', () => {
  it('normalizes locale, country, and phone values for safe profile input', () => {
    expect(normalizeLocaleCode('th_th')).toBe('th-TH')
    expect(normalizeCountryCode('th')).toBe('TH')
    expect(normalizePhoneE164('+66 81 234 5678')).toBe('+66812345678')
  })
})
