import { parseUuidv7 } from '@pim/domain'
import type { PrinterWorkspaceDto } from '@pim/application'

function createPrinterId(index: string): ReturnType<typeof parseUuidv7> {
  return parseUuidv7(`018f18b2-4c4f-7c7a-9e12-${index.padStart(12, '0')}`)
}

export function createEmptyPrinterWorkspace(): PrinterWorkspaceDto {
  return Object.freeze({
    capabilities: [],
    materials: [],
    printers: [],
    profile: Object.freeze({
      id: createPrinterId('401'),
      publicName: 'Printer Hub',
      serviceRegion: 'กรุงเทพมหานคร',
      status: 'DRAFT',
      version: 1,
    }),
  })
}

export const demoPrinterWorkspace: PrinterWorkspaceDto = Object.freeze({
  capabilities: [
    Object.freeze({
      id: createPrinterId('402'),
      materialCode: 'PLA',
      printerId: createPrinterId('403'),
      qualityCode: 'STANDARD',
      status: 'ACTIVE',
      version: 1,
    }),
  ],
  materials: [
    Object.freeze({
      colorCode: 'BLACK',
      id: createPrinterId('404'),
      materialCode: 'PLA',
      providerProfileId: createPrinterId('401'),
      quantityGrams: 5000,
      stockStatus: 'IN_STOCK',
      version: 1,
    }),
    Object.freeze({
      colorCode: 'WHITE',
      id: createPrinterId('405'),
      materialCode: 'PETG',
      providerProfileId: createPrinterId('401'),
      quantityGrams: 1200,
      stockStatus: 'LOW_STOCK',
      version: 1,
    }),
  ],
  printers: [
    Object.freeze({
      buildVolumeMm: Object.freeze({ depthMm: 220, heightMm: 250, widthMm: 220 }),
      id: createPrinterId('403'),
      modelCode: 'Bambu X1C',
      providerProfileId: createPrinterId('401'),
      quantity: 2,
      status: 'ACTIVE',
      technologyCode: 'FDM',
      version: 1,
    }),
    Object.freeze({
      buildVolumeMm: Object.freeze({ depthMm: 145, heightMm: 175, widthMm: 145 }),
      id: createPrinterId('406'),
      modelCode: 'Resin Pro',
      providerProfileId: createPrinterId('401'),
      quantity: 1,
      status: 'DISABLED',
      technologyCode: 'SLA',
      version: 1,
    }),
  ],
  profile: Object.freeze({
    id: createPrinterId('401'),
    publicName: 'Printer Hub',
    serviceRegion: 'กรุงเทพมหานคร',
    status: 'ACTIVE',
    version: 3,
  }),
})
