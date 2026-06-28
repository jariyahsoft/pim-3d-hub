import type { ReactElement } from 'react'

export default function HomePage(): ReactElement {
  return (
    <main className="screen landing">
      <section className="hero">
        <div className="eyebrow">Pim 3D Hub</div>
        <h1>Onboarding และโปรไฟล์ที่อ่านง่ายบนมือถือ</h1>
        <p className="lede">
          Flow สำหรับผู้ใช้ใหม่, โปรไฟล์ส่วนตัว, ที่อยู่ reusable และ preference ที่แก้ได้
          โดยไม่เปิดเผยข้อมูลส่วนตัวใน public profile
        </p>
        <div className="actions">
          <a className="button primary" href="/onboarding">
            เริ่ม onboarding
          </a>
          <a className="button secondary" href="/profile">
            เปิดโปรไฟล์
          </a>
          <a className="button secondary" href="/kyc">
            เปิดสถานะ KYC
          </a>
          <a className="button secondary" href="/organizations">
            จัดการองค์กร
          </a>
          <a className="button secondary" href="/provider">
            เปิดผู้ให้บริการ
          </a>
        </div>
      </section>

      <section className="card">
        <h2>สิ่งที่หน้านี้สาธิต</h2>
        <ul className="featureList">
          <li>ภาษาไทยเป็นค่าเริ่มต้น</li>
          <li>draft แบบ offline-safe</li>
          <li>public/private profile separation</li>
          <li>address CRUD และ preference toggles</li>
          <li>KYC status และ resubmission flow</li>
          <li>organization membership และ finance separation</li>
          <li>provider service draft, publish, pause และ resume</li>
        </ul>
      </section>
    </main>
  )
}
