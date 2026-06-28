import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { PrinterScreen } from './printer-screen.js'
import { createEmptyPrinterWorkspace, demoPrinterWorkspace } from './printer-demo.js'

describe('printer screen', () => {
  it('renders printer, capability, and material states', () => {
    const html = renderToStaticMarkup(
      <PrinterScreen initialLoading initialWorkspace={createEmptyPrinterWorkspace()} />,
    )

    expect(html).toContain('เครื่องพิมพ์ capability และวัสดุ')
    expect(html).toContain('กำลังดึงข้อมูลเครื่องพิมพ์และวัสดุ')
    expect(html).toContain('ยังไม่มีเครื่องพิมพ์')
    expect(html).toContain('build volume')
  })

  it('renders the default workspace with printer and material controls', () => {
    const html = renderToStaticMarkup(<PrinterScreen initialWorkspace={demoPrinterWorkspace} />)

    expect(html).toContain('Bambu X1C')
    expect(html).toContain('PLA')
    expect(html).toContain('BLACK')
    expect(html).toContain('ปิดใช้งาน')
    expect(html).toContain('บันทึกวัสดุ')
  })
})
