'use client'

import { useState, type FormEvent, type ReactElement } from 'react'
import { demoTrustOverview } from './trust-demo.js'
import type { TrustOverviewDto } from '@pim/application'
import type { OrganizationMemberRoleCode } from '@pim/domain'
import { parseUuidv7 } from '@pim/domain'

type OrganizationScreenProps = Readonly<{
  initialOverview?: TrustOverviewDto
}>

type InviteDraft = Readonly<{
  memberRoleCode: OrganizationMemberRoleCode
  userId: string
}>

const defaultInviteDraft: InviteDraft = Object.freeze({
  memberRoleCode: 'MEMBER',
  userId: '018f18b2-4c4f-7c7a-9e12-4c0b8a8fd099',
})

export function OrganizationScreen(props: OrganizationScreenProps): ReactElement {
  const initialOverview = props.initialOverview ?? demoTrustOverview
  const initialOrganization = initialOverview.organizations[0] ?? demoTrustOverview.organizations[0]!
  const [organization, setOrganization] = useState(initialOrganization)
  const [inviteDraft, setInviteDraft] = useState<InviteDraft>(defaultInviteDraft)
  const [statusMessage, setStatusMessage] = useState(
    'แยกสิทธิ์การเงินออกจากงานปฏิบัติการ และใช้ UUID ภายในสำหรับ lifecycle สมาชิก',
  )

  function handleInvite(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()

    const nextMember = {
      acceptedAt: null,
      id: parseUuidv7(
        `018f18b2-4c4f-7c7a-9e12-${(organization.members.length + 400).toString(16).padStart(12, '0')}`,
      ),
      invitedByUserId: organization.ownerUserId,
      memberRoleCode: inviteDraft.memberRoleCode,
      status: 'INVITED' as const,
      userId: parseUuidv7(inviteDraft.userId),
      version: 1,
    }

    setOrganization((current) => ({
      ...current,
      members: [...current.members, nextMember],
      version: current.version + 1,
    }))
    setInviteDraft(defaultInviteDraft)
    setStatusMessage('เพิ่มคำเชิญสมาชิกใหม่แล้ว')
  }

  return (
    <main className="screen">
      <section className="hero compact">
        <div className="eyebrow">Organization Scope</div>
        <h1>สมาชิกองค์กรและสิทธิ์ตามหน้าที่</h1>
        <p className="lede">
          จัดการเจ้าขององค์กร ทีมปฏิบัติการ และทีมการเงินแบบแยกสิทธิ์ พร้อมสถานะเชิญ ระงับ และเพิกถอน
        </p>
      </section>

      <section className="stack">
        <article className="card">
          <div className="cardHeader">
            <h2>{organization.name}</h2>
            <span className="pill">{organization.status}</span>
          </div>
          <p className="status" role="status" aria-live="polite">
            {statusMessage}
          </p>
          <dl className="detailList">
            <div>
              <dt>ประเภท</dt>
              <dd>{organization.type}</dd>
            </div>
            <div>
              <dt>เจ้าของ</dt>
              <dd>{organization.ownerUserId}</dd>
            </div>
            <div>
              <dt>เวอร์ชัน</dt>
              <dd>{organization.version}</dd>
            </div>
          </dl>
        </article>

        <article className="card">
          <div className="cardHeader">
            <h2>หลักการสิทธิ์</h2>
            <span className="pill">Least Privilege</span>
          </div>
          <ul className="featureList">
            <li>OWNER ดูแลสมาชิกและสิทธิ์ทั้งหมดในองค์กร</li>
            <li>OPERATIONS_ADMIN จัดการงานทีม แต่ไม่อนุมัติสิทธิ์การเงิน</li>
            <li>FINANCE_ADMIN แยกสำหรับงานการเงินและการเข้าถึงที่เกี่ยวข้อง</li>
            <li>MEMBER เข้าถึงเฉพาะขอบเขตที่ได้รับมอบหมาย</li>
          </ul>
        </article>

        <article className="card">
          <div className="cardHeader">
            <h2>สมาชิกปัจจุบัน</h2>
            <span className="pill">{organization.members.length} คน</span>
          </div>
          <div className="cardStack">
            {organization.members.map((member) => (
              <article className="addressCard" key={member.id}>
                <div className="addressCardTop">
                  <strong>{member.memberRoleCode}</strong>
                  <span className="pill">{member.status}</span>
                </div>
                <p>userId: {member.userId}</p>
                <p>acceptedAt: {member.acceptedAt ?? 'รอการตอบรับ'}</p>
                <div className="actions">
                  <button
                    className="button secondary"
                    type="button"
                    onClick={() => {
                      setOrganization((current) => ({
                        ...current,
                        members: current.members.map((entry) =>
                          entry.id === member.id
                            ? { ...entry, status: entry.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' }
                            : entry,
                        ),
                      }))
                      setStatusMessage('อัปเดตสถานะสมาชิกแล้ว')
                    }}
                  >
                    สลับ Active/Suspended
                  </button>
                  <button
                    className="button primary"
                    type="button"
                    onClick={() => {
                      setOrganization((current) => ({
                        ...current,
                        members: current.members.map((entry) =>
                          entry.id === member.id ? { ...entry, status: 'REVOKED' } : entry,
                        ),
                      }))
                      setStatusMessage('เพิกถอนสิทธิ์สมาชิกแล้ว')
                    }}
                  >
                    เพิกถอน
                  </button>
                </div>
              </article>
            ))}
          </div>
        </article>

        <article className="card">
          <div className="cardHeader">
            <h2>เชิญสมาชิกใหม่</h2>
            <span className="pill">UUID Only</span>
          </div>
          <form className="form" onSubmit={handleInvite}>
            <label htmlFor="organization-user-id">
              Internal user ID
              <input
                id="organization-user-id"
                onChange={(event) =>
                  setInviteDraft((current) => ({ ...current, userId: event.target.value }))
                }
                value={inviteDraft.userId}
              />
            </label>

            <label htmlFor="organization-role">
              บทบาทสมาชิก
              <select
                id="organization-role"
                onChange={(event) =>
                  setInviteDraft((current) => ({
                    ...current,
                    memberRoleCode: event.target.value as OrganizationMemberRoleCode,
                  }))
                }
                value={inviteDraft.memberRoleCode}
              >
                <option value="MEMBER">MEMBER</option>
                <option value="OPERATIONS_ADMIN">OPERATIONS_ADMIN</option>
                <option value="FINANCE_ADMIN">FINANCE_ADMIN</option>
                <option value="OWNER">OWNER</option>
              </select>
            </label>

            <div className="actions">
              <button className="button primary" type="submit">
                ส่งคำเชิญ
              </button>
            </div>
          </form>
        </article>
      </section>
    </main>
  )
}
