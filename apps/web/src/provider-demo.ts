import { parseUuidv7 } from '@pim/domain'
import type {
  ProviderOnboardingOverviewDto,
  ProviderWorkspaceDto,
  PublicProviderCardDto,
} from '@pim/application'

export const demoProviderWorkspace: ProviderWorkspaceDto = Object.freeze({
  profile: Object.freeze({
    id: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fd301'),
    publicName: 'Bangkok Design Lab',
    serviceRegion: 'กรุงเทพมหานคร',
    status: 'ACTIVE',
    version: 3,
  }),
  services: [
    Object.freeze({
      id: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fd311'),
      instantOrderEnabled: false,
      leadTimeDays: 4,
      providerProfileId: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fd301'),
      serviceDescription: 'รับออกแบบไฟล์พร้อมจัดเตรียมสำหรับพิมพ์',
      serviceName: 'Design Starter',
      serviceRegion: 'กรุงเทพมหานคร',
      serviceType: 'DESIGN_ONLY',
      status: 'ACTIVE',
      version: 2,
    }),
    Object.freeze({
      id: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fd312'),
      instantOrderEnabled: true,
      leadTimeDays: 6,
      providerProfileId: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fd301'),
      serviceDescription: 'พิมพ์เรซินคุณภาพสูง',
      serviceName: 'Print Resin',
      serviceRegion: 'กรุงเทพมหานคร',
      serviceType: 'PRINT_ONLY',
      status: 'PAUSED',
      version: 4,
    }),
  ],
})

export const demoProviderOnboardingOverview: ProviderOnboardingOverviewDto = Object.freeze({
  approvedBadge: true,
  canPublishDesignOnly: true,
  canPublishInstantPrint: true,
  profile: demoProviderWorkspace.profile,
  services: demoProviderWorkspace.services,
  steps: Object.freeze([
    Object.freeze({
      code: 'PROFILE',
      detail: 'Public name and region are ready',
      label: 'Profile',
      required: true,
      status: 'COMPLETE',
    }),
    Object.freeze({
      code: 'SERVICES',
      detail: '2 service drafts configured',
      label: 'Services',
      required: true,
      status: 'COMPLETE',
    }),
    Object.freeze({
      code: 'VERIFICATION',
      detail: 'Approved verification badge is visible to buyers',
      label: 'Verification',
      required: true,
      status: 'COMPLETE',
    }),
    Object.freeze({
      code: 'PRINTER_SETUP',
      detail: 'Active printers are required for print-capable services',
      label: 'Printer Setup',
      required: true,
      status: 'COMPLETE',
    }),
    Object.freeze({
      code: 'MATERIAL_STOCK',
      detail: 'Keep active capability and stocked material data aligned',
      label: 'Material Stock',
      required: true,
      status: 'COMPLETE',
    }),
    Object.freeze({
      code: 'CAPACITY',
      detail: 'Capacity is optional now but recommended before taking live jobs',
      label: 'Capacity',
      required: false,
      status: 'OPTIONAL',
    }),
  ]),
})

export const demoPublicProviderCard: PublicProviderCardDto = Object.freeze({
  approvedBadge: true,
  id: demoProviderWorkspace.profile.id,
  leadTimeDaysMin: 4,
  lowSampleSize: true,
  onTimeRatePercent: 96,
  portfolioPlaceholders: Object.freeze([
    'Portfolio preview coming soon',
    'Finished print showcase coming soon',
    'Design-to-print case study coming soon',
  ]),
  publicName: demoProviderWorkspace.profile.publicName,
  ratingAverage: 4.8,
  ratingCount: 4,
  serviceRegion: demoProviderWorkspace.profile.serviceRegion,
  serviceTypes: Object.freeze([
    'DESIGN_ONLY',
    'PRINT_ONLY',
  ] as const),
  sponsored: false,
  status: demoProviderWorkspace.profile.status,
})

export function createEmptyProviderWorkspace(): ProviderWorkspaceDto {
  return Object.freeze({
    profile: Object.freeze({
      id: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fd320'),
      publicName: 'Draft Provider',
      serviceRegion: null,
      status: 'DRAFT',
      version: 1,
    }),
    services: [],
  })
}

export function createLoadingProviderWorkspace(): ProviderWorkspaceDto {
  return Object.freeze({
    profile: Object.freeze({
      id: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fd330'),
      publicName: 'Loading Provider',
      serviceRegion: 'กรุงเทพมหานคร',
      status: 'PAUSED',
      version: 1,
    }),
    services: [],
  })
}
