'use client'

import { useState, type FormEvent, type ReactElement } from 'react'
import { parseUuidv7 } from '@pim/domain'
import type { PrinterWorkspaceDto, PrinterDto, PrinterCapabilityDto, ProviderMaterialDto } from '@pim/application'
import { createEmptyPrinterWorkspace, demoPrinterWorkspace } from './printer-demo.js'

type PrinterDraft = Readonly<{
  buildVolumeDepthMm: string
  buildVolumeHeightMm: string
  buildVolumeWidthMm: string
  modelCode: string
  quantity: string
  status: PrinterDto['status']
  technologyCode: PrinterDto['technologyCode']
}>

type CapabilityDraft = Readonly<{
  materialCode: PrinterCapabilityDto['materialCode']
  printerId: string
  qualityCode: PrinterCapabilityDto['qualityCode']
  status: PrinterCapabilityDto['status']
}>

type MaterialDraft = Readonly<{
  colorCode: ProviderMaterialDto['colorCode']
  materialCode: ProviderMaterialDto['materialCode']
  quantityGrams: string
  stockStatus: ProviderMaterialDto['stockStatus']
}>

type PrinterScreenProps = Readonly<{
  initialLoading?: boolean
  initialWorkspace?: PrinterWorkspaceDto
}>

function createDemoPrinterId(index: number): ReturnType<typeof parseUuidv7> {
  return parseUuidv7(`018f18b2-4c4f-7c7a-9e12-${index.toString().padStart(12, '0')}`)
}

function createPrinterDraft(printer?: PrinterDto): PrinterDraft {
  return {
    buildVolumeDepthMm: printer ? String(printer.buildVolumeMm.depthMm) : '220',
    buildVolumeHeightMm: printer ? String(printer.buildVolumeMm.heightMm) : '250',
    buildVolumeWidthMm: printer ? String(printer.buildVolumeMm.widthMm) : '220',
    modelCode: printer?.modelCode ?? 'Bambu X1C',
    quantity: printer ? String(printer.quantity) : '1',
    status: printer?.status ?? 'DRAFT',
    technologyCode: printer?.technologyCode ?? 'FDM',
  }
}

function createCapabilityDraft(capability?: PrinterCapabilityDto, printerId?: string): CapabilityDraft {
  return {
    materialCode: capability?.materialCode ?? 'PLA',
    printerId: printerId ?? capability?.printerId ?? '',
    qualityCode: capability?.qualityCode ?? 'STANDARD',
    status: capability?.status ?? 'DRAFT',
  }
}

function createMaterialDraft(material?: ProviderMaterialDto): MaterialDraft {
  return {
    colorCode: material?.colorCode ?? 'BLACK',
    materialCode: material?.materialCode ?? 'PLA',
    quantityGrams: material ? String(material.quantityGrams) : '1000',
    stockStatus: material?.stockStatus ?? 'IN_STOCK',
  }
}

function summarizePrinters(printers: readonly PrinterDto[]): string {
  if (printers.length === 0) {
    return 'ยังไม่มีเครื่องพิมพ์ที่ลงทะเบียน'
  }

  const activeCount = printers.filter((printer) => printer.status === 'ACTIVE').length
  const disabledCount = printers.filter((printer) => printer.status === 'DISABLED').length
  return `ใช้งานอยู่ ${activeCount} เครื่อง, ปิดใช้งาน ${disabledCount} เครื่อง`
}

function summarizeMaterials(materials: readonly ProviderMaterialDto[]): string {
  if (materials.length === 0) {
    return 'ยังไม่มีวัสดุในสต็อก'
  }

  const availableCount = materials.filter((material) => material.stockStatus === 'IN_STOCK').length
  const lowCount = materials.filter((material) => material.stockStatus === 'LOW_STOCK').length
  return `พร้อมใช้ ${availableCount} รายการ, ใกล้หมด ${lowCount} รายการ`
}

