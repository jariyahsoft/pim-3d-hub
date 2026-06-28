import { describe, expect, it } from 'vitest'
import { AuthorizationDeniedError } from './identity.js'
import { createPrinterServiceManager } from './printer.js'
import { parseUuidv7 } from '@pim/domain'
import {
  createInMemoryPrinterCapabilityRepository,
  createInMemoryPrinterRepository,
  createInMemoryProviderMaterialRepository,
  createInMemoryProviderProfileRepository,
} from '../../testkit/src/index.js'
import {
  createInMemoryUserRepository,
  createInMemoryUserRoleRepository,
} from '../../infrastructure/src/index.js'
import { createFakeClock, createFakeUuidGenerator } from '../../testkit/src/index.js'

function createUserId(index: string): ReturnType<typeof parseUuidv7> {
  return parseUuidv7(`018f18b2-4c4f-7c7a-9e12-${index.padStart(12, '0')}`)
}

describe('printer service manager', () => {
  it('registers printers, capabilities, and materials without leaking private fields', async () => {
    const clock = createFakeClock('2026-06-27T13:00:00.000Z')
    const users = createInMemoryUserRepository({ clock })
    const roles = createInMemoryUserRoleRepository({ clock })
    const profiles = createInMemoryProviderProfileRepository({ clock })
    const printers = createInMemoryPrinterRepository({ clock })
    const capabilities = createInMemoryPrinterCapabilityRepository({ clock })
    const materials = createInMemoryProviderMaterialRepository({ clock })
    const userId = createUserId('301')

    await users.create({ id: userId })
    await roles.create({
      activatedAt: clock.now(),
      createdBy: userId,
      id: createUserId('302'),
      roleCode: 'FULL_SERVICE_PROVIDER',
      scopeType: 'GLOBAL',
      status: 'ACTIVE',
      updatedBy: userId,
      userId,
    })

    const manager = createPrinterServiceManager({
      capabilities: capabilities.repository,
      printers: printers.repository,
      providerMaterials: materials.repository,
      providerProfiles: profiles.repository,
      userRoles: roles,
      users,
      uuidGenerator: createFakeUuidGenerator([
        createUserId('303'),
        createUserId('304'),
        createUserId('305'),
      ]),
    })

    const profile = await profiles.repository.create({
      ownerUserId: userId,
      publicName: 'Printer Hub',
      status: 'ACTIVE',
    })

    const printer = await manager.createPrinter({
      actorUserId: userId,
      buildVolumeMm: { depthMm: 220, heightMm: 250, widthMm: 220 },
      modelCode: 'Bambu X1C',
      providerProfileId: profile.id,
      quantity: 2,
      status: 'ACTIVE',
      technologyCode: 'FDM',
    })

    const capability = await manager.createPrinterCapability({
      actorUserId: userId,
      materialCode: 'PLA',
      printerId: printer.id,
      qualityCode: 'STANDARD',
      status: 'ACTIVE',
    })

    const material = await manager.createProviderMaterial({
      actorUserId: userId,
      colorCode: 'BLACK',
      materialCode: 'PLA',
      providerProfileId: profile.id,
      quantityGrams: 5000,
      stockStatus: 'IN_STOCK',
    })

    const workspace = await manager.getPrinterWorkspace({
      actorUserId: userId,
      providerProfileId: profile.id,
    })

    expect(printer).toMatchObject({
      modelCode: 'Bambu X1C',
      status: 'ACTIVE',
      technologyCode: 'FDM',
    })
    expect(capability).toMatchObject({
      materialCode: 'PLA',
      qualityCode: 'STANDARD',
      status: 'ACTIVE',
    })
    expect(material).toMatchObject({
      colorCode: 'BLACK',
      materialCode: 'PLA',
      stockStatus: 'IN_STOCK',
    })
    expect(workspace.printers).toHaveLength(1)
    expect(workspace.capabilities).toHaveLength(1)
    expect(workspace.materials).toHaveLength(1)
    expect(JSON.stringify(workspace)).not.toContain('ownerUserId')
  })

  it('rejects invalid dimensions and incompatible material combinations', async () => {
    const clock = createFakeClock('2026-06-27T13:00:00.000Z')
    const users = createInMemoryUserRepository({ clock })
    const roles = createInMemoryUserRoleRepository({ clock })
    const profiles = createInMemoryProviderProfileRepository({ clock })
    const printers = createInMemoryPrinterRepository({ clock })
    const capabilities = createInMemoryPrinterCapabilityRepository({ clock })
    const materials = createInMemoryProviderMaterialRepository({ clock })
    const userId = createUserId('311')

    await users.create({ id: userId })
    await roles.create({
      activatedAt: clock.now(),
      createdBy: userId,
      id: createUserId('312'),
      roleCode: 'PRINT_PROVIDER',
      scopeType: 'GLOBAL',
      status: 'ACTIVE',
      updatedBy: userId,
      userId,
    })

    const manager = createPrinterServiceManager({
      capabilities: capabilities.repository,
      printers: printers.repository,
      providerMaterials: materials.repository,
      providerProfiles: profiles.repository,
      userRoles: roles,
      users,
      uuidGenerator: createFakeUuidGenerator([createUserId('313')]),
    })

    const profile = await profiles.repository.create({
      ownerUserId: userId,
      publicName: 'Draft Printer Hub',
      status: 'ACTIVE',
    })

    await expect(
      manager.createPrinter({
        actorUserId: userId,
        buildVolumeMm: { depthMm: 220, heightMm: 0, widthMm: 220 },
        modelCode: 'Bad Printer',
        providerProfileId: profile.id,
        quantity: 1,
        technologyCode: 'FDM',
      }),
    ).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      fields: ['buildVolumeMm.heightMm'],
    })

    const printer = await manager.createPrinter({
      actorUserId: userId,
      buildVolumeMm: { depthMm: 220, heightMm: 220, widthMm: 220 },
      modelCode: 'Draft Printer',
      providerProfileId: profile.id,
      quantity: 1,
      technologyCode: 'FDM',
    })

    await expect(
      manager.createPrinterCapability({
        actorUserId: userId,
        materialCode: 'RESIN',
        printerId: printer.id,
        qualityCode: 'STANDARD',
      }),
    ).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      fields: ['materialCode'],
    })
  })

  it('excludes disabled printers from active capability queries and blocks non-owners', async () => {
    const clock = createFakeClock('2026-06-27T13:00:00.000Z')
    const users = createInMemoryUserRepository({ clock })
    const roles = createInMemoryUserRoleRepository({ clock })
    const profiles = createInMemoryProviderProfileRepository({ clock })
    const printers = createInMemoryPrinterRepository({ clock })
    const capabilities = createInMemoryPrinterCapabilityRepository({ clock })
    const materials = createInMemoryProviderMaterialRepository({ clock })
    const ownerId = createUserId('321')
    const otherId = createUserId('322')

    await users.create({ id: ownerId })
    await users.create({ id: otherId })
    await roles.create({
      activatedAt: clock.now(),
      createdBy: ownerId,
      id: createUserId('323'),
      roleCode: 'FULL_SERVICE_PROVIDER',
      scopeType: 'GLOBAL',
      status: 'ACTIVE',
      updatedBy: ownerId,
      userId: ownerId,
    })

    const manager = createPrinterServiceManager({
      capabilities: capabilities.repository,
      printers: printers.repository,
      providerMaterials: materials.repository,
      providerProfiles: profiles.repository,
      userRoles: roles,
      users,
      uuidGenerator: createFakeUuidGenerator([
        createUserId('324'),
        createUserId('325'),
      ]),
    })

    const profile = await profiles.repository.create({
      ownerUserId: ownerId,
      publicName: 'Pause Print Hub',
      status: 'ACTIVE',
    })

    const printer = await manager.createPrinter({
      actorUserId: ownerId,
      buildVolumeMm: { depthMm: 240, heightMm: 240, widthMm: 240 },
      modelCode: 'Active Printer',
      providerProfileId: profile.id,
      quantity: 1,
      status: 'ACTIVE',
      technologyCode: 'FDM',
    })

    await manager.createPrinterCapability({
      actorUserId: ownerId,
      materialCode: 'PLA',
      printerId: printer.id,
      qualityCode: 'STANDARD',
      status: 'ACTIVE',
    })

    const disabledPrinter = await manager.updatePrinter({
      actorUserId: ownerId,
      buildVolumeMm: { depthMm: 240, heightMm: 240, widthMm: 240 },
      expectedVersion: printer.version,
      modelCode: 'Active Printer',
      printerId: printer.id,
      quantity: 1,
      status: 'DISABLED',
      technologyCode: 'FDM',
    })

    expect(disabledPrinter.status).toBe('DISABLED')

    const workspace = await manager.getPrinterWorkspace({
      actorUserId: ownerId,
      providerProfileId: profile.id,
    })
    expect(workspace.capabilities).toHaveLength(0)

    await expect(
      manager.createProviderMaterial({
        actorUserId: otherId,
        colorCode: 'WHITE',
        materialCode: 'PLA',
        providerProfileId: profile.id,
        quantityGrams: 1000,
      }),
    ).rejects.toBeInstanceOf(AuthorizationDeniedError)
  })
})
