import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ProviderScreen } from './provider-screen.js'
import {
  createEmptyProviderWorkspace,
  demoProviderOnboardingOverview,
  demoProviderWorkspace,
  demoPublicProviderCard,
} from './provider-demo.js'

describe('provider screen', () => {
  it('renders onboarding, loading, and empty states', () => {
    const html = renderToStaticMarkup(
      <ProviderScreen
        initialLoading
        initialOnboardingOverview={demoProviderOnboardingOverview}
        initialPublicCard={demoPublicProviderCard}
        initialWorkspace={createEmptyProviderWorkspace()}
      />,
    )

    expect(html).toContain('Provider onboarding, profile and trust')
    expect(html).toContain('กำลังดึงข้อมูลโปรไฟล์ บริการ checklist และ buyer card')
    expect(html).toContain('ยังไม่มีบริการ')
    expect(html).toContain('Onboarding checklist')
    expect(html).toContain('Public provider card')
    expect(html).toContain('Lead time')
  })

  it('renders the default workspace with trust and instant-order controls', () => {
    const html = renderToStaticMarkup(
      <ProviderScreen
        initialOnboardingOverview={demoProviderOnboardingOverview}
        initialPublicCard={demoPublicProviderCard}
        initialWorkspace={demoProviderWorkspace}
      />,
    )

    expect(html).toContain('Bangkok Design Lab')
    expect(html).toContain('Approved')
    expect(html).toContain('Organic')
    expect(html).toContain('Instant order enabled')
    expect(html).toContain('พักใช้งาน')
    expect(html).toContain('กลับมาใช้งาน')
    expect(html).toContain('DESIGN_ONLY')
    expect(html).toContain('PRINT_ONLY')
  })
})
