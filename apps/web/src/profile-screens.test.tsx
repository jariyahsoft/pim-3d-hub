import { KycScreen } from './kyc-screen.js'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { OnboardingScreen } from './onboarding-screen.js'
import { OrganizationScreen } from './organization-screen.js'
import { ProfileScreen } from './profile-screen.js'

describe('web profile screens', () => {
  it('renders the onboarding screen with accessible form structure', () => {
    const html = renderToStaticMarkup(<OnboardingScreen />)

    expect(html).toContain('<main')
    expect(html).toContain('role="status"')
    expect(html).toContain('aria-live="polite"')
    expect(html).toContain('ชื่อแสดงผล')
    expect(html).toContain('ภาษา')
    expect(html).toContain('บทบาทเริ่มต้น')
  })

  it('renders the profile screen with separate public, private, address, and preference sections', () => {
    const html = renderToStaticMarkup(<ProfileScreen />)

    expect(html).toContain('โปรไฟล์สาธารณะ')
    expect(html).toContain('ข้อมูลติดต่อส่วนตัว')
    expect(html).toContain('ที่อยู่จัดส่ง')
    expect(html).toContain('การแจ้งเตือน')
    expect(html).toContain('ความเป็นส่วนตัว')
    expect(html).toContain('<fieldset')
    expect(html).toContain('<legend>การแจ้งเตือน</legend>')
    expect(html).toContain('aria-live="polite"')
  })

  it('renders the KYC and organization screens with privacy and membership guidance', () => {
    const kycHtml = renderToStaticMarkup(<KycScreen />)
    const organizationHtml = renderToStaticMarkup(<OrganizationScreen />)

    expect(kycHtml).toContain('ยืนยันตัวตนและสถานะ KYC')
    expect(kycHtml).toContain('Masked Only')
    expect(kycHtml).toContain('role="status"')
    expect(organizationHtml).toContain('สมาชิกองค์กรและสิทธิ์ตามหน้าที่')
    expect(organizationHtml).toContain('Least Privilege')
    expect(organizationHtml).toContain('FINANCE_ADMIN')
  })
})
