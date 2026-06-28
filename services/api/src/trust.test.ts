import { describe, expect, it } from 'vitest'
import {
  createStructuredLogger,
  createTrustService,
  type ResolveAuthenticatedUserUseCase,
} from '@pim/application'
import { parseUtcTimestamp, parseUuidv7, type UserRecord } from '@pim/domain'
import {
  createInMemoryOrganizationMembershipRepository,
  createInMemoryOrganizationRepository,
  createInMemoryUserRepository,
  createInMemoryUserRoleRepository,
  createInMemoryVerificationCaseRepository,
} from '../../../packages/infrastructure/src/in-memory-user-repositories.js'
import {
  createFakeClock,
  createFakeUuidGenerator,
} from '../../../packages/testkit/src/repository-fakes.js'
import { createAuthenticationMiddleware } from './authentication.js'
import { createTrustController } from './trust.js'

function createUserRecord(id: string): UserRecord {
  return Object.freeze({
    createdAt: parseUtcTimestamp('2026-06-27T13:00:00.000Z'),
    createdBy: null,
    countryCode: 'TH',
    deletedAt: null,
    displayName: 'Somchai Maker',
    id: parseUuidv7(id),
    locale: 'th-TH',
    notificationPreferences: Object.freeze({
      marketingEmail: false,
      marketingPush: false,
      orderStatusEmail: true,
      orderStatusPush: true,
    }),
    onboardingCompletedAt: parseUtcTimestamp('2026-06-27T13:00:00.000Z'),
    onboardingRoleCode: 'BUYER',
    phoneE164: '+66812345678',
    profileImageAssetId: null,
    privacyPreferences: Object.freeze({
      publicProfileVisible: true,
      shareAddressWithOrderParticipants: true,
      sharePhoneWithOrderParticipants: false,
      showProvince: true,
    }),
    schemaVersion: 1,
    status: 'ACTIVE',
    updatedAt: parseUtcTimestamp('2026-06-27T13:00:00.000Z'),
    updatedBy: null,
    version: 1,
  })
}

function createResolver(user: UserRecord): ResolveAuthenticatedUserUseCase {
  return Object.freeze({
    async execute() {
      return {
        externalIdentity: {
          email: 'somchai@example.com',
          emailVerified: true,
          provider: 'firebase' as const,
          providerSubject: `firebase-${user.id}`,
          safeClaims: Object.freeze({ role: 'user' }),
        },
        identity: Object.freeze({
          createdAt: user.createdAt,
          createdBy: null,
          deletedAt: null,
          emailNormalized: 'somchai@example.com',
          emailVerified: true,
          id: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fc999'),
          provider: 'firebase',
          providerSubject: `firebase-${user.id}`,
          schemaVersion: 1,
          updatedAt: user.updatedAt,
          updatedBy: null,
          userId: user.id,
          version: 1,
        }),
        isNewUser: false,
        user,
      }
    },
  })
}

