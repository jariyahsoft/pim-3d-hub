import type { ReactElement, ReactNode } from 'react'
import './globals.css'

export const metadata = {
  description: 'Mobile-first onboarding and profile management for Pim 3D Hub',
  title: 'Pim 3D Hub',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode
}>): ReactElement {
  return (
    <html lang="th">
      <body>
        <div className="appShell">
          <header className="topbar">
            <a className="brand" href="/">
              <span className="brandMark">PIM</span>
              <span className="brandText">3D Hub</span>
            </a>
            <nav className="topnav" aria-label="Primary">
              <a href="/onboarding">Onboarding</a>
              <a href="/profile">Profile</a>
              <a href="/kyc">KYC</a>
              <a href="/organizations">Organizations</a>
              <a href="/provider">Provider</a>
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  )
}
