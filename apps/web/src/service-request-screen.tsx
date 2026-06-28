'use client'

import { useEffect, useState, type FormEvent, type ReactElement } from 'react'
import {
  clearDraft,
  loadDraft,
  saveDraft,
  type DraftStorageLike,
} from './profile-demo.js'
import {
  createEmptyServiceRequestDraft,
  demoServiceRequest,
  demoServiceRequestDraft,
  serviceRequestDraftStorageKey,
  type ServiceRequestDraft,
} from './service-request-demo.js'
import { createMoneyMinor, parseUtcTimestamp } from '@pim/domain'
import type { ServiceRequestDto } from '@pim/application'

type ScreenStep = 'service' | 'requirements' | 'scope' | 'review'
type SaveState = 'idle' | 'saving' | 'saved' | 'offline'

type ServiceRequestScreenProps = Readonly<{
  initialDraft?: ServiceRequestDraft
  initialErrorMessage?: string | null
  initialLoading?: boolean
  initialPermissionDenied?: boolean
  initialRequest?: ServiceRequestDto
  onSubmit?: (draft: ServiceRequestDraft) => void | Promise<void>
  storageKey?: string
}>

const steps: readonly ScreenStep[] = ['service', 'requirements', 'scope', 'review']

function hasWindowStorage(): boolean {
  return typeof window !== 'undefined' && 'localStorage' in window
}

function getStorage(): DraftStorageLike | null {
  return hasWindowStorage() ? window.localStorage : null
}

function stepLabel(step: ScreenStep): string {
  switch (step) {
    case 'service':
      return 'เลือกบริการ'
    case 'requirements':
      return 'รายละเอียดงาน'
    case 'scope':
      return 'งบและความเป็นส่วนตัว'
    case 'review':
      return 'ตรวจสอบและเผยแพร่'
  }
}