describe('trust API controller', () => {
  it('rejects support attempts to read another user KYC case', async () => {
    const clock = createFakeClock('2026-06-27T13:00:00.000Z')
    const users = createInMemoryUserRepository({ clock })
    const userRoles = createInMemoryUserRoleRepository({ clock })
    const organizations = createInMemoryOrganizationRepository({ clock })
    const organizationMemberships = createInMemoryOrganizationMembershipRepository({ clock })
    const verificationCases = createInMemoryVerificationCaseRepository({ clock })
    const uuidGenerator = createFakeUuidGenerator([
      '018f18b2-4c4f-7c7a-9e12-4c0b8a8fc101',
      '018f18b2-4c4f-7c7a-9e12-4c0b8a8fc102',
    ])

    const applicant = createUserRecord('018f18b2-4c4f-7c7a-9e12-4c0b8a8fc001')
    const support = createUserRecord('018f18b2-4c4f-7c7a-9e12-4c0b8a8fc002')
    await users.create({ id: applicant.id })
    await users.create({ id: support.id })
    await userRoles.create({
      activatedAt: clock.now(),
      createdBy: support.id,
      id: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fc201'),
      roleCode: 'SUPPORT_AGENT',
      scopeType: 'GLOBAL',
      status: 'ACTIVE',
      updatedBy: support.id,
      userId: support.id,
    })

    const service = createTrustService({
      clock,
      organizationMemberships,
      organizations,
      userRoles,
      users,
      verificationCases,
      uuidGenerator,
    })

    const requestedRole = await service.requestRoleActivation({
      actorUserId: applicant.id,
      roleCode: 'PRINT_PROVIDER',
    })
    await service.submitVerificationCase({
      actorUserId: applicant.id,
      caseId: requestedRole.verificationCaseId!,
      documents: [
        {
          assetId: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fc301'),
          maskedLabel: 'Passport ending 4321',
          sourceType: 'PRIVATE_ASSET',
          vendorReference: null,
        },
      ],
      expectedVersion: 1,
    })

    const controller = createTrustController({
      authentication: createAuthenticationMiddleware({
        logger: createStructuredLogger({
          sink() {
            return undefined
          },
        }),
        resolver: createResolver(support),
      }),
      trustService: service,
    })

    const result = await controller.getVerificationCase({
      body: {
        auditReason: 'support review',
      },
      headers: {
        authorization: 'Bearer valid-token',
      },
      params: {
        caseId: requestedRole.verificationCaseId!,
      },
    })

    expect(result).toMatchObject({
      body: {
        error: {
          code: 'AUTHORIZATION_DENIED',
        },
      },
      status: 403,
    })
  })

  it('maps invitation replay validation failures to a 400 response', async () => {
    const clock = createFakeClock('2026-06-27T13:00:00.000Z')
    const users = createInMemoryUserRepository({ clock })
    const userRoles = createInMemoryUserRoleRepository({ clock })
    const organizations = createInMemoryOrganizationRepository({ clock })
    const organizationMemberships = createInMemoryOrganizationMembershipRepository({ clock })
    const verificationCases = createInMemoryVerificationCaseRepository({ clock })
    const uuidGenerator = createFakeUuidGenerator([
      '018f18b2-4c4f-7c7a-9e12-4c0b8a8fc401',
      '018f18b2-4c4f-7c7a-9e12-4c0b8a8fc402',
      '018f18b2-4c4f-7c7a-9e12-4c0b8a8fc403',
    ])

    const owner = createUserRecord('018f18b2-4c4f-7c7a-9e12-4c0b8a8fc011')
    const member = createUserRecord('018f18b2-4c4f-7c7a-9e12-4c0b8a8fc012')
    await users.create({ id: owner.id })
    await users.create({ id: member.id })

    const service = createTrustService({
      clock,
      organizationMemberships,
      organizations,
      userRoles,
      users,
      verificationCases,
      uuidGenerator,
    })

    const organization = await service.createOrganization({
      actorUserId: owner.id,
      name: 'Factory Guild Co.',
    })
    const invitation = await service.inviteOrganizationMember({
      actorUserId: owner.id,
      memberRoleCode: 'MEMBER',
      organizationId: organization.id,
      userId: member.id,
    })
    await service.acceptOrganizationInvitation({
      actorUserId: member.id,
      expectedVersion: invitation.version,
      membershipId: invitation.id,
    })

    const controller = createTrustController({
      authentication: createAuthenticationMiddleware({
        logger: createStructuredLogger({
          sink() {
            return undefined
          },
        }),
        resolver: createResolver(member),
      }),
      trustService: service,
    })

    const result = await controller.acceptOrganizationInvitation({
      body: {
        expectedVersion: invitation.version + 1,
      },
      headers: {
        authorization: 'Bearer valid-token',
      },
      params: {
        membershipId: invitation.id,
      },
    })

    expect(result).toMatchObject({
      body: {
        error: {
          code: 'VALIDATION_ERROR',
        },
      },
      status: 400,
    })
  })

  it('denies revoked members from reading organization details', async () => {
    const clock = createFakeClock('2026-06-27T13:00:00.000Z')
    const users = createInMemoryUserRepository({ clock })
    const userRoles = createInMemoryUserRoleRepository({ clock })
    const organizations = createInMemoryOrganizationRepository({ clock })
    const organizationMemberships = createInMemoryOrganizationMembershipRepository({ clock })
    const verificationCases = createInMemoryVerificationCaseRepository({ clock })
    const uuidGenerator = createFakeUuidGenerator([
      '018f18b2-4c4f-7c7a-9e12-4c0b8a8fc501',
      '018f18b2-4c4f-7c7a-9e12-4c0b8a8fc502',
      '018f18b2-4c4f-7c7a-9e12-4c0b8a8fc503',
    ])

    const owner = createUserRecord('018f18b2-4c4f-7c7a-9e12-4c0b8a8fc021')
    const finance = createUserRecord('018f18b2-4c4f-7c7a-9e12-4c0b8a8fc022')
    await users.create({ id: owner.id })
    await users.create({ id: finance.id })

    const service = createTrustService({
      clock,
      organizationMemberships,
      organizations,
      userRoles,
      users,
      verificationCases,
      uuidGenerator,
    })

    const organization = await service.createOrganization({
      actorUserId: owner.id,
      name: 'Print Farm Co.',
    })
    const invitation = await service.inviteOrganizationMember({
      actorUserId: owner.id,
      memberRoleCode: 'FINANCE_ADMIN',
      organizationId: organization.id,
      userId: finance.id,
    })
    const accepted = await service.acceptOrganizationInvitation({
      actorUserId: finance.id,
      expectedVersion: invitation.version,
      membershipId: invitation.id,
    })
    await service.updateOrganizationMembership({
      actorUserId: owner.id,
      expectedVersion: accepted.version,
      membershipId: accepted.id,
      reason: 'Finance access revoked',
      status: 'REVOKED',
    })

    const controller = createTrustController({
      authentication: createAuthenticationMiddleware({
        logger: createStructuredLogger({
          sink() {
            return undefined
          },
        }),
        resolver: createResolver(finance),
      }),
      trustService: service,
    })

    const result = await controller.getOrganization({
      headers: {
        authorization: 'Bearer valid-token',
      },
      params: {
        organizationId: organization.id,
      },
    })

    expect(result).toMatchObject({
      body: {
        error: {
          code: 'AUTHORIZATION_DENIED',
        },
      },
      status: 403,
    })
  })
})
