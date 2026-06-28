'use client'

import { useEffect, useState, type FormEvent, type ReactElement } from 'react'
import {
  clearDraft,
  demoCurrentUserProfile,
  loadDraft,
  profileDraftStorageKey,
  saveDraft,
  type DraftStorageLike,
  type ProfileDraft,
} from './profile-demo.js'
import {
  defaultNotificationPreferences as _defaultNotificationPreferences,
  defaultPrivacyPreferences as _defaultPrivacyPreferences,
  normalizeCountryCode,
  normalizeLocaleCode,
  normalizePhoneE164,
  type CurrentUserProfileDto,
  type UserAddressDto,
} from '@pim/application'
import { parseUuidv7 } from '@pim/domain'

type ProfileWorkspace = Readonly<{
  addresses: readonly UserAddressDto[]
  draft: ProfileDraft
}>

type ProfileScreenProps = Readonly<{
  initialProfile?: CurrentUserProfileDto
  storageKey?: string
}>

function hasWindowStorage(): boolean {
  return typeof window !== 'undefined' && 'localStorage' in window
}

function getStorage(): DraftStorageLike | null {
  return hasWindowStorage() ? window.localStorage : null
}

function createInitialWorkspace(initialProfile: CurrentUserProfileDto): ProfileWorkspace {
  return {
    addresses: initialProfile.addresses,
    draft: Object.freeze({
      countryCode: initialProfile.privateProfile.countryCode ?? 'TH',
      displayName: initialProfile.publicProfile.displayName ?? '',
      locale: initialProfile.publicProfile.locale ?? 'th-TH',
      notificationPreferences: initialProfile.notificationPreferences,
      onboardingRoleCode: initialProfile.publicProfile.onboardingRoleCode ?? 'BUYER',
      phoneE164: initialProfile.privateProfile.phoneE164 ?? '+66812345678',
      privacyPreferences: initialProfile.privacyPreferences,
    }),
  }
}

function createDemoUuidv7(index: number): ReturnType<typeof parseUuidv7> {
  return parseUuidv7(`018f18b2-4c4f-7c7a-9e12-${index.toString(16).padStart(12, '0')}`)
}

function _serializeWorkspace(workspace: ProfileWorkspace): string {
  return JSON.stringify(workspace)
}

function _parseWorkspace(value: string | null): ProfileWorkspace | null {
  if (!value) {
    return null
  }

  try {
    const parsed = JSON.parse(value) as ProfileWorkspace
    return {
      addresses: parsed.addresses,
      draft: parsed.draft,
    }
  } catch {
    return null
  }
}

function createDraftValidationMessage(draft: ProfileDraft): string | null {
  if (!draft.displayName.trim()) {
    return 'กรุณากรอกชื่อแสดงผล'
  }

  if (!draft.locale.trim()) {
    return 'กรุณาเลือกภาษา'
  }

  if (!draft.phoneE164.trim()) {
    return 'กรุณากรอกเบอร์โทรศัพท์'
  }

  return null
}

function AddressCard({ address }: { address: UserAddressDto }): ReactElement {
  return (
    <article className="addressCard">
      <div className="addressCardTop">
        <strong>{address.label}</strong>
        {address.isDefault ? <span className="pill">ค่าเริ่มต้น</span> : null}
      </div>
      <p>{address.recipientName}</p>
      <p>{address.addressLine1}</p>
      <p>
        {address.subdistrict}, {address.district}, {address.province} {address.postalCode}
      </p>
      <p>{address.countryCode}</p>
    </article>
  )
}

