'use client'

import { useState, type FormEvent, type ReactElement } from 'react'
import {
  demoProviderOnboardingOverview,
  demoProviderWorkspace,
  demoPublicProviderCard,
  createEmptyProviderWorkspace,
} from './provider-demo.js'
import { parseUuidv7 } from '@pim/domain'
import type {
  ProviderOnboardingOverviewDto,
  ProviderServiceDto,
  ProviderWorkspaceDto,
  PublicProviderCardDto,
} from '@pim/application'

type ServiceDraft = Readonly<{
  instantOrderEnabled: boolean
  leadTimeDays: string
  serviceDescription: string
  serviceName: string
  serviceRegion: string
  serviceType: ProviderServiceDto['serviceType']
  status: ProviderServiceDto['status']
}>

type ProviderScreenProps = Readonly<{
  initialLoading?: boolean
  initialOnboardingOverview?: ProviderOnboardingOverviewDto
  initialPublicCard?: PublicProviderCardDto
  initialWorkspace?: ProviderWorkspaceDto
}>

function createDemoServiceId(index: number): ReturnType<typeof parseUuidv7> {
  return parseUuidv7(`018f18b2-4c4f-7c7a-9e12-${index.toString().padStart(12, '0')}`)
}

function createServiceDraft(service?: ProviderServiceDto): ServiceDraft {
  return {
    instantOrderEnabled: service?.instantOrderEnabled ?? false,
    leadTimeDays: service ? String(service.leadTimeDays) : '4',
    serviceDescription: service?.serviceDescription ?? 'คำอธิบายบริการสำหรับลูกค้า',
    serviceName: service?.serviceName ?? 'Design Starter',
    serviceRegion: service?.serviceRegion ?? 'กรุงเทพมหานคร',
    serviceType: service?.serviceType ?? 'DESIGN_ONLY',
    status: service?.status ?? 'DRAFT',
  }
}

function summarizeServices(services: readonly ProviderServiceDto[]): string {
  if (services.length === 0) {
    return 'ยังไม่มีบริการที่เผยแพร่'
  }

  const activeCount = services.filter((service) => service.status === 'ACTIVE').length
  const pausedCount = services.filter((service) => service.status === 'PAUSED').length
  const instantCount = services.filter((service) => service.instantOrderEnabled).length
  return `ใช้งานอยู่ ${activeCount} รายการ, หยุดชั่วคราว ${pausedCount} รายการ, instant ${instantCount} รายการ`
}

function isPrintCapableServiceType(serviceType: ProviderServiceDto['serviceType']): boolean {
  return serviceType === 'PRINT_ONLY' || serviceType === 'DESIGN_AND_PRINT'
}

