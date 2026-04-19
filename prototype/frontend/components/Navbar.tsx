'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useWallet } from '../context/WalletContext'
import { formatShortAddress } from '@/lib/formatAddress'

export default function Navbar() {
  const pathname = usePathname()
  const { wallet, connectWallet, disconnectWallet } = useWallet()

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/institution', label: 'Institution' },
    { href: '/issuer', label: 'Issuer Dashboard' },
    { href: '/verifier', label: 'Verify Records' },
    { href: '/records', label: 'All Records' },
  ]

  const handleConnect = async () => {
    try {
      await connectWallet()
    } catch (error) {
      console.error('Error connecting wallet:', error)
      alert('Please install MetaMask to use this application')
    }
  }

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">AR</span>
              </div>
              <span className="font-semibold text-gray-900">Academic Records</span>
            </Link>
            <div className="hidden md:flex items-center space-x-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    pathname === link.href
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {!wallet.isConnected ? (
              <button
                onClick={handleConnect}
                disabled={wallet.isConnecting}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium disabled:opacity-50"
              >
                {wallet.isConnecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
            ) : (
              <div className="flex items-center space-x-3 shrink-0">
                <div className="flex items-center space-x-2 min-w-0">
                  <div className="w-2 h-2 bg-green-500 rounded-full shrink-0" aria-hidden />
                  <span
                    className="text-sm text-gray-700 font-mono tabular-nums truncate max-w-[min(100vw-8rem,14rem)] sm:max-w-none"
                    title={wallet.address || undefined}
                  >
                    {wallet.address
                      ? formatShortAddress(wallet.address)
                      : 'Connected'}
                  </span>
                </div>
                <button
                  onClick={disconnectWallet}
                  className="text-xs text-gray-500 hover:text-gray-700 underline"
                >
                  Disconnect
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

