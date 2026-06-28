'use client'

import { useState, type FormEvent, type ReactElement } from 'react'
import { parseUtcTimestamp, parseUuidv7 } from '@pim/domain'
import type { CapacitySlotDto, CapacityWorkspaceDto } from '@pim/application'
import { createEmptyCapacityWorkspace, demoCapacityWorkspace } from './capacity-demo.js'

type CapacityDraft = Readonly<{
  endsAt: string
  startsAt: string
  status: Extract<CapacitySlotDto['status'], 'OPEN' | 'PAUSED'>
  totalUnits: string
}>

type CapacityScreenProps = Readonly<{
  initialLoading?: boolean
  initialWorkspace?: CapacityWorkspaceDto
}>

function createCapacityId(index: number): ReturnType<typeof parseUuidv7> {
  return parseUuidv7(`018f18b2-4c4f-7c7a-9e12-${index.toString().padStart(12, '0')}`)
}

function createCapacityDraft(slot?: CapacitySlotDto): CapacityDraft {
  return {
    endsAt: slot?.endsAt ?? '2026-07-03T18:00:00.000Z',
    startsAt: slot?.startsAt ?? '2026-07-03T09:00:00.000Z',
    status: slot?.status === 'CLOSED' ? 'PAUSED' : (slot?.status ?? 'OPEN'),
    totalUnits: slot ? String(slot.totalUnits) : '3',
  }
}

function summarizeSlots(slots: readonly CapacitySlotDto[]): string {
  if (slots.length === 0) {
    return 'ยังไม่มี slot สำหรับเปิดคิวผลิต'
  }

  const closedCount = slots.filter((slot) => slot.status === 'CLOSED').length
  const pausedCount = slots.filter((slot) => slot.status === 'PAUSED').length
  return `ทั้งหมด ${slots.length} slot, ปิด ${closedCount}, พัก ${pausedCount}`
}