export function PrinterScreen(props: PrinterScreenProps): ReactElement {
  const [workspace, setWorkspace] = useState<PrinterWorkspaceDto>(
    props.initialWorkspace ?? demoPrinterWorkspace,
  )
  const [loading, setLoading] = useState(props.initialLoading ?? false)
  const [statusMessage, setStatusMessage] = useState(
    'จัดการเครื่องพิมพ์ capability และวัสดุแบบ mobile-first',
  )
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [printerDraft, setPrinterDraft] = useState<PrinterDraft>(
    createPrinterDraft(workspace.printers[0]),
  )
  const [capabilityDraft, setCapabilityDraft] = useState<CapabilityDraft>(
    createCapabilityDraft(workspace.capabilities[0], workspace.printers[0]?.id),
  )
  const [materialDraft, setMaterialDraft] = useState<MaterialDraft>(
    createMaterialDraft(workspace.materials[0]),
  )

  function _resetDrafts(): void {
    setPrinterDraft(createPrinterDraft())
    setCapabilityDraft(createCapabilityDraft(undefined, workspace.printers[0]?.id))
    setMaterialDraft(createMaterialDraft())
  }

  function savePrinter(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    setErrorMessage(null)

    const widthMm = Number(printerDraft.buildVolumeWidthMm)
    const heightMm = Number(printerDraft.buildVolumeHeightMm)
    const depthMm = Number(printerDraft.buildVolumeDepthMm)
    const quantity = Number(printerDraft.quantity)
    const modelCode = printerDraft.modelCode.trim()

    if (!modelCode) {
      setErrorMessage('กรุณากรอกรุ่นเครื่องพิมพ์')
      return
    }

    if ([widthMm, heightMm, depthMm].some((value) => !Number.isFinite(value) || value <= 0)) {
      setErrorMessage('build volume ต้องมากกว่า 0 มม.')
      return
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      setErrorMessage('จำนวนเครื่องต้องมากกว่า 0')
      return
    }

    const printer: PrinterDto = Object.freeze({
      buildVolumeMm: Object.freeze({ depthMm, heightMm, widthMm }),
      id: createDemoPrinterId(workspace.printers.length + 500),
      modelCode,
      providerProfileId: workspace.profile.id,
      quantity,
      status: printerDraft.status,
      technologyCode: printerDraft.technologyCode,
      version: 1,
    })

    setWorkspace((current) => ({
      ...current,
      printers: [printer, ...current.printers],
    }))
    setStatusMessage('บันทึกเครื่องพิมพ์แล้ว')
    setPrinterDraft(createPrinterDraft())
  }

  function saveCapability(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    setErrorMessage(null)

    if (!capabilityDraft.printerId) {
      setErrorMessage('กรุณาเลือกเครื่องพิมพ์')
      return
    }

    const capability: PrinterCapabilityDto = Object.freeze({
      id: createDemoPrinterId(workspace.capabilities.length + 600),
      materialCode: capabilityDraft.materialCode,
      printerId: parseUuidv7(capabilityDraft.printerId),
      qualityCode: capabilityDraft.qualityCode,
      status: capabilityDraft.status,
      version: 1,
    })

    setWorkspace((current) => ({
      ...current,
      capabilities: [capability, ...current.capabilities],
    }))
    setStatusMessage('บันทึก capability แล้ว')
  }

  function saveMaterial(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    setErrorMessage(null)

    const quantityGrams = Number(materialDraft.quantityGrams)

    if (!Number.isInteger(quantityGrams) || quantityGrams <= 0) {
      setErrorMessage('quantity ต้องมากกว่า 0 กรัม')
      return
    }

    const material: ProviderMaterialDto = Object.freeze({
      colorCode: materialDraft.colorCode,
      id: createDemoPrinterId(workspace.materials.length + 700),
      materialCode: materialDraft.materialCode,
      providerProfileId: workspace.profile.id,
      quantityGrams,
      stockStatus: materialDraft.stockStatus,
      version: 1,
    })

    setWorkspace((current) => ({
      ...current,
      materials: [material, ...current.materials],
    }))
    setStatusMessage('บันทึกวัสดุแล้ว')
  }

  function togglePrinterStatus(printerId: string): void {
    setWorkspace((current) => ({
      ...current,
      printers: current.printers.map((printer) =>
        printer.id === printerId
          ? {
              ...printer,
              status: printer.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE',
              version: printer.version + 1,
            }
          : printer,
      ),
    }))
    setStatusMessage('อัปเดตสถานะเครื่องพิมพ์แล้ว')
  }

  const emptyState = workspace.printers.length === 0

  return (
    <main className="screen">
      <section className="hero compact">
        <div className="eyebrow">Phase 1A Provider Supply</div>
        <h1>เครื่องพิมพ์ capability และวัสดุ</h1>
        <p className="lede">
          จัดการ build volume, quantity, technology, material, color และ stock status แบบ mobile-first
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
              <dt>สรุปเครื่องพิมพ์</dt>
              <dd>{summarizePrinters(workspace.printers)}</dd>
            </div>
            <div>
              <dt>สรุปวัสดุ</dt>
              <dd>{summarizeMaterials(workspace.materials)}</dd>
            </div>
          </dl>
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
            <button className="button secondary" type="button" onClick={() => setWorkspace(createEmptyPrinterWorkspace())}>
              แสดง empty state
            </button>
            <button className="button secondary" type="button" onClick={() => setWorkspace(props.initialWorkspace ?? demoPrinterWorkspace)}>
              คืนค่าตัวอย่าง
            </button>
          </div>
          {loading ? (
            <p className="status">กำลังดึงข้อมูลเครื่องพิมพ์และวัสดุ กรุณารอสักครู่</p>
          ) : null}
        </article>

        {emptyState ? (
          <article className="card">
            <h2>ยังไม่มีเครื่องพิมพ์</h2>
            <p className="status">เริ่มจากลงทะเบียน printer อย่างน้อย 1 รายการเพื่อเปิดใช้งาน capability</p>
          </article>
        ) : (
          <article className="card">
            <div className="cardHeader">
              <h2>เครื่องพิมพ์</h2>
              <span className="pill">{workspace.printers.length} รายการ</span>
            </div>
            <div className="cardStack">
              {workspace.printers.map((printer) => (
                <article className="addressCard" key={printer.id}>
                  <div className="addressCardTop">
                    <strong>{printer.modelCode}</strong>
                    <span className="pill">{printer.status}</span>
                  </div>
                  <p>{printer.technologyCode}</p>
                  <p>
                    build volume {printer.buildVolumeMm.widthMm} x {printer.buildVolumeMm.heightMm} x {printer.buildVolumeMm.depthMm} mm
                  </p>
                  <p>จำนวน {printer.quantity}</p>
                  <div className="actions">
                    <button className="button secondary" type="button" onClick={() => togglePrinterStatus(printer.id)}>
                      {printer.status === 'ACTIVE' ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </article>
        )}

        <article className="card">
          <div className="cardHeader">
            <h2>Capability</h2>
            <span className="pill">{workspace.capabilities.length} รายการ</span>
          </div>
          <div className="cardStack">
            {workspace.capabilities.length === 0 ? (
              <p className="status">ยังไม่มี capability ที่เผยแพร่</p>
            ) : (
              workspace.capabilities.map((capability) => (
                <article className="addressCard" key={capability.id}>
                  <div className="addressCardTop">
                    <strong>{capability.materialCode}</strong>
                    <span className="pill">{capability.status}</span>
                  </div>
                  <p>{capability.qualityCode}</p>
                </article>
              ))
            )}
          </div>
        </article>

        <article className="card">
          <div className="cardHeader">
            <h2>วัสดุ</h2>
            <span className="pill">{workspace.materials.length} รายการ</span>
          </div>
          <div className="cardStack">
            {workspace.materials.length === 0 ? (
              <p className="status">ยังไม่มี stock material</p>
            ) : (
              workspace.materials.map((material) => (
                <article className="addressCard" key={material.id}>
                  <div className="addressCardTop">
                    <strong>{material.materialCode}</strong>
                    <span className="pill">{material.stockStatus}</span>
                  </div>
                  <p>
                    {material.colorCode} · {material.quantityGrams} g
                  </p>
                </article>
              ))
            )}
          </div>
        </article>

        <article className="card">
          <div className="cardHeader">
            <h2>ลงทะเบียนเครื่องพิมพ์</h2>
            <span className="pill">{printerDraft.status}</span>
          </div>
          <form className="form" onSubmit={savePrinter}>
            <label htmlFor="printer-model-code">
              รุ่นเครื่องพิมพ์
              <input
                id="printer-model-code"
                onChange={(event) =>
                  setPrinterDraft((current) => ({ ...current, modelCode: event.target.value }))
                }
                value={printerDraft.modelCode}
              />
            </label>
            <label htmlFor="printer-technology-code">
              Technology
              <select
                id="printer-technology-code"
                onChange={(event) =>
                  setPrinterDraft((current) => ({
                    ...current,
                    technologyCode: event.target.value as PrinterDto['technologyCode'],
                  }))
                }
                value={printerDraft.technologyCode}
              >
                <option value="FDM">FDM</option>
                <option value="SLA">SLA</option>
                <option value="SLS">SLS</option>
              </select>
            </label>
            <label htmlFor="printer-width">
              Width (mm)
              <input
                id="printer-width"
                inputMode="numeric"
                onChange={(event) =>
                  setPrinterDraft((current) => ({ ...current, buildVolumeWidthMm: event.target.value }))
                }
                value={printerDraft.buildVolumeWidthMm}
              />
            </label>
            <label htmlFor="printer-height">
              Height (mm)
              <input
                id="printer-height"
                inputMode="numeric"
                onChange={(event) =>
                  setPrinterDraft((current) => ({ ...current, buildVolumeHeightMm: event.target.value }))
                }
                value={printerDraft.buildVolumeHeightMm}
              />
            </label>
            <label htmlFor="printer-depth">
              Depth (mm)
              <input
                id="printer-depth"
                inputMode="numeric"
                onChange={(event) =>
                  setPrinterDraft((current) => ({ ...current, buildVolumeDepthMm: event.target.value }))
                }
                value={printerDraft.buildVolumeDepthMm}
              />
            </label>
            <label htmlFor="printer-quantity">
              Quantity
              <input
                id="printer-quantity"
                inputMode="numeric"
                onChange={(event) =>
                  setPrinterDraft((current) => ({ ...current, quantity: event.target.value }))
                }
                value={printerDraft.quantity}
              />
            </label>
            <label htmlFor="printer-status">
              สถานะ
              <select
                id="printer-status"
                onChange={(event) =>
                  setPrinterDraft((current) => ({
                    ...current,
                    status: event.target.value as PrinterDto['status'],
                  }))
                }
                value={printerDraft.status}
              >
                <option value="DRAFT">DRAFT</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="DISABLED">DISABLED</option>
              </select>
            </label>
            <div className="actions">
              <button className="button secondary" type="button" onClick={() => setPrinterDraft(createPrinterDraft())}>
                ล้างฟอร์ม
              </button>
              <button className="button primary" type="submit">
                บันทึกเครื่องพิมพ์
              </button>
            </div>
          </form>
        </article>

        <article className="card">
          <div className="cardHeader">
            <h2>ลงทะเบียน capability</h2>
            <span className="pill">{capabilityDraft.status}</span>
          </div>
          <form className="form" onSubmit={saveCapability}>
            <label htmlFor="capability-printer">
              Printer
              <select
                id="capability-printer"
                onChange={(event) =>
                  setCapabilityDraft((current) => ({ ...current, printerId: event.target.value }))
                }
                value={capabilityDraft.printerId}
              >
                <option value="">เลือกเครื่องพิมพ์</option>
                {workspace.printers.map((printer) => (
                  <option key={printer.id} value={printer.id}>
                    {printer.modelCode}
                  </option>
                ))}
              </select>
            </label>
            <label htmlFor="capability-material">
              Material
              <select
                id="capability-material"
                onChange={(event) =>
                  setCapabilityDraft((current) => ({
                    ...current,
                    materialCode: event.target.value as PrinterCapabilityDto['materialCode'],
                  }))
                }
                value={capabilityDraft.materialCode}
              >
                <option value="PLA">PLA</option>
                <option value="PETG">PETG</option>
                <option value="ABS">ABS</option>
                <option value="TPU">TPU</option>
                <option value="RESIN">RESIN</option>
                <option value="PA12">PA12</option>
              </select>
            </label>
            <label htmlFor="capability-quality">
              Quality
              <select
                id="capability-quality"
                onChange={(event) =>
                  setCapabilityDraft((current) => ({
                    ...current,
                    qualityCode: event.target.value as PrinterCapabilityDto['qualityCode'],
                  }))
                }
                value={capabilityDraft.qualityCode}
              >
                <option value="DRAFT">DRAFT</option>
                <option value="STANDARD">STANDARD</option>
                <option value="FINE">FINE</option>
              </select>
            </label>
            <label htmlFor="capability-status">
              สถานะ
              <select
                id="capability-status"
                onChange={(event) =>
                  setCapabilityDraft((current) => ({
                    ...current,
                    status: event.target.value as PrinterCapabilityDto['status'],
                  }))
                }
                value={capabilityDraft.status}
              >
                <option value="DRAFT">DRAFT</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="DISABLED">DISABLED</option>
              </select>
            </label>
            <div className="actions">
              <button className="button secondary" type="button" onClick={() => setCapabilityDraft(createCapabilityDraft(undefined, workspace.printers[0]?.id))}>
                ล้างฟอร์ม
              </button>
              <button className="button primary" type="submit">
                บันทึก capability
              </button>
            </div>
          </form>
        </article>

        <article className="card">
          <div className="cardHeader">
            <h2>ลงทะเบียนวัสดุ</h2>
            <span className="pill">{materialDraft.stockStatus}</span>
          </div>
          <form className="form" onSubmit={saveMaterial}>
            <label htmlFor="material-code">
              Material
              <select
                id="material-code"
                onChange={(event) =>
                  setMaterialDraft((current) => ({
                    ...current,
                    materialCode: event.target.value as ProviderMaterialDto['materialCode'],
                  }))
                }
                value={materialDraft.materialCode}
              >
                <option value="PLA">PLA</option>
                <option value="PETG">PETG</option>
                <option value="ABS">ABS</option>
                <option value="TPU">TPU</option>
                <option value="RESIN">RESIN</option>
                <option value="PA12">PA12</option>
              </select>
            </label>
            <label htmlFor="material-color">
              Color
              <select
                id="material-color"
                onChange={(event) =>
                  setMaterialDraft((current) => ({
                    ...current,
                    colorCode: event.target.value as ProviderMaterialDto['colorCode'],
                  }))
                }
                value={materialDraft.colorCode}
              >
                <option value="BLACK">BLACK</option>
                <option value="WHITE">WHITE</option>
                <option value="RED">RED</option>
                <option value="BLUE">BLUE</option>
                <option value="CLEAR">CLEAR</option>
                <option value="NATURAL">NATURAL</option>
              </select>
            </label>
            <label htmlFor="material-quantity">
              Quantity (g)
              <input
                id="material-quantity"
                inputMode="numeric"
                onChange={(event) =>
                  setMaterialDraft((current) => ({ ...current, quantityGrams: event.target.value }))
                }
                value={materialDraft.quantityGrams}
              />
            </label>
            <label htmlFor="material-stock">
              Stock
              <select
                id="material-stock"
                onChange={(event) =>
                  setMaterialDraft((current) => ({
                    ...current,
                    stockStatus: event.target.value as ProviderMaterialDto['stockStatus'],
                  }))
                }
                value={materialDraft.stockStatus}
              >
                <option value="IN_STOCK">IN_STOCK</option>
                <option value="LOW_STOCK">LOW_STOCK</option>
                <option value="OUT_OF_STOCK">OUT_OF_STOCK</option>
                <option value="DISABLED">DISABLED</option>
              </select>
            </label>
            <div className="actions">
              <button className="button secondary" type="button" onClick={() => setMaterialDraft(createMaterialDraft())}>
                ล้างฟอร์ม
              </button>
              <button className="button primary" type="submit">
                บันทึกวัสดุ
              </button>
            </div>
          </form>
        </article>
      </section>
    </main>
  )
}
