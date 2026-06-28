import { describe, expect, it } from 'vitest'
import {
  isTechnologyMaterialCompatible,
  printerCatalogVersion,
  printerColorCodes,
  printerMaterialCodes,
  printerQualityCodes,
  printerTechnologyCodes,
} from './printer.js'

describe('printer catalog', () => {
  it('keeps the versioned code seed stable', () => {
    expect(printerCatalogVersion).toBe(1)
    expect(printerTechnologyCodes).toEqual(['FDM', 'SLA', 'SLS'])
    expect(printerMaterialCodes).toEqual(['ABS', 'PA12', 'PETG', 'PLA', 'RESIN', 'TPU'])
    expect(printerColorCodes).toEqual(['BLACK', 'BLUE', 'CLEAR', 'NATURAL', 'RED', 'WHITE'])
    expect(printerQualityCodes).toEqual(['DRAFT', 'STANDARD', 'FINE'])
  })

  it('rejects unsupported technology/material combinations', () => {
    expect(isTechnologyMaterialCompatible('FDM', 'PLA')).toBe(true)
    expect(isTechnologyMaterialCompatible('SLA', 'PLA')).toBe(false)
    expect(isTechnologyMaterialCompatible('SLS', 'PA12')).toBe(true)
  })
})
