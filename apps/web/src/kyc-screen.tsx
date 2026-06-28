'use client'

import { useState, type FormEvent, type ReactElement } from 'react'
import { demoTrustOverview } from './trust-demo.js'
import type { TrustOverviewDto } from '@pim/application'

type KycScreenProps = Readonly<{
  initialOverview?: TrustOverviewDto
}>

function statusLabel(status: TrustOverviewDto['verificationCases'][number]['status']): string {
  switch (status) {
    case 'APPROVED':
      return 'อนุมัติแล้ว'
    case 'NEEDS_MORE_INFO':
      return 'ต้องการข้อมูลเพิ่ม'
    case 'NOT_STARTED':
      return 'ยังไม่เริ่ม'
    case 'PENDING':
      return 'กำลังตรวจสอบ'
    case 'REJECTED':
      return 'ไม่ผ่าน'
    case 'SUSPENDED':
      return 'ระงับไว้'
  }
}

export function KycScreen(props: KycScreenProps): ReactElement {
  const initialOverview = props.initialOverview ?? demoTrustOverview
  const [cases, setCases] = useState(initialOverview.verificationCases)
  const [maskedLabel, setMaskedLabel] = useState('หนังสือรับรองบริษัทลงท้าย 6789')
  const [sourceType, setSourceType] = useState<'PRIVATE_ASSET' | 'VENDOR_REFERENCE'>('PRIVATE_ASSET')
  const [statusMessage, setStatusMessage] = useState(
    'ข้อมูลใช้เพื่อการยืนยันตัวตนตามวัตถุประสงค์ และแสดงเฉพาะข้อมูลที่ปกปิดบางส่วนในหน้าจอนี้',
  )

  const activeCase = cases[0] ?? demoTrustOverview.verificationCases[0]!

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()

    setCases((current) =>
      current.map((item) =>
        item.id === activeCase?.id
          ? {
              ...item,
              documents: [{ maskedLabel: maskedLabel.trim(), sourceType }],
              resubmissionCount: item.resubmissionCount + 1,
              status: 'PENDING',
              version: item.version + 1,
            }
          : item,
      ),
    )
    setStatusMessage('ส่งข้อมูลยืนยันรอบใหม่แล้ว ระบบจะแจ้งผลหลังการตรวจสอบ')
  }

  return (
    <main className="screen">
      <section className="hero compact">
        <div className="eyebrow">Identity And Trust</div>
        <h1>ยืนยันตัวตนและสถานะ KYC</h1>
        <p className="lede">
          ดูสถานะการตรวจสอบ ส่งข้อมูลเพิ่มเติม และอ่านเหตุผลที่ต้องแก้ไขโดยไม่เปิดเผยข้อมูลอ่อนไหว
        </p>
      </section>

      <section className="stack">
        <article className="card">
          <div className="cardHeader">
            <h2>บทบาทที่กำลังขอใช้งาน</h2>
            <span className="pill">KYC Required</span>
          </div>
          <div className="cardStack">
            {initialOverview.roles.map((role) => (
              <article className="addressCard" key={role.id}>
                <div className="addressCardTop">
                  <strong>{role.roleCode}</strong>
                  <span className="pill">{role.status}</span>
                </div>
                <p>scope: {role.scopeType}</p>
              </article>
            ))}
          </div>
        </article>

        <article className="card">
          <div className="cardHeader">
            <h2>สถานะการตรวจสอบ</h2>
            <span className={`badge ${activeCase?.status === 'APPROVED' ? 'saved' : 'idle'}`}>
              {activeCase ? statusLabel(activeCase.status) : 'ไม่มีเคส'}
            </span>
          </div>
          <p className="status" role="status" aria-live="polite">
            {statusMessage}
          </p>

          {activeCase ? (
            <dl className="detailList">
              <div>
                <dt>ประเภทเคส</dt>
                <dd>{activeCase.type}</dd>
              </div>
              <div>
                <dt>เหตุผลจากผู้ตรวจ</dt>
                <dd>{activeCase.decisionReason ?? 'ยังไม่มีหมายเหตุ'}</dd>
              </div>
              <div>
                <dt>จำนวนครั้งที่ส่งใหม่</dt>
                <dd>{activeCase.resubmissionCount}</dd>
              </div>
            </dl>
          ) : null}
        </article>

        <article className="card">
          <div className="cardHeader">
            <h2>ข้อมูลที่ส่งแล้ว</h2>
            <span className="pill">Masked Only</span>
          </div>
          <div className="cardStack">
            {activeCase?.documents.map((document) => (
              <article className="addressCard" key={`${document.sourceType}:${document.maskedLabel}`}>
                <div className="addressCardTop">
                  <strong>{document.maskedLabel}</strong>
                  <span className="pill">{document.sourceType}</span>
                </div>
                <p>เอกสารจริงถูกเก็บแบบ private และเข้าถึงตามหน้าที่เท่านั้น</p>
              </article>
            ))}
          </div>
        </article>

        <article className="card">
          <div className="cardHeader">
            <h2>ส่งข้อมูลเพิ่มเติม</h2>
            <span className="pill">Manual Review</span>
          </div>
          <p className="lede">
            อธิบายวัตถุประสงค์ ความเป็นส่วนตัว และการเก็บข้อมูลเท่าที่จำเป็น โดยยังไม่ระบุข้อกฎหมายเกินกว่าที่อนุมัติ
          </p>

          <form className="form" onSubmit={handleSubmit}>
            <label htmlFor="kyc-label">
              ป้ายกำกับแบบปกปิดบางส่วน
              <input
                id="kyc-label"
                onChange={(event) => setMaskedLabel(event.target.value)}
                value={maskedLabel}
              />
            </label>

            <label htmlFor="kyc-source">
              แหล่งอ้างอิงเอกสาร
              <select
                id="kyc-source"
                onChange={(event) =>
                  setSourceType(event.target.value as 'PRIVATE_ASSET' | 'VENDOR_REFERENCE')
                }
                value={sourceType}
              >
                <option value="PRIVATE_ASSET">PRIVATE_ASSET</option>
                <option value="VENDOR_REFERENCE">VENDOR_REFERENCE</option>
              </select>
            </label>

            <div className="actions">
              <button className="button primary" type="submit">
                ส่งข้อมูลอีกครั้ง
              </button>
            </div>
          </form>
        </article>
      </section>
    </main>
  )
}
