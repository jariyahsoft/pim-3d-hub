'use client'

import { useEffect, useState, type FormEvent, type ReactElement } from 'react'
import {
  clearDraft,
  demoOnboardingDraft,
  loadDraft,
  normalizeOnboardingDraft,
  onboardingDraftStorageKey,
  saveDraft,
  type DraftStorageLike,
  type OnboardingDraft,
} from './profile-demo.js'

type OnboardingScreenProps = Readonly<{
  initialDraft?: OnboardingDraft
  onSubmit?: (draft: OnboardingDraft) => void | Promise<void>
  storageKey?: string
}>

type SaveState = 'idle' | 'saving' | 'saved' | 'offline'

function hasWindowStorage(): boolean {
  return typeof window !== 'undefined' && 'localStorage' in window
}

function getStorage(): DraftStorageLike | null {
  return hasWindowStorage() ? window.localStorage : null
}

export function OnboardingScreen(props: OnboardingScreenProps): ReactElement {
  const storageKey = props.storageKey ?? onboardingDraftStorageKey
  const initialDraft = props.initialDraft ?? demoOnboardingDraft
  const [draft, setDraft] = useState<OnboardingDraft>(initialDraft)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [offline, _setOffline] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string>(
    'การตั้งค่าเริ่มต้นใช้ภาษาไทยและบันทึกฉบับร่างอัตโนมัติ',
  )

  useEffect(() => {
    const storage = getStorage()
    if (!storage) {
      return
    }

    const stored = loadDraft<OnboardingDraft>(storage, storageKey)
    if (stored) {
      setDraft(stored)
      setStatusMessage('กู้คืนฉบับร่างที่บันทึกไว้แล้ว')
    }
  }, [storageKey])

  useEffect(() => {
    const storage = getStorage()
    if (!storage) {
      return
    }

    saveDraft(storage, storageKey, draft)
  }, [draft, storageKey])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const syncOnlineState = () => {
      setSaveState(window.navigator.onLine ? 'idle' : 'offline')
    }

    syncOnlineState()
    window.addEventListener('online', syncOnlineState)
    window.addEventListener('offline', syncOnlineState)

    return () => {
      window.removeEventListener('online', syncOnlineState)
      window.removeEventListener('offline', syncOnlineState)
    }
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    const normalized = normalizeOnboardingDraft(draft)
    setSaveState('saving')
    setStatusMessage('กำลังบันทึกข้อมูลโปรไฟล์')

    await props.onSubmit?.(normalized)

    const storage = getStorage()
    if (storage) {
      saveDraft(storage, storageKey, normalized)
    }

    setDraft(normalized)
    setSaveState(offline ? 'offline' : 'saved')
    setStatusMessage(
      offline ? 'บันทึกฉบับร่างไว้แล้ว รอเชื่อมต่อเพื่อส่งข้อมูล' : 'บันทึกข้อมูลเรียบร้อย',
    )
  }

  return (
    <main className="screen">
      <section className="hero">
        <div className="eyebrow">Phase 1A Identity</div>
        <h1>เริ่มต้นใช้งานบัญชี</h1>
        <p className="lede">
          ตั้งค่าภาษา ข้อมูลติดต่อ และบทบาทเริ่มต้นด้วยข้อมูลทดสอบที่ปลอดภัย
        </p>
      </section>

      <section className="card">
        <div className="cardHeader">
          <h2>ฉบับร่างบนอุปกรณ์</h2>
          <span className={`badge ${saveState}`}>{saveState === 'offline' ? 'ออฟไลน์' : 'พร้อมบันทึก'}</span>
        </div>
        <p className="status" role="status" aria-live="polite">
          {statusMessage}
        </p>

        <form className="form" onSubmit={handleSubmit}>
          <label htmlFor="onboarding-name">ชื่อแสดงผล</label>
          <input
            autoComplete="name"
            id="onboarding-name"
            name="displayName"
            onChange={(event) =>
              setDraft((current) => ({ ...current, displayName: event.target.value }))
            }
            placeholder="สมชาย เมกเกอร์"
            value={draft.displayName}
          />

          <div className="grid">
            <label htmlFor="onboarding-locale">
              ภาษา
              <input
                id="onboarding-locale"
                name="locale"
                onChange={(event) => setDraft((current) => ({ ...current, locale: event.target.value }))}
                placeholder="th-TH"
                value={draft.locale}
              />
            </label>

            <label htmlFor="onboarding-country">
              ประเทศ
              <input
                id="onboarding-country"
                name="countryCode"
                onChange={(event) =>
                  setDraft((current) => ({ ...current, countryCode: event.target.value }))
                }
                placeholder="TH"
                value={draft.countryCode}
              />
            </label>
          </div>

          <label htmlFor="onboarding-role">
            บทบาทเริ่มต้น
            <select
              id="onboarding-role"
              name="onboardingRoleCode"
              onChange={(event) =>
                setDraft((current) => ({ ...current, onboardingRoleCode: event.target.value }))
              }
              value={draft.onboardingRoleCode}
            >
              <option value="BUYER">ผู้ซื้อ</option>
              <option value="DESIGNER">นักออกแบบ</option>
              <option value="PROVIDER">ผู้รับพิมพ์</option>
              <option value="SELLER">ผู้ขาย</option>
            </select>
          </label>

          <label htmlFor="onboarding-phone">
            เบอร์โทรศัพท์
            <input
              autoComplete="tel"
              id="onboarding-phone"
              name="phoneE164"
              onChange={(event) =>
                setDraft((current) => ({ ...current, phoneE164: event.target.value }))
              }
              placeholder="+66812345678"
              value={draft.phoneE164}
            />
          </label>

          <div className="actions">
            <button
              className="button secondary"
              type="button"
              onClick={() => {
                const storage = getStorage()
                if (storage) {
                  clearDraft(storage, storageKey)
                }
                setDraft(initialDraft)
                setSaveState('idle')
                setStatusMessage('ลบฉบับร่างแล้ว')
              }}
            >
              ลบฉบับร่าง
            </button>
            <button className="button primary" type="submit">
              บันทึกและเปิดใช้งาน
            </button>
          </div>
        </form>
      </section>
    </main>
  )
}