function deriveOnboardingOverview(
  workspace: ProviderWorkspaceDto,
  template: ProviderOnboardingOverviewDto,
): ProviderOnboardingOverviewDto {
  const hasServices = workspace.services.length > 0
  const hasPrintService = workspace.services.some((service) => isPrintCapableServiceType(service.serviceType))
  const profileComplete = workspace.profile.publicName.trim().length > 0 && (workspace.profile.serviceRegion?.trim().length ?? 0) > 0
  const hasInstantPrint = workspace.services.some((service) => service.instantOrderEnabled)
  const capacityStep = template.steps.find((step) => step.code === 'CAPACITY')

  return Object.freeze({
    approvedBadge: template.approvedBadge,
    canPublishDesignOnly: profileComplete,
    canPublishInstantPrint: template.canPublishInstantPrint && hasPrintService,
    profile: workspace.profile,
    services: workspace.services,
    steps: Object.freeze([
      Object.freeze({
        code: 'PROFILE',
        detail: profileComplete
          ? 'Public name and region are ready'
          : 'Add public name and service region before publishing',
        label: 'Profile',
        required: true,
        status: profileComplete ? 'COMPLETE' : 'ACTION_REQUIRED',
      }),
      Object.freeze({
        code: 'SERVICES',
        detail: hasServices
          ? `${workspace.services.length} service draft${workspace.services.length === 1 ? '' : 's'} configured`
          : 'Create at least one provider service',
        label: 'Services',
        required: true,
        status: hasServices ? 'COMPLETE' : 'ACTION_REQUIRED',
      }),
      Object.freeze({
        code: 'VERIFICATION',
        detail: template.approvedBadge
          ? 'Approved verification badge is visible to buyers'
          : 'Verification is still pending public approval badge',
        label: 'Verification',
        required: true,
        status: template.approvedBadge ? 'COMPLETE' : 'ACTION_REQUIRED',
      }),
      Object.freeze({
        code: 'PRINTER_SETUP',
        detail: hasPrintService
          ? 'Active printers are required for print-capable services'
          : 'Skip printer setup if you only publish design services',
        label: 'Printer Setup',
        required: hasPrintService,
        status: hasPrintService ? (template.canPublishInstantPrint ? 'COMPLETE' : 'ACTION_REQUIRED') : 'OPTIONAL',
      }),
      Object.freeze({
        code: 'MATERIAL_STOCK',
        detail: hasPrintService
          ? 'Keep active capability and stocked material data aligned'
          : 'Material stock becomes required when you offer print services',
        label: 'Material Stock',
        required: hasPrintService,
        status: hasPrintService ? (template.canPublishInstantPrint ? 'COMPLETE' : 'ACTION_REQUIRED') : 'OPTIONAL',
      }),
      Object.freeze({
        code: 'CAPACITY',
        detail: hasInstantPrint
          ? 'Capacity is optional now but recommended before taking live jobs'
          : 'Capacity becomes useful when you start accepting live jobs',
        label: 'Capacity',
        required: false,
        status: capacityStep?.status ?? 'OPTIONAL',
      }),
    ]),
  })
}

function derivePublicProviderCard(
  workspace: ProviderWorkspaceDto,
  template: PublicProviderCardDto,
): PublicProviderCardDto {
  const activeServices = workspace.services.filter((service) => service.status === 'ACTIVE')
  const leadTimeDaysMin =
    activeServices.length > 0
      ? activeServices.reduce((minimum, service) => Math.min(minimum, service.leadTimeDays), activeServices[0]!.leadTimeDays)
      : null

  return Object.freeze({
    ...template,
    id: workspace.profile.id,
    leadTimeDaysMin,
    publicName: workspace.profile.publicName,
    serviceRegion: workspace.profile.serviceRegion,
    serviceTypes: [...new Set(activeServices.map((service) => service.serviceType))],
    status: workspace.profile.status,
  })
}

