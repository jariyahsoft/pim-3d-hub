import { describe, expect, it } from 'vitest'
import { createStructuredLogger } from '@pim/application'
import { parseUtcTimestamp, parseUuidv7, type UserRecord } from '@pim/domain'
import {
  createInMemoryPrinterCapabilityRepository,
  createInMemoryPrinterRepository,
  createInMemoryProviderMaterialRepository,
  createInMemoryProviderProfileRepository,
} from '../../../packages/testkit/src/index.js'
import {
  createInMemoryUserRepository,
  createInMemoryUserRoleRepository,
} from '../../../packages/infrastructure/src/index.js'
import { createFakeClock, createFakeUuidGenerator } from '../../../packages/testkit/src/index.js'
import { createAuthenticationMiddleware } from './authentication.js'
import { createPrinterController } from './printer.js'
import { createPrinterServiceManager } from '@pim/application'

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

function createResolver(user: UserRecord) {
  return Object.freeze({
    async execute() {
      return {
        externalIdentity: {
          email: 'somchai@example.com',
          emailVerified: true,
          provider: 'firebase' as const,
          providerSubject: `firebase-${user.id}`,
          safeClaims: Object.freeze({ role: 'provider' }),
        },
        identity: Object.freeze({
          createdAt: user.createdAt,
          createdBy: null,
          deletedAt: null,
          emailNormalized: 'somchai@example.com',
          emailVerified: true,
          id: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fd999'),
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

describe('printer API controller', () => {
  it('returns a printer workspace envelope without private ownership fields', async () => {
    const clock = createFakeClock('2026-06-27T13:00:00.000Z')
    const user = createUserRecord('018f18b2-4c4f-7c7a-9e12-4c0b8a8fd001')
    const users = createInMemoryUserRepository({ clock })
    const roles = createInMemoryUserRoleRepository({ clock })
    const profiles = createInMemoryProviderProfileRepository({ clock })
    const printers = createInMemoryPrinterRepository({ clock })
    const capabilities = createInMemoryPrinterCapabilityRepository({ clock })
    const materials = createInMemoryProviderMaterialRepository({ clock })

    await users.create({ id: user.id })
    await roles.create({
      activatedAt: clock.now(),
      createdBy: user.id,
      id: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fd101'),
      roleCode: 'FULL_SERVICE_PROVIDER',
      scopeType: 'GLOBAL',
      status: 'ACTIVE',
      updatedBy: user.id,
      userId: user.id,
    })

    const printerService = createPrinterServiceManager({
      capabilities: capabilities.repository,
      printers: printers.repository,
      providerMaterials: materials.repository,
      providerProfiles: profiles.repository,
      userRoles: roles,
      users,
      uuidGenerator: createFakeUuidGenerator([
        '018f18b2-4c4f-7c7a-9e12-4c0b8a8fd201',
        '018f18b2-4c4f-7c7a-9e12-4c0b8a8fd202',
        '018f18b2-4c4f-7c7a-9e12-4c0b8a8fd203',
      ]),
    })

    const profile = await profiles.repository.create({
      ownerUserId: user.id,
      publicName: 'Printer Hub',
      status: 'ACTIVE',
    })

    const printer = await printerService.createPrinter({
      actorUserId: user.id,
      buildVolumeMm: { depthMm: 220, heightMm: 250, widthMm: 220 },
      modelCode: 'Bambu X1C',
      providerProfileId: profile.id,
      quantity: 2,
      status: 'ACTIVE',
      technologyCode: 'FDM',
    })

    await printerService.createPrinterCapability({
      actorUserId: user.id,
      materialCode: 'PLA',
      printerId: printer.id,
      qualityCode: 'STANDARD',
      status: 'ACTIVE',
    })

    await printerService.createProviderMaterial({
      actorUserId: user.id,
      colorCode: 'BLACK',
      materialCode: 'PLA',
      providerProfileId: profile.id,
      quantityGrams: 5000,
      stockStatus: 'IN_STOCK',
    })

    const controller = createPrinterController({
      authentication: createAuthenticationMiddleware({
        logger: createStructuredLogger({
          sink() {
            return undefined
          },
        }),
        resolver: createResolver(user),
      }),
      printerService,
    })

    const result = await controller.getPrinterWorkspace({
      headers: {
        authorization: 'Bearer valid-token',
      },
      params: {
        providerProfileId: profile.id,
      },
    })

    expect(result.status).toBe(200)
    expect(result.body).toMatchObject({
      data: {
        profile: {
          id: profile.id,
          publicName: 'Printer Hub',
          status: 'ACTIVE',
        },
        printers: [
          {
            modelCode: 'Bambu X1C',
            status: 'ACTIVE',
            technologyCode: 'FDM',
          },
        ],
      },
    })
    expect(JSON.stringify(result.body)).not.toContain('ownerUserId')
  })

  it('rejects invalid printer dimensions and incompatible capability combinations', async () => {
    const clock = createFakeClock('2026-06-27T13:00:00.000Z')
    const user = createUserRecord('018f18b2-4c4f-7c7a-9e12-4c0b8a8fd011')
    const users = createInMemoryUserRepository({ clock })
    const roles = createInMemoryUserRoleRepository({ clock })
    const profiles = createInMemoryProviderProfileRepository({ clock })
    const printers = createInMemoryPrinterRepository({ clock })
    const capabilities = createInMemoryPrinterCapabilityRepository({ clock })
    const materials = createInMemoryProviderMaterialRepository({ clock })

    await users.create({ id: user.id })
    await roles.create({
      activatedAt: clock.now(),
      createdBy: user.id,
      id: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fd111'),
      roleCode: 'PRINT_PROVIDER',
      scopeType: 'GLOBAL',
      status: 'ACTIVE',
      updatedBy: user.id,
      userId: user.id,
    })

    const printerService = createPrinterServiceManager({
      capabilities: capabilities.repository,
      printers: printers.repository,
      providerMaterials: materials.repository,
      providerProfiles: profiles.repository,
      userRoles: roles,
      users,
      uuidGenerator: createFakeUuidGenerator(['018f18b2-4c4f-7c7a-9e12-4c0b8a8fd211']),
    })

    const profile = await profiles.repository.create({
      ownerUserId: user.id,
      publicName: 'Draft Printer Hub',
      status: 'ACTIVE',
    })

    const controller = createPrinterController({
      authentication: createAuthenticationMiddleware({
        logger: createStructuredLogger({
          sink() {
            return undefined
          },
        }),
        resolver: createResolver(user),
      }),
      printerService,
    })

    const invalidPrinter = await controller.createPrinter({
      body: {
        buildVolumeMm: { depthMm: 220, heightMm: 0, widthMm: 220 },
        modelCode: 'Bad Printer',
        providerProfileId: profile.id,
        quantity: 1,
        technologyCode: 'FDM',
      },
      headers: {
        authorization: 'Bearer valid-token',
      },
    })

    expect(invalidPrinter.status).toBe(400)

    const printer = await printerService.createPrinter({
      actorUserId: user.id,
      buildVolumeMm: { depthMm: 220, heightMm: 220, widthMm: 220 },
      modelCode: 'Draft Printer',
      providerProfileId: profile.id,
      quantity: 1,
      technologyCode: 'FDM',
    })

    const incompatibleCapability = await controller.createPrinterCapability({
      body: {
        materialCode: 'RESIN',
        qualityCode: 'STANDARD',
      },
      headers: {
        authorization: 'Bearer valid-token',
      },
      params: {
        printerId: printer.id,
      },
    })

    expect(incompatibleCapability.status).toBe(400)
  })

  it('maps stale printer updates to a 409 response', async () => {
    const clock = createFakeClock('2026-06-27T13:00:00.000Z')
    const user = createUserRecord('018f18b2-4c4f-7c7a-9e12-4c0b8a8fd021')
    const users = createInMemoryUserRepository({ clock })
    const roles = createInMemoryUserRoleRepository({ clock })
    const profiles = createInMemoryProviderProfileRepository({ clock })
    const printers = createInMemoryPrinterRepository({ clock })
    const capabilities = createInMemoryPrinterCapabilityRepository({ clock })
    const materials = createInMemoryProviderMaterialRepository({ clock })

    await users.create({ id: user.id })
    await roles.create({
      activatedAt: clock.now(),
      createdBy: user.id,
      id: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fd121'),
      roleCode: 'FULL_SERVICE_PROVIDER',
      scopeType: 'GLOBAL',
      status: 'ACTIVE',
      updatedBy: user.id,
      userId: user.id,
    })

    const printerService = createPrinterServiceManager({
      capabilities: capabilities.repository,
      printers: printers.repository,
      providerMaterials: materials.repository,
      providerProfiles: profiles.repository,
      userRoles: roles,
      users,
      uuidGenerator: createFakeUuidGenerator(['018f18b2-4c4f-7c7a-9e12-4c0b8a8fd221']),
    })

    const profile = await profiles.repository.create({
      ownerUserId: user.id,
      publicName: 'Printer Hub',
      status: 'ACTIVE',
    })

    const printer = await printerService.createPrinter({
      actorUserId: user.id,
      buildVolumeMm: { depthMm: 220, heightMm: 220, widthMm: 220 },
      modelCode: 'Draft Printer',
      providerProfileId: profile.id,
      quantity: 1,
      technologyCode: 'FDM',
    })

    const controller = createPrinterController({
      authentication: createAuthenticationMiddleware({
        logger: createStructuredLogger({
          sink() {
            return undefined
          },
        }),
        resolver: createResolver(user),
      }),
      printerService,
    })

    const result = await controller.updatePrinter({
      body: {
        buildVolumeMm: { depthMm: 220, heightMm: 220, widthMm: 220 },
        expectedVersion: printer.version - 1,
        modelCode: 'Updated Printer',
        quantity: 1,
        technologyCode: 'FDM',
      },
      headers: {
        authorization: 'Bearer valid-token',
      },
      params: {
        printerId: printer.id,
      },
    })

    expect(result.status).toBe(409)
  })
})