export function CapacityScreen(props: CapacityScreenProps): ReactElement {
  const [workspace, setWorkspace] = useState<CapacityWorkspaceDto>(
    props.initialWorkspace ?? demoCapacityWorkspace,
  )
  const [loading, setLoading] = useState(props.initialLoading ?? false)
  const [statusMessage, setStatusMessage] = useState(
    'จัดการปฏิทินกำลังการผลิต การพักคิว และการปิดวันผลิตแบบ mobile-first',
  )
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [draft, setDraft] = useState<CapacityDraft>(createCapacityDraft(workspace.slots[0]))

  function saveSlot(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    setErrorMessage(null)

    const totalUnits = Number(draft.totalUnits)
    if (!Number.isInteger(totalUnits) || totalUnits <= 0) {
      setErrorMessage('capacity ต้องมากกว่า 0')
      return
    }

    if (Date.parse(draft.startsAt) >= Date.parse(draft.endsAt)) {
      setErrorMessage('เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่มต้น')
      return
    }

    const slot: CapacitySlotDto = Object.freeze({
      endsAt: parseUtcTimestamp(draft.endsAt),
      id: createCapacityId(workspace.slots.length + 850),
      printerId: workspace.slots[0]?.printerId ?? createCapacityId(802),
      providerProfileId: workspace.profile.id,
      reservedUnits: 0,
      startsAt: parseUtcTimestamp(draft.startsAt),
      status: draft.status,
      totalUnits,
      version: 1,
    })

    setWorkspace((current) => ({
      ...current,
      slots: [...current.slots, slot].sort((left, right) => left.startsAt.localeCompare(right.startsAt)),
    }))
    setStatusMessage('เพิ่ม capacity slot แล้ว')
    setDraft(createCapacityDraft())
  }

  function togglePause(slotId: string): void {
    setWorkspace((current) => ({
      ...current,
      slots: current.slots.map((slot) =>
        slot.id === slotId
          ? {
              ...slot,
              status: slot.status === 'PAUSED' ? 'OPEN' : 'PAUSED',
              version: slot.version + 1,
            }
          : slot,
      ),
    }))
    setStatusMessage('อัปเดตสถานะ pause แล้ว')
  }

  function toggleClose(slotId: string): void {
    setWorkspace((current) => ({
      ...current,
      slots: current.slots.map((slot) =>
        slot.id === slotId
          ? {
              ...slot,
              status: slot.status === 'CLOSED' ? 'OPEN' : 'CLOSED',
              version: slot.version + 1,
            }
          : slot,
      ),
    }))
    setStatusMessage('อัปเดตสถานะปิดวันผลิตแล้ว')
  }

  return (
    <main className="screen">
      <section className="hero compact">
        <div className="eyebrow">Phase 1A Provider Supply</div>
        <h1>Capacity calendar และ reservation queue</h1>
        <p className="lede">
          ดู slot ต่อวัน, reservation ที่ถือคิวอยู่, pause/close controls และ conflict summary โดยไม่เปิดเผยข้อมูล buyer
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
              <dt>สรุป slot</dt>
              <dd>{summarizeSlots(workspace.slots)}</dd>
            </div>
            <div>
              <dt>Privacy</dt>
              <dd>รายการ reservation แสดงเฉพาะจำนวน slot, เวลา และสถานะ ไม่แสดง buyer</dd>
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
            <button className="button secondary" type="button" onClick={() => setWorkspace(createEmptyCapacityWorkspace())}>
              แสดง empty state
            </button>
            <button className="button secondary" type="button" onClick={() => setWorkspace(props.initialWorkspace ?? demoCapacityWorkspace)}>
              คืนค่าตัวอย่าง
            </button>
          </div>
        </article>

        <article className="card">
          <div className="cardHeader">
            <h2>Capacity slot</h2>
            <span className="pill">Pause / Close</span>
          </div>
          <form className="stack" onSubmit={saveSlot}>
            <label className="field">
              <span>Starts at</span>
              <input value={draft.startsAt} onChange={(event) => setDraft((current) => ({ ...current, startsAt: event.target.value }))} />
            </label>
            <label className="field">
              <span>Ends at</span>
              <input value={draft.endsAt} onChange={(event) => setDraft((current) => ({ ...current, endsAt: event.target.value }))} />
            </label>
            <label className="field">
              <span>Total units</span>
              <input value={draft.totalUnits} onChange={(event) => setDraft((current) => ({ ...current, totalUnits: event.target.value }))} />
            </label>
            <label className="field">
              <span>สถานะเริ่มต้น</span>
              <select value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as CapacityDraft['status'] }))}>
                <option value="OPEN">OPEN</option>
                <option value="PAUSED">PAUSED</option>
              </select>
            </label>
            <button className="button" type="submit">
              เพิ่ม slot
            </button>
          </form>
        </article>

        <article className="card">
          <div className="cardHeader">
            <h2>Calendar list</h2>
            <span className="pill">{workspace.slots.length} slot</span>
          </div>
          {workspace.slots.length === 0 ? (
            <p className="status">ยังไม่มี slot ให้จองคิว</p>
          ) : (
            <div className="cardStack">
              {workspace.slots.map((slot) => {
                const remainingUnits = slot.totalUnits - slot.reservedUnits
                const hasConflict = remainingUnits <= 0 || slot.status === 'CLOSED'

                return (
                  <article className="addressCard" key={slot.id}>
                    <div className="addressCardTop">
                      <strong>{slot.startsAt}</strong>
                      <span className="pill">{slot.status}</span>
                    </div>
                    <p className="status">
                      {slot.reservedUnits}/{slot.totalUnits} reserved
                    </p>
                    <p className={hasConflict ? 'error' : 'status'}>
                      {hasConflict ? 'Conflict: slot นี้ไม่พร้อมรับ reservation ใหม่' : `เหลือ ${remainingUnits} unit`}
                    </p>
                    <div className="actions">
                      <button className="button secondary" type="button" onClick={() => togglePause(slot.id)}>
                        {slot.status === 'PAUSED' ? 'กลับมาใช้งาน' : 'พักคิว'}
                      </button>
                      <button className="button secondary" type="button" onClick={() => toggleClose(slot.id)}>
                        {slot.status === 'CLOSED' ? 'เปิดวันผลิต' : 'ปิดวันผลิต'}
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </article>

        <article className="card">
          <div className="cardHeader">
            <h2>Current reservations</h2>
            <span className="pill">{workspace.reservations.length} hold</span>
          </div>
          {workspace.reservations.length === 0 ? (
            <p className="status">ยังไม่มี reservation</p>
          ) : (
            <div className="cardStack">
              {workspace.reservations.map((reservation) => (
                <article className="addressCard" key={reservation.id}>
                  <div className="addressCardTop">
                    <strong>{reservation.status}</strong>
                    <span className="pill">{reservation.units} unit</span>
                  </div>
                  <p className="status">หมดอายุ {reservation.expiresAt}</p>
                  <p className="status">slot {reservation.slotId}</p>
                  <p className="status">provider service {reservation.providerServiceId}</p>
                </article>
              ))}
            </div>
          )}
        </article>
      </section>
    </main>
  )
}