export function ProfileScreen(props: ProfileScreenProps): ReactElement {
  const storageKey = props.storageKey ?? profileDraftStorageKey
  const initialProfile = props.initialProfile ?? demoCurrentUserProfile
  const [workspace, setWorkspace] = useState<ProfileWorkspace>(createInitialWorkspace(initialProfile))
  const [statusMessage, setStatusMessage] = useState<string>(
    'แก้ไขโปรไฟล์ได้แบบ mobile-first พร้อมบันทึกฉบับร่าง',
  )
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [offline, setOffline] = useState<boolean>(false)
  const [addressDraft, setAddressDraft] = useState({
    addressLine1: '88/8 ถนนพระราม 9',
    addressLine2: '',
    countryCode: 'TH',
    district: 'ห้วยขวาง',
    isDefault: false,
    label: 'ที่ทำงาน',
    phoneE164: '+66812345678',
    postalCode: '10310',
    province: 'กรุงเทพมหานคร',
    recipientName: 'สมชาย เมกเกอร์',
    subdistrict: 'บางกะปิ',
  })

  useEffect(() => {
    const storage = getStorage()
    if (!storage) {
      return
    }

    const stored = loadDraft<ProfileWorkspace>(storage, storageKey)
    if (stored) {
      setWorkspace(stored)
      setStatusMessage('กู้คืนฉบับร่างโปรไฟล์และที่อยู่แล้ว')
    }
  }, [storageKey])

  useEffect(() => {
    const storage = getStorage()
    if (!storage) {
      return
    }

    saveDraft(storage, storageKey, workspace)
  }, [storageKey, workspace])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const syncOnlineState = () => {
      setOffline(!window.navigator.onLine)
    }

    syncOnlineState()
    window.addEventListener('online', syncOnlineState)
    window.addEventListener('offline', syncOnlineState)

    return () => {
      window.removeEventListener('online', syncOnlineState)
      window.removeEventListener('offline', syncOnlineState)
    }
  }, [])

  function updateDraft(updater: (draft: ProfileDraft) => ProfileDraft): void {
    setWorkspace((current) => ({
      ...current,
      draft: updater(current.draft),
    }))
  }

  function addAddress(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    setErrorMessage(null)

    try {
      const countryCode = normalizeCountryCode(addressDraft.countryCode) ?? 'TH'
      const phoneE164 = normalizePhoneE164(addressDraft.phoneE164) ?? '+66812345678'
      const locale = normalizeLocaleCode(workspace.draft.locale) ?? 'th-TH'

      setWorkspace((current) => ({
        ...current,
        addresses: [
          {
            addressLine1: addressDraft.addressLine1.trim(),
            addressLine2: addressDraft.addressLine2.trim() || null,
            countryCode,
            district: addressDraft.district.trim(),
            id: createDemoUuidv7(current.addresses.length + 1),
            isDefault: addressDraft.isDefault,
            label: addressDraft.label.trim(),
            ownerId: currentProfileId(initialProfile),
            ownerType: 'USER',
            phoneE164,
            postalCode: addressDraft.postalCode.trim(),
            province: addressDraft.province.trim(),
            recipientName: addressDraft.recipientName.trim(),
            status: 'ACTIVE',
            subdistrict: addressDraft.subdistrict.trim(),
            version: 1,
          },
          ...current.addresses,
        ],
        draft: {
          ...current.draft,
          countryCode,
          locale,
          phoneE164,
        },
      }))

      setStatusMessage('เพิ่มที่อยู่ใหม่แล้ว')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'ไม่สามารถบันทึกที่อยู่ได้')
    }
  }

  function saveProfile(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    setErrorMessage(null)

    const validation = createDraftValidationMessage(workspace.draft)
    if (validation) {
      setErrorMessage(validation)
      return
    }

    try {
      const nextDraft: ProfileDraft = Object.freeze({
        countryCode: normalizeCountryCode(workspace.draft.countryCode) ?? 'TH',
        displayName: workspace.draft.displayName.trim().replace(/\s+/g, ' '),
        locale: normalizeLocaleCode(workspace.draft.locale) ?? 'th-TH',
        notificationPreferences: workspace.draft.notificationPreferences,
        onboardingRoleCode: workspace.draft.onboardingRoleCode.trim().toUpperCase(),
        phoneE164: normalizePhoneE164(workspace.draft.phoneE164) ?? '+66812345678',
        privacyPreferences: workspace.draft.privacyPreferences,
      })

      setWorkspace((current) => ({
        ...current,
        draft: nextDraft,
      }))
      setStatusMessage(offline ? 'บันทึกฉบับร่างเพื่อซิงก์ภายหลัง' : 'บันทึกโปรไฟล์เรียบร้อย')
      const storage = getStorage()
      if (storage) {
        saveDraft(storage, storageKey, {
          ...workspace,
          draft: nextDraft,
        })
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'ไม่สามารถบันทึกโปรไฟล์ได้')
    }
  }

  const currentProfile = initialProfile

  return (
    <main className="screen">
      <section className="hero compact">
        <div className="eyebrow">Phase 1A Identity</div>
        <h1>โปรไฟล์และที่อยู่</h1>
        <p className="lede">จัดการข้อมูลสาธารณะ ข้อมูลติดต่อส่วนตัว ที่อยู่ และค่าการแจ้งเตือน</p>
      </section>

      <section className="stack">
        <article className="card">
          <div className="cardHeader">
            <h2>โปรไฟล์สาธารณะ</h2>
            <span className="pill">ป้องกันข้อมูลส่วนตัว</span>
          </div>
          <dl className="detailList">
            <div>
              <dt>ชื่อแสดงผล</dt>
              <dd>{workspace.draft.displayName}</dd>
            </div>
            <div>
              <dt>ภาษา</dt>
              <dd>{workspace.draft.locale}</dd>
            </div>
            <div>
              <dt>สถานะ onboarding</dt>
              <dd>{currentProfile.publicProfile.onboardingCompletedAt ? 'เสร็จสมบูรณ์' : 'ยังไม่เสร็จ'}</dd>
            </div>
          </dl>
        </article>

        <article className="card">
          <div className="cardHeader">
            <h2>ข้อมูลติดต่อส่วนตัว</h2>
            <span className="pill">แสดงเฉพาะเจ้าของบัญชี</span>
          </div>
          <dl className="detailList">
            <div>
              <dt>เบอร์โทรศัพท์</dt>
              <dd>{workspace.draft.phoneE164}</dd>
            </div>
            <div>
              <dt>ประเทศ</dt>
              <dd>{workspace.draft.countryCode}</dd>
            </div>
          </dl>
        </article>

        <article className="card">
          <div className="cardHeader">
            <h2>แก้ไขโปรไฟล์</h2>
            <span className={`badge ${offline ? 'offline' : 'idle'}`}>
              {offline ? 'ออฟไลน์' : 'ออนไลน์'}
            </span>
          </div>
          <p className="status" role="status" aria-live="polite">
            {statusMessage}
          </p>
          {errorMessage ? (
            <p className="error" role="alert">
              {errorMessage}
            </p>
          ) : null}

          <form className="form" onSubmit={saveProfile}>
            <label htmlFor="profile-name">
              ชื่อแสดงผล
              <input
                id="profile-name"
                onChange={(event) =>
                  updateDraft((current) => ({ ...current, displayName: event.target.value }))
                }
                value={workspace.draft.displayName}
              />
            </label>

            <div className="grid">
              <label htmlFor="profile-locale">
                ภาษา
                <input
                  id="profile-locale"
                  onChange={(event) =>
                    updateDraft((current) => ({ ...current, locale: event.target.value }))
                  }
                  value={workspace.draft.locale}
                />
              </label>

              <label htmlFor="profile-country">
                ประเทศ
                <input
                  id="profile-country"
                  onChange={(event) =>
                    updateDraft((current) => ({ ...current, countryCode: event.target.value }))
                  }
                  value={workspace.draft.countryCode}
                />
              </label>
            </div>

            <label htmlFor="profile-phone">
              เบอร์โทรศัพท์
              <input
                id="profile-phone"
                onChange={(event) =>
                  updateDraft((current) => ({ ...current, phoneE164: event.target.value }))
                }
                value={workspace.draft.phoneE164}
              />
            </label>

            <label htmlFor="profile-role">
              บทบาทเริ่มต้น
              <select
                id="profile-role"
                onChange={(event) =>
                  updateDraft((current) => ({
                    ...current,
                    onboardingRoleCode: event.target.value,
                  }))
                }
                value={workspace.draft.onboardingRoleCode}
              >
                <option value="BUYER">ผู้ซื้อ</option>
                <option value="DESIGNER">นักออกแบบ</option>
                <option value="PROVIDER">ผู้รับพิมพ์</option>
                <option value="SELLER">ผู้ขาย</option>
              </select>
            </label>

            <fieldset className="fieldset">
              <legend>การแจ้งเตือน</legend>
              <label>
                <input
                  checked={workspace.draft.notificationPreferences.orderStatusEmail}
                  onChange={(event) =>
                    updateDraft((current) => ({
                      ...current,
                      notificationPreferences: {
                        ...current.notificationPreferences,
                        orderStatusEmail: event.target.checked,
                      },
                    }))
                  }
                  type="checkbox"
                />
                อีเมลสถานะงาน
              </label>
              <label>
                <input
                  checked={workspace.draft.notificationPreferences.orderStatusPush}
                  onChange={(event) =>
                    updateDraft((current) => ({
                      ...current,
                      notificationPreferences: {
                        ...current.notificationPreferences,
                        orderStatusPush: event.target.checked,
                      },
                    }))
                  }
                  type="checkbox"
                />
                Push สถานะงาน
              </label>
              <label>
                <input
                  checked={workspace.draft.notificationPreferences.marketingEmail}
                  onChange={(event) =>
                    updateDraft((current) => ({
                      ...current,
                      notificationPreferences: {
                        ...current.notificationPreferences,
                        marketingEmail: event.target.checked,
                      },
                    }))
                  }
                  type="checkbox"
                />
                อีเมลโปรโมชัน
              </label>
            </fieldset>

            <fieldset className="fieldset">
              <legend>ความเป็นส่วนตัว</legend>
              <label>
                <input
                  checked={workspace.draft.privacyPreferences.publicProfileVisible}
                  onChange={(event) =>
                    updateDraft((current) => ({
                      ...current,
                      privacyPreferences: {
                        ...current.privacyPreferences,
                        publicProfileVisible: event.target.checked,
                      },
                    }))
                  }
                  type="checkbox"
                />
                แสดงโปรไฟล์สาธารณะ
              </label>
              <label>
                <input
                  checked={workspace.draft.privacyPreferences.sharePhoneWithOrderParticipants}
                  onChange={(event) =>
                    updateDraft((current) => ({
                      ...current,
                      privacyPreferences: {
                        ...current.privacyPreferences,
                        sharePhoneWithOrderParticipants: event.target.checked,
                      },
                    }))
                  }
                  type="checkbox"
                />
                แชร์เบอร์กับคู่สัญญาเท่านั้น
              </label>
            </fieldset>

            <div className="actions">
              <button
                className="button secondary"
                type="button"
                onClick={() => {
                  const storage = getStorage()
                  if (storage) {
                    clearDraft(storage, storageKey)
                  }
                  setWorkspace(createInitialWorkspace(initialProfile))
                  setStatusMessage('ลบฉบับร่างแล้ว')
                  setErrorMessage(null)
                }}
              >
                ลบฉบับร่าง
              </button>
              <button className="button primary" type="submit">
                บันทึกโปรไฟล์
              </button>
            </div>
          </form>
        </article>

        <article className="card">
          <div className="cardHeader">
            <h2>ที่อยู่จัดส่ง</h2>
            <span className="pill">{workspace.addresses.length} รายการ</span>
          </div>
          <div className="cardStack">
            {workspace.addresses.map((address) => (
              <AddressCard address={address} key={address.id} />
            ))}
          </div>

          <form className="form compactForm" onSubmit={addAddress}>
            <h3>เพิ่มที่อยู่ใหม่</h3>
            <label htmlFor="address-label">
              ชื่อที่อยู่
              <input
                id="address-label"
                onChange={(event) =>
                  setAddressDraft((current) => ({ ...current, label: event.target.value }))
                }
                value={addressDraft.label}
              />
            </label>
            <label htmlFor="address-line1">
              ที่อยู่บรรทัด 1
              <input
                id="address-line1"
                onChange={(event) =>
                  setAddressDraft((current) => ({ ...current, addressLine1: event.target.value }))
                }
                value={addressDraft.addressLine1}
              />
            </label>
            <label htmlFor="address-line2">
              ที่อยู่บรรทัด 2
              <input
                id="address-line2"
                onChange={(event) =>
                  setAddressDraft((current) => ({ ...current, addressLine2: event.target.value }))
                }
                value={addressDraft.addressLine2}
              />
            </label>
            <div className="grid">
              <label htmlFor="address-subdistrict">
                แขวง/ตำบล
                <input
                  id="address-subdistrict"
                  onChange={(event) =>
                    setAddressDraft((current) => ({ ...current, subdistrict: event.target.value }))
                  }
                  value={addressDraft.subdistrict}
                />
              </label>
              <label htmlFor="address-district">
                เขต/อำเภอ
                <input
                  id="address-district"
                  onChange={(event) =>
                    setAddressDraft((current) => ({ ...current, district: event.target.value }))
                  }
                  value={addressDraft.district}
                />
              </label>
            </div>
            <div className="grid">
              <label htmlFor="address-province">
                จังหวัด
                <input
                  id="address-province"
                  onChange={(event) =>
                    setAddressDraft((current) => ({ ...current, province: event.target.value }))
                  }
                  value={addressDraft.province}
                />
              </label>
              <label htmlFor="address-postal-code">
                รหัสไปรษณีย์
                <input
                  id="address-postal-code"
                  onChange={(event) =>
                    setAddressDraft((current) => ({ ...current, postalCode: event.target.value }))
                  }
                  value={addressDraft.postalCode}
                />
              </label>
            </div>
            <div className="actions">
              <label className="inlineCheckbox">
                <input
                  checked={addressDraft.isDefault}
                  onChange={(event) =>
                    setAddressDraft((current) => ({ ...current, isDefault: event.target.checked }))
                  }
                  type="checkbox"
                />
                ใช้เป็นที่อยู่หลัก
              </label>
              <button className="button primary" type="submit">
                เพิ่มที่อยู่
              </button>
            </div>
          </form>
        </article>
      </section>
    </main>
  )
}

function currentProfileId(profile: CurrentUserProfileDto): CurrentUserProfileDto['publicProfile']['id'] {
  return profile.publicProfile.id
}
