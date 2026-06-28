import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { createEmptyCapacityWorkspace, demoCapacityWorkspace } from './capacity-demo.js'
import { CapacityScreen } from './capacity-screen.js'

describe('capacity screen', () => {
  it('renders empty state and privacy note', () => {
    const html = renderToStaticMarkup(
      <CapacityScreen initialLoading initialWorkspace={createEmptyCapacityWorkspace()} />,
    )

    expect(html).toContain('Capacity calendar และ reservation queue')
    expect(html).toContain('ยังไม่มี slot ให้จองคิว')
    expect(html).toContain('ไม่แสดง buyer')
  })

  it('renders conflict and pause or close controls', () => {
    const html = renderToStaticMarkup(<CapacityScreen initialWorkspace={demoCapacityWorkspace} />)

    expect(html).toContain('Bangkok Print Ops')
    expect(html).toContain('ปิดวันผลิต')
    expect(html).toContain('พักคิว')
    expect(html).toContain('Conflict: slot นี้ไม่พร้อมรับ reservation ใหม่')
  })
})