export function ProviderScreen(props: ProviderScreenProps): ReactElement {
  const [workspace, setWorkspace] = useState<ProviderWorkspaceDto>(
    props.initialWorkspace ?? demoProviderWorkspace,
  )
  const [loading, setLoading] = useState(props.initialLoading ?? false)
  const [statusMessage, setStatusMessage] = useState(
    'จัดการ onboarding, trust และ public card ของผู้ให้บริการแบบ mobile-first',
  )
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [draft, setDraft] = useState<ServiceDraft>(createServiceDraft(workspace.services[0]))
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null)

  const onboarding = deriveOnboardingOverview(
    workspace,
    props.initialOnboardingOverview ?? demoProviderOnboardingOverview,
  )
  const publicCard = derivePublicProviderCard(
    workspace,
    props.initialPublicCard ?? demoPublicProviderCard,
  )

  function resetDraft(): void {
    setDraft(createServiceDraft())
    setEditingServiceId(null)
  }

  function openService(service?: ProviderServiceDto): void {
    setDraft(createServiceDraft(service))
    setEditingServiceId(service?.id ?? null)
    setErrorMessage(null)
    setStatusMessage(service ? `กำลังแก้ไข ${service.serviceName}` : 'สร้างบริการใหม่')
  }

  function saveService(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    setErrorMessage(null)

    const serviceName = draft.serviceName.trim()
    const serviceDescription = draft.serviceDescription.trim()
    const serviceRegion = draft.serviceRegion.trim()
    const leadTimeDays = Number(draft.leadTimeDays)

    if (!serviceName) {
      setErrorMessage('กรุณากรอกชื่อบริการ')
      return
    }

    if (!serviceDescription) {
      setErrorMessage('กรุณากรอกคำอธิบายบริการ')
      return
    }

    if (!serviceRegion) {
      setErrorMessage('กรุณากรอกพื้นที่ให้บริการ')
      return
    }

    if (!Number.isInteger(leadTimeDays) || leadTimeDays <= 0) {
      setErrorMessage('lead time ต้องมากกว่า 0 วัน')
      return
    }

    if (draft.instantOrderEnabled && !isPrintCapableServiceType(draft.serviceType)) {
      setErrorMessage('Instant order ใช้ได้เฉพาะบริการที่มีงานพิมพ์')
      return
    }

    const service: ProviderServiceDto = Object.freeze({
      id: editingServiceId ? parseUuidv7(editingServiceId) : createDemoServiceId(workspace.services.length + 31),
      instantOrderEnabled: draft.instantOrderEnabled,
      leadTimeDays,
      providerProfileId: workspace.profile.id,
      serviceDescription,
      serviceName,
      serviceRegion,
      serviceType: draft.serviceType,
      status: draft.status,
      version: editingServiceId
        ? (workspace.services.find((item) => item.id === editingServiceId)?.version ?? 1) + 1
        : 1,
    })

    setWorkspace((current) => {
      const nextServices = editingServiceId
        ? current.services.map((item) => (item.id === editingServiceId ? service : item))
        : [service, ...current.services]

      return {
        ...current,
        services: nextServices,
      }
    })
    setStatusMessage(
      editingServiceId ? 'บันทึกการแก้ไขบริการแล้ว' : 'เพิ่มบริการร่างใหม่แล้ว',
    )
    setEditingServiceId(null)
    setDraft(createServiceDraft())
  }

  function toggleServiceStatus(serviceId: string): void {
    setWorkspace((current) => ({
      ...current,
      services: current.services.map((service) =>
        service.id === serviceId
          ? {
              ...service,
              status: service.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE',
              version: service.version + 1,
            }
          : service,
      ),
    }))
    setStatusMessage('อัปเดตสถานะบริการแล้ว')
  }

  const emptyState = workspace.services.length === 0

  return (
    <main className="screen">
      <section className="hero compact">
        <div className="eyebrow">Phase 1A Provider Supply</div>
        <h1>Provider onboarding, profile and trust</h1>
        <p className="lede">
          ดูแล readiness checklist, service draft, approved badge และ public buyer card จากข้อมูลชุดเดียวกัน
        </p>
      </section>

      <section className="stack">
        <article className="card">
          <div className="cardHeader">
            <h2>{workspace.profile.publicName}</h2>
            <span className="pill">{workspace.profile.status}</span>
          </div>
          <p className="status" role="status" aria-live="polite">
            {statusMessage}
          </p>
          {errorMessage ? (
            <p className="error" role="alert">
              {errorMessage}
            </p>
          ) : null}
          <dl className="detailList">
            <div>
              <dt>พื้นที่บริการ</dt>
              <dd>{workspace.profile.serviceRegion ?? 'ยังไม่ระบุ'}</dd>
            </div>
            <div>
              <dt>สรุปบริการ</dt>
              <dd>{summarizeServices(workspace.services)}</dd>
            </div>
            <div>
              <dt>เวอร์ชันโปรไฟล์</dt>
              <dd>{workspace.profile.version}</dd>
            </div>
          </dl>
        </article>

        <article className="card">
          <div className="cardHeader">
            <h2>Onboarding checklist</h2>
            <span className={`badge ${onboarding.approvedBadge ? 'saved' : 'idle'}`}>
              {onboarding.approvedBadge ? 'Approved badge' : 'Verification pending'}
            </span>
          </div>
          <p className="status">
            Publish design-only: {onboarding.canPublishDesignOnly ? 'พร้อมใช้งาน' : 'ยังไม่พร้อม'} · Instant print:{' '}
            {onboarding.canPublishInstantPrint ? 'พร้อมใช้งาน' : 'ต้องเติมข้อมูล'}
          </p>
          <div className="cardStack">
            {onboarding.steps.map((step) => (
              <article className="addressCard" key={step.code}>
                <div className="addressCardTop">
                  <strong>{step.label}</strong>
                  <span className="pill">{step.status}</span>
                </div>
                <p>{step.detail}</p>
              </article>
            ))}
          </div>
        </article>

        <article className="card">
          <div className="cardHeader">
            <h2>Public provider card</h2>
            <span className={`badge ${publicCard.sponsored ? 'offline' : 'saved'}`}>
              {publicCard.sponsored ? 'Sponsored' : 'Organic'}
            </span>
          </div>
          <div className="cardStack">
            <article className="addressCard">
              <div className="addressCardTop">
                <strong>{publicCard.publicName}</strong>
                <span className="pill">{publicCard.approvedBadge ? 'Approved' : 'Pending'}</span>
              </div>
              <p>
                {publicCard.serviceRegion ?? 'ยังไม่ระบุ'} · lead time {publicCard.leadTimeDaysMin ?? '-'} วัน
              </p>
              <p>
                คะแนน {publicCard.ratingAverage ?? '-'} ({publicCard.ratingCount} รีวิว) · on-time{' '}
                {publicCard.onTimeRatePercent ?? '-'}%
              </p>
              <p>{publicCard.lowSampleSize ? 'Low sample size disclosed' : 'Metrics ready for comparison'}</p>
              <p>{publicCard.serviceTypes.join(', ') || 'ยังไม่มีบริการ active'}</p>
            </article>
            <article className="addressCard">
              <div className="addressCardTop">
                <strong>Portfolio placeholders</strong>
                <span className="pill">{publicCard.portfolioPlaceholders.length} slots</span>
              </div>
              <ul className="featureList">
                {publicCard.portfolioPlaceholders.map((placeholder) => (
                  <li key={placeholder}>{placeholder}</li>
                ))}
              </ul>
            </article>
          </div>
        </article>

        <article className="card">
          <div className="cardHeader">
            <h2>คำอธิบายประเภทบริการ</h2>
            <span className="pill">แยกอิสระ</span>
          </div>
          <ul className="featureList">
            <li>DESIGN_ONLY สำหรับงานออกแบบและเตรียมไฟล์</li>
            <li>PRINT_ONLY สำหรับงานพิมพ์และคิวผลิต</li>
            <li>DESIGN_AND_PRINT สำหรับบริการเต็มรูปแบบ</li>
          </ul>
        </article>

        <article className="card">
          <div className="cardHeader">
            <h2>สถานะการโหลด</h2>
            <span className={`badge ${loading ? 'offline' : 'saved'}`}>
              {loading ? 'กำลังโหลด' : 'พร้อมใช้งาน'}
            </span>
          </div>
          <div className="actions">
            <button className="button secondary" type="button" onClick={() => setLoading((current) => !current)}>
              {loading ? 'แสดงข้อมูล' : 'จำลองโหลดข้อมูล'}
            </button>
            <button className="button secondary" type="button" onClick={() => setWorkspace(createEmptyProviderWorkspace())}>
              แสดง empty state
            </button>
            <button className="button secondary" type="button" onClick={() => setWorkspace(props.initialWorkspace ?? demoProviderWorkspace)}>
              คืนค่าตัวอย่าง
            </button>
          </div>
          {loading ? (
            <p className="status">กำลังดึงข้อมูลโปรไฟล์ บริการ checklist และ buyer card กรุณารอสักครู่</p>
          ) : null}
        </article>

        {emptyState ? (
          <article className="card">
            <h2>ยังไม่มีบริการ</h2>
            <p className="status">เริ่มจากสร้าง service draft อย่างน้อย 1 รายการเพื่อเปิดใช้งาน readiness checklist</p>
          </article>
        ) : (
          <article className="card">
            <div className="cardHeader">
              <h2>บริการที่มีอยู่</h2>
              <span className="pill">{workspace.services.length} รายการ</span>
            </div>
            <div className="cardStack">
              {workspace.services.map((service) => (
                <article className="addressCard" key={service.id}>
                  <div className="addressCardTop">
                    <strong>{service.serviceName}</strong>
                    <span className="pill">{service.status}</span>
                  </div>
                  <p>
                    {service.serviceType} · {service.instantOrderEnabled ? 'Instant order' : 'Manual quote'}
                  </p>
                  <p>{service.serviceDescription}</p>
                  <p>
                    พื้นที่ {service.serviceRegion} · lead time {service.leadTimeDays} วัน
                  </p>
                  <div className="actions">
                    <button className="button secondary" type="button" onClick={() => openService(service)}>
                      แก้ไข
                    </button>
                    <button className="button secondary" type="button" onClick={() => toggleServiceStatus(service.id)}>
                      {service.status === 'ACTIVE' ? 'พักใช้งาน' : 'กลับมาใช้งาน'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </article>
        )}

        <article className="card">
          <div className="cardHeader">
            <h2>{editingServiceId ? 'แก้ไขบริการ' : 'สร้างบริการใหม่'}</h2>
            <span className="pill">{draft.status}</span>
          </div>
          <form className="form" onSubmit={saveService}>
            <label htmlFor="provider-service-name">
              ชื่อบริการ
              <input
                id="provider-service-name"
                onChange={(event) =>
                  setDraft((current) => ({ ...current, serviceName: event.target.value }))
                }
                value={draft.serviceName}
              />
            </label>

            <label htmlFor="provider-service-region">
              พื้นที่บริการ
              <input
                id="provider-service-region"
                onChange={(event) =>
                  setDraft((current) => ({ ...current, serviceRegion: event.target.value }))
                }
                value={draft.serviceRegion}
              />
            </label>

            <label htmlFor="provider-service-type">
              ประเภทบริการ
              <select
                id="provider-service-type"
                onChange={(event) =>
                  setDraft((current) => {
                    const serviceType = event.target.value as ProviderServiceDto['serviceType']
                    return {
                      ...current,
                      instantOrderEnabled:
                        serviceType === 'DESIGN_ONLY' ? false : current.instantOrderEnabled,
                      serviceType,
                    }
                  })
                }
                value={draft.serviceType}
              >
                <option value="DESIGN_ONLY">DESIGN_ONLY</option>
                <option value="PRINT_ONLY">PRINT_ONLY</option>
                <option value="DESIGN_AND_PRINT">DESIGN_AND_PRINT</option>
              </select>
            </label>

            <label htmlFor="provider-service-description">
              คำอธิบายบริการ
              <input
                id="provider-service-description"
                onChange={(event) =>
                  setDraft((current) => ({ ...current, serviceDescription: event.target.value }))
                }
                value={draft.serviceDescription}
              />
            </label>

            <label htmlFor="provider-service-lead-time">
              Lead time (วัน)
              <input
                id="provider-service-lead-time"
                inputMode="numeric"
                onChange={(event) =>
                  setDraft((current) => ({ ...current, leadTimeDays: event.target.value }))
                }
                value={draft.leadTimeDays}
              />
            </label>

            <label htmlFor="provider-service-instant-order">
              <span>Instant order enabled</span>
              <input
                checked={draft.instantOrderEnabled}
                disabled={!isPrintCapableServiceType(draft.serviceType)}
                id="provider-service-instant-order"
                onChange={(event) =>
                  setDraft((current) => ({ ...current, instantOrderEnabled: event.target.checked }))
                }
                type="checkbox"
              />
            </label>

            <label htmlFor="provider-service-status">
              สถานะ
              <select
                id="provider-service-status"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    status: event.target.value as ProviderServiceDto['status'],
                  }))
                }
                value={draft.status}
              >
                <option value="DRAFT">DRAFT</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="PAUSED">PAUSED</option>
                <option value="SUSPENDED">SUSPENDED</option>
              </select>
            </label>

            <div className="actions">
              <button className="button secondary" type="button" onClick={resetDraft}>
                ล้างฟอร์ม
              </button>
              <button className="button primary" type="submit">
                บันทึกบริการ
              </button>
            </div>
          </form>
        </article>
      </section>
    </main>
  )
}
