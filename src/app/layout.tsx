import type { Metadata } from 'next'
import { Epilogue, DM_Sans } from 'next/font/google'
import './globals.css'

const epilogue = Epilogue({
  subsets: ['latin'],
  variable: '--font-epilogue',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'CER Patient Portal',
  description: 'Your CER patient portal',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${epilogue.variable} ${dmSans.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  )
}