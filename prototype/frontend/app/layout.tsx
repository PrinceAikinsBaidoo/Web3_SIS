import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navbar from '../components/Navbar'
import { WalletProvider } from '../context/WalletContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Academic Records Registry',
  description: 'Hybrid Blockchain System for Secure Storage and Verification of Academic Records',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <WalletProvider>
          <div className="min-h-screen bg-gray-50">
            <Navbar />
            <main className="container mx-auto px-4 py-8">
              {children}
            </main>
            <footer className="bg-white border-t mt-16 py-6">
              <div className="container mx-auto px-4 text-center text-gray-600">
                <p>© 2026 Academic Records Registry. Hybrid Blockchain Prototype.</p>
              </div>
            </footer>
          </div>
        </WalletProvider>
      </body>
    </html>
  )
}

