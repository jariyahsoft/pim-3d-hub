import { createMoneyMinor, parseUtcTimestamp, parseUuidv7 } from '@pim/domain'
import type { ServiceRequestDto } from '@pim/application'

export const serviceRequestDraftStorageKey = 'pim-3d-hub:service-request-draft'

export type ServiceRequestDraft = Readonly<{
  budgetCurrency: string
  budgetMinor: string
  category: string
  description: string
  dueAt: string
  objective: string
  prohibitedWorkAcknowledged: boolean
  quantity: string
  serviceRegion: string
  serviceType: 'DESIGN_ONLY' | 'PRINT_ONLY' | 'DESIGN_AND_PRINT'
  title: string
  visibility: 'PUBLIC' | 'INVITE_ONLY' | 'PRIVATE_DIRECT' | 'ORGANIZATION_INTERNAL'
}>

export const demoServiceRequestDraft: ServiceRequestDraft = Object.freeze({
  budgetCurrency: 'THB',
  budgetMinor: '5500',
  category: 'Prototype',
  description: 'ต้องการผู้ช่วยปรับโมเดลและเตรียมไฟล์สำหรับการผลิตล็อตแรก',
  dueAt: '2026-07-05T10:00',
  objective: 'Prototype review',
  prohibitedWorkAcknowledged: true,
  quantity: '2',
  serviceRegion: 'กรุงเทพมหานคร',
  serviceType: 'DESIGN_AND_PRINT',
  title: 'Prototype desk accessory',
  visibility: 'PRIVATE_DIRECT',
})

export const demoServiceRequest: ServiceRequestDto = Object.freeze({
  attachments: [],
  budget: createMoneyMinor(5500, 'THB'),
  buyerUserId: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fd401'),
  category: 'Prototype',
  closedAt: null,
  description: 'ต้องการผู้ช่วยปรับโมเดลและเตรียมไฟล์สำหรับการผลิตล็อตแรก',
  dueAt: parseUtcTimestamp('2026-07-05T10:00:00.000Z'),
  id: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fd402'),
  objective: 'Prototype review',
  organizationId: null,
  prohibitedWorkAcknowledged: true,
  publishedAt: null,
  quantity: 2,
  serviceRegion: 'กรุงเทพมหานคร',
  serviceType: 'DESIGN_AND_PRINT',
  status: 'DRAFT',
  statusHistory: [
    Object.freeze({
      changedAt: parseUtcTimestamp('2026-06-28T10:00:00.000Z'),
      changedBy: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fd401'),
      fromStatus: null,
      note: 'Draft created',
      toStatus: 'DRAFT',
    }),
  ],
  title: 'Prototype desk accessory',
  version: 1,
  visibility: 'PRIVATE_DIRECT',
})

export function createEmptyServiceRequestDraft(): ServiceRequestDraft {
  return Object.freeze({
    budgetCurrency: 'THB',
    budgetMinor: '',
    category: '',
    description: '',
    dueAt: '',
    objective: '',
    prohibitedWorkAcknowledged: false,
    quantity: '1',
    serviceRegion: '',
    serviceType: 'DESIGN_ONLY',
    title: '',
    visibility: 'PRIVATE_DIRECT',
  })
}
