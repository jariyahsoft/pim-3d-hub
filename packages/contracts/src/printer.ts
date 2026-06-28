import { z } from 'zod'
import { publicProviderProfileSchema } from './provider.js'

function createApiMetaSchema() {
  return z.object({
    nextCursor: z.string().trim().min(1).nullable().optional(),
    requestId: z.string().trim().min(1),
  })
}

function createApiSuccessEnvelopeSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    data: dataSchema,
    meta: createApiMetaSchema(),
  })
}

export const printerTechnologyCodeSchema = z.enum(['FDM', 'SLA', 'SLS'])
export const printerMaterialCodeSchema = z.enum(['ABS', 'PA12', 'PETG', 'PLA', 'RESIN', 'TPU'])
export const printerColorCodeSchema = z.enum(['BLACK', 'BLUE', 'CLEAR', 'NATURAL', 'RED', 'WHITE'])
export const printerQualityCodeSchema = z.enum(['DRAFT', 'STANDARD', 'FINE'])
export const printerStatusSchema = z.enum(['DRAFT', 'ACTIVE', 'DISABLED'])
export const printerCapabilityStatusSchema = z.enum(['DRAFT', 'ACTIVE', 'DISABLED'])
export const providerMaterialStockStatusSchema = z.enum(['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK', 'DISABLED'])

export const buildVolumeMmSchema = z.object({
  depthMm: z.number().positive(),
  heightMm: z.number().positive(),
  widthMm: z.number().positive(),
})

export const printerSchema = z.object({
  buildVolumeMm: buildVolumeMmSchema,
  id: z.string().trim().min(1),
  modelCode: z.string().trim().min(1),
  providerProfileId: z.string().trim().min(1),
  quantity: z.number().int().positive(),
  status: printerStatusSchema,
  technologyCode: printerTechnologyCodeSchema,
  version: z.number().int().nonnegative(),
})

export const printerCapabilitySchema = z.object({
  id: z.string().trim().min(1),
  materialCode: printerMaterialCodeSchema,
  printerId: z.string().trim().min(1),
  qualityCode: printerQualityCodeSchema,
  status: printerCapabilityStatusSchema,
  version: z.number().int().nonnegative(),
})

export const providerMaterialSchema = z.object({
  colorCode: printerColorCodeSchema,
  id: z.string().trim().min(1),
  materialCode: printerMaterialCodeSchema,
  providerProfileId: z.string().trim().min(1),
  quantityGrams: z.number().int().positive(),
  stockStatus: providerMaterialStockStatusSchema,
  version: z.number().int().nonnegative(),
})

export const printerWorkspaceSchema = z.object({
  capabilities: z.array(printerCapabilitySchema),
  materials: z.array(providerMaterialSchema),
  printers: z.array(printerSchema),
  profile: publicProviderProfileSchema,
})

export const createPrinterRequestSchema = z.object({
  buildVolumeMm: buildVolumeMmSchema,
  modelCode: z.string().trim().min(1),
  providerProfileId: z.string().trim().min(1),
  quantity: z.number().int().positive(),
  status: printerStatusSchema.optional(),
  technologyCode: printerTechnologyCodeSchema,
})

export const updatePrinterRequestSchema = z.object({
  buildVolumeMm: buildVolumeMmSchema,
  expectedVersion: z.number().int().nonnegative(),
  modelCode: z.string().trim().min(1),
  quantity: z.number().int().positive(),
  status: printerStatusSchema.optional(),
  technologyCode: printerTechnologyCodeSchema,
})

export const createPrinterCapabilityRequestSchema = z.object({
  materialCode: printerMaterialCodeSchema,
  qualityCode: printerQualityCodeSchema,
  status: printerCapabilityStatusSchema.optional(),
})

export const createProviderMaterialRequestSchema = z.object({
  colorCode: printerColorCodeSchema,
  materialCode: printerMaterialCodeSchema,
  providerProfileId: z.string().trim().min(1),
  quantityGrams: z.number().int().positive(),
  stockStatus: providerMaterialStockStatusSchema.optional(),
})

export const printerResponseSchema = createApiSuccessEnvelopeSchema(printerSchema)
export const printerCapabilityResponseSchema = createApiSuccessEnvelopeSchema(printerCapabilitySchema)
export const providerMaterialResponseSchema = createApiSuccessEnvelopeSchema(providerMaterialSchema)
export const printerWorkspaceResponseSchema = createApiSuccessEnvelopeSchema(printerWorkspaceSchema)
