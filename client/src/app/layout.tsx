import type { Metadata } from 'next'
import './globals.css'
import NetworkHelper from '@/components/NetworkHelper'

export const metadata: Metadata = {
  title: 'Inventory Management System',
  description: 'DECENTRALIZED INVENTORY MANAGEMENT USING BLOCKCHAIN',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <NetworkHelper />
        {children}
      </body>
    </html>
  )
}

