import type { TrustOverviewDto } from '@pim/application'
import { parseUtcTimestamp, parseUuidv7 } from '@pim/domain'

export const demoTrustOverview: TrustOverviewDto = Object.freeze({
  organizations: [
    Object.freeze({
      id: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fd101'),
      members: [
        Object.freeze({
          acceptedAt: parseUtcTimestamp('2026-06-27T12:00:00.000Z'),
          id: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fd111'),
          invitedByUserId: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fd001'),
          memberRoleCode: 'OWNER',
          status: 'ACTIVE',
          userId: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fd001'),
          version: 2,
        }),
        Object.freeze({
          acceptedAt: parseUtcTimestamp('2026-06-27T12:05:00.000Z'),
          id: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fd112'),
          invitedByUserId: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fd001'),
          memberRoleCode: 'FINANCE_ADMIN',
          status: 'ACTIVE',
          userId: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fd002'),
          version: 1,
        }),
      ],
      name: 'Factory Guild Co.',
      ownerUserId: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fd001'),
      status: 'ACTIVE',
      type: 'BUSINESS',
      version: 3,
    }),
  ],
  roles: [
    Object.freeze({
      id: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fd201'),
      kycRequired: false,
      roleCode: 'BUYER',
      scopeId: null,
      scopeType: 'GLOBAL',
      status: 'ACTIVE',
      verificationCaseId: null,
      version: 1,
    }),
    Object.freeze({
      id: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fd202'),
      kycRequired: true,
      roleCode: 'PRINT_PROVIDER',
      scopeId: null,
      scopeType: 'GLOBAL',
      status: 'REQUESTED',
      verificationCaseId: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fd301'),
      version: 2,
    }),
  ],
  verificationCases: [
    Object.freeze({
      decisionReason: 'ภาพถ่ายล่าสุดยังไม่ชัดเจน',
      documents: [
        Object.freeze({
          maskedLabel: 'บัตรประชาชนลงท้าย 1234',
          sourceType: 'PRIVATE_ASSET',
        }),
      ],
      id: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fd301'),
      requestedRoleCode: 'PRINT_PROVIDER',
      resubmissionCount: 1,
      reviewerUserId: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fd901'),
      status: 'NEEDS_MORE_INFO',
      subjectId: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fd001'),
      subjectType: 'USER',
      type: 'ROLE_KYC',
      version: 4,
    }),
  ],
})