export function ServiceRequestScreen(props: ServiceRequestScreenProps): ReactElement {
  const storageKey = props.storageKey ?? serviceRequestDraftStorageKey
  const [draft, setDraft] = useState<ServiceRequestDraft>(props.initialDraft ?? demoServiceRequestDraft)
  const [step, setStep] = useState<ScreenStep>('service')
  const [loading, setLoading] = useState(props.initialLoading ?? false)
  const [permissionDenied, setPermissionDenied] = useState(props.initialPermissionDenied ?? false)
  const [errorMessage, setErrorMessage] = useState<string | null>(props.initialErrorMessage ?? null)
  const [statusMessage, setStatusMessage] = useState('เลือกประเภทบริการแล้วค่อยเติมรายละเอียดแบบค่อยเป็นค่อยไป')
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [offline, setOffline] = useState(false)
  const [requestPreview, setRequestPreview] = useState<ServiceRequestDto>(props.initialRequest ?? demoServiceRequest)

  useEffect(() => {
    const storage = getStorage()
    if (!storage) {
      return
    }

    const stored = loadDraft<ServiceRequestDraft>(storage, storageKey)
    if (stored) {
      setDraft(stored)
      setStatusMessage('กู้คืนฉบับร่างคำขอรับบริการที่บันทึกไว้แล้ว')
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
      const nextOffline = !window.navigator.onLine
      setOffline(nextOffline)
      setSaveState(nextOffline ? 'offline' : 'idle')
    }

    syncOnlineState()
    window.addEventListener('online', syncOnlineState)
    window.addEventListener('offline', syncOnlineState)

    return () => {
      window.removeEventListener('online', syncOnlineState)
      window.removeEventListener('offline', syncOnlineState)
    }
  }, [])

  function validateDraft(): string | null {
    if (!draft.title.trim()) {
      return 'กรุณากรอกชื่องาน'
    }
    if (!draft.description.trim()) {
      return 'กรุณากรอกรายละเอียดงาน'
    }
    if (!draft.serviceRegion.trim()) {
      return 'กรุณากรอกพื้นที่ให้บริการ'
    }
    if (!draft.dueAt.trim()) {
      return 'กรุณากำหนดวันที่ต้องการ'
    }
    if (!draft.budgetMinor.trim() || Number(draft.budgetMinor) < 0) {
      return 'กรุณากรอกงบประมาณเป็นจำนวนเต็มที่ถูกต้อง'
    }
    if (!draft.prohibitedWorkAcknowledged) {
      return 'ต้องยืนยันการรับทราบข้อห้ามก่อนเผยแพร่'
    }
    return null
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    const validationError = validateDraft()
    if (validationError) {
      setErrorMessage(validationError)
      setStatusMessage('ยังเผยแพร่ไม่ได้ ตรวจสอบข้อมูลที่จำเป็นอีกครั้ง')
      return
    }

    setSaveState('saving')
    setErrorMessage(null)
    setStatusMessage('กำลังบันทึกและเตรียมเผยแพร่คำขอรับบริการ')

    await props.onSubmit?.(draft)

    setRequestPreview((current) => ({
      ...current,
      budget: createMoneyMinor(Number(draft.budgetMinor), draft.budgetCurrency.trim().toUpperCase()),
      category: draft.category.trim() || null,
      description: draft.description.trim(),
      dueAt: parseUtcTimestamp(new Date(draft.dueAt).toISOString()),
      objective: draft.objective.trim() || null,
      prohibitedWorkAcknowledged: draft.prohibitedWorkAcknowledged,
      quantity: Number(draft.quantity) || 1,
      serviceRegion: draft.serviceRegion.trim(),
      serviceType: draft.serviceType,
      title: draft.title.trim(),
      visibility: draft.visibility,
    }))

    setSaveState(offline ? 'offline' : 'saved')
    setStatusMessage(offline ? 'บันทึกฉบับร่างไว้แล้ว รอเชื่อมต่อเพื่อเผยแพร่' : 'บันทึกฉบับร่างและอัปเดตตัวอย่างแล้ว')
  }

  if (permissionDenied) {
    return (
      <main className="screen">
        <section className="hero compact">
          <div className="eyebrow">Phase 1A Jobs</div>
          <h1>คำขอรับบริการ</h1>
          <p className="lede">บัญชีนี้ยังไม่มีสิทธิ์ผู้ซื้อสำหรับสร้างคำขอรับบริการ</p>
        </section>
        <section className="card">
          <p className="error" role="alert">
            Permission denied. เปิดใช้งานบทบาทผู้ซื้อก่อนเริ่มบันทึกฉบับร่าง
          </p>
        </section>
      </main>
    )
  }

  return (
    <main className="screen">
      <section className="hero compact">
        <div className="eyebrow">Phase 1A Jobs</div>
        <h1>Service request draft and publish</h1>
        <p className="lede">
          เริ่มจากเลือกประเภทบริการ แล้วค่อยเติม requirement, งบประมาณ, วันครบกำหนด และ privacy mode แบบ mobile-first
        </p>
      </section>

      <section className="stack">
        <article className="card">
          <div className="cardHeader">
            <h2>สถานะฉบับร่าง</h2>
            <span className={`badge ${saveState}`}>{saveState === 'offline' ? 'ออฟไลน์' : 'พร้อมบันทึก'}</span>
          </div>
          <p className="status" role="status" aria-live="polite">
            {statusMessage}
          </p>
          {errorMessage ? (
            <p className="error" role="alert">
              {errorMessage}
            </p>
          ) : null}
          <div className="actions">
            <button className="button secondary" type="button" onClick={() => setLoading((current) => !current)}>
              {loading ? 'แสดงฟอร์ม' : 'จำลองโหลดข้อมูล'}
            </button>
            <button className="button secondary" type="button" onClick={() => setPermissionDenied((current) => !current)}>
              {permissionDenied ? 'เปิดฟอร์ม' : 'จำลองไม่มีสิทธิ์'}
            </button>
            <button
              className="button secondary"
              type="button"
              onClick={() => {
                const storage = getStorage()
                if (storage) {
                  clearDraft(storage, storageKey)
                }
                setDraft(createEmptyServiceRequestDraft())
                setErrorMessage(null)
                setStatusMessage('ลบฉบับร่างคำขอรับบริการแล้ว')
              }}
            >
              ล้างฉบับร่าง
            </button>
          </div>
          {loading ? <p className="status">กำลังดึงข้อมูลคำขอรับบริการ กรุณารอสักครู่</p> : null}
        </article>

        <article className="card">
          <div className="cardHeader">
            <h2>ขั้นตอน</h2>
            <span className="pill">{stepLabel(step)}</span>
          </div>
          <div className="actions">
            {steps.map((candidate) => (
              <button
                className={`button ${candidate === step ? 'primary' : 'secondary'}`}
                key={candidate}
                onClick={() => setStep(candidate)}
                type="button"
              >
                {stepLabel(candidate)}
              </button>
            ))}
          </div>
        </article>

        <article className="card">
          <div className="cardHeader">
            <h2>ตัวอย่างคำขอ</h2>
            <span className="pill">{requestPreview.status}</span>
          </div>
          <dl className="detailList">
            <div>
              <dt>ประเภทบริการ</dt>
              <dd>{requestPreview.serviceType ?? 'ยังไม่เลือก'}</dd>
            </div>
            <div>
              <dt>งบประมาณ</dt>
              <dd>
                {requestPreview.budget ? `${requestPreview.budget.minorUnits} ${requestPreview.budget.currency}` : 'ยังไม่ระบุ'}
              </dd>
            </div>
            <div>
              <dt>Privacy mode</dt>
              <dd>{requestPreview.visibility}</dd>
            </div>
            <div>
              <dt>Status history</dt>
              <dd>{requestPreview.statusHistory.length} รายการ</dd>
            </div>
          </dl>
        </article>

        <article className="card">
          <div className="cardHeader">
            <h2>ฟอร์มคำขอรับบริการ</h2>
            <span className="pill">{stepLabel(step)}</span>
          </div>
          <form className="form" onSubmit={handleSubmit}>
            <label htmlFor="service-request-service-type">
              ประเภทบริการ
              <select
                id="service-request-service-type"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    serviceType: event.target.value as ServiceRequestDraft['serviceType'],
                  }))
                }
                value={draft.serviceType}
              >
                <option value="DESIGN_ONLY">DESIGN_ONLY</option>
                <option value="PRINT_ONLY">PRINT_ONLY</option>
                <option value="DESIGN_AND_PRINT">DESIGN_AND_PRINT</option>
              </select>
            </label>

            <label htmlFor="service-request-title">
              ชื่องาน
              <input
                id="service-request-title"
                onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                value={draft.title}
              />
            </label>

            <label htmlFor="service-request-description">
              รายละเอียดงาน
              <textarea
                id="service-request-description"
                onChange={(event) =>
                  setDraft((current) => ({ ...current, description: event.target.value }))
                }
                value={draft.description}
              />
            </label>

            <div className="grid">
              <label htmlFor="service-request-category">
                หมวดหมู่
                <input
                  id="service-request-category"
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, category: event.target.value }))
                  }
                  value={draft.category}
                />
              </label>

              <label htmlFor="service-request-objective">
                วัตถุประสงค์
                <input
                  id="service-request-objective"
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, objective: event.target.value }))
                  }
                  value={draft.objective}
                />
              </label>
            </div>

            <div className="grid">
              <label htmlFor="service-request-quantity">
                จำนวน
                <input
                  id="service-request-quantity"
                  inputMode="numeric"
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, quantity: event.target.value }))
                  }
                  value={draft.quantity}
                />
              </label>

              <label htmlFor="service-request-region">
                จังหวัดหรือพื้นที่บริการ
                <input
                  id="service-request-region"
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, serviceRegion: event.target.value }))
                  }
                  value={draft.serviceRegion}
                />
              </label>
            </div>

            <div className="grid">
              <label htmlFor="service-request-budget-minor">
                งบประมาณ
                <input
                  id="service-request-budget-minor"
                  inputMode="numeric"
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, budgetMinor: event.target.value }))
                  }
                  value={draft.budgetMinor}
                />
              </label>

              <label htmlFor="service-request-budget-currency">
                Currency
                <input
                  id="service-request-budget-currency"
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, budgetCurrency: event.target.value }))
                  }
                  value={draft.budgetCurrency}
                />
              </label>
            </div>

            <div className="grid">
              <label htmlFor="service-request-due-at">
                วันที่ต้องการ
                <input
                  id="service-request-due-at"
                  onChange={(event) => setDraft((current) => ({ ...current, dueAt: event.target.value }))}
                  type="datetime-local"
                  value={draft.dueAt}
                />
              </label>

              <label htmlFor="service-request-visibility">
                Privacy mode
                <select
                  id="service-request-visibility"
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      visibility: event.target.value as ServiceRequestDraft['visibility'],
                    }))
                  }
                  value={draft.visibility}
                >
                  <option value="PUBLIC">PUBLIC</option>
                  <option value="INVITE_ONLY">INVITE_ONLY</option>
                  <option value="PRIVATE_DIRECT">PRIVATE_DIRECT</option>
                  <option value="ORGANIZATION_INTERNAL">ORGANIZATION_INTERNAL</option>
                </select>
              </label>
            </div>

            <label htmlFor="service-request-prohibited-work">
              <span>รับทราบนโยบายงานต้องห้าม</span>
              <input
                checked={draft.prohibitedWorkAcknowledged}
                id="service-request-prohibited-work"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    prohibitedWorkAcknowledged: event.target.checked,
                  }))
                }
                type="checkbox"
              />
            </label>

            <div className="actions">
              <button className="button secondary" onClick={() => setStep(steps[Math.max(0, steps.indexOf(step) - 1)] ?? 'service')} type="button">
                ย้อนกลับ
              </button>
              <button className="button secondary" onClick={() => setStep(steps[Math.min(steps.length - 1, steps.indexOf(step) + 1)] ?? 'review')} type="button">
                ถัดไป
              </button>
              <button className="button primary" type="submit">
                บันทึกฉบับร่าง
              </button>
            </div>
          </form>
        </article>
      </section>
    </main>
  )
}
