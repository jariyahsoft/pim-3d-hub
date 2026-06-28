import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ServiceRequestScreen } from './service-request-screen.js'
import {
  createEmptyServiceRequestDraft,
  demoServiceRequest,
  demoServiceRequestDraft,
} from './service-request-demo.js'

describe('service request screen', () => {
  it('renders draft workflow, loading state, and validation-oriented fields', () => {
    const html = renderToStaticMarkup(
      <ServiceRequestScreen
        initialDraft={createEmptyServiceRequestDraft()}
        initialLoading
        initialRequest={demoServiceRequest}
      />,
    )

    expect(html).toContain('Service request draft and publish')
    expect(html).toContain('กำลังดึงข้อมูลคำขอรับบริการ')
    expect(html).toContain('เลือกบริการ')
    expect(html).toContain('รายละเอียดงาน')
    expect(html).toContain('งบประมาณ')
    expect(html).toContain('รับทราบนโยบายงานต้องห้าม')
  })

  it('renders permission-denied and preview states', () => {
    const deniedHtml = renderToStaticMarkup(
      <ServiceRequestScreen initialPermissionDenied initialRequest={demoServiceRequest} />,
    )
    const html = renderToStaticMarkup(
      <ServiceRequestScreen initialDraft={demoServiceRequestDraft} initialRequest={demoServiceRequest} />,
    )

    expect(deniedHtml).toContain('Permission denied')
    expect(html).toContain('ตัวอย่างคำขอ')
    expect(html).toContain('Privacy mode')
    expect(html).toContain('PRIVATE_DIRECT')
    expect(html).toContain('DESIGN_AND_PRINT')
  })
})
