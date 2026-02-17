import Link from 'next/link'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Academic Records Registry - Home',
  description: 'Hybrid Blockchain System for Secure Storage and Verification of Academic Records',
}

export default function Home() {
  return (
    <div className="max-w-6xl mx-auto">
      {/* Hero Section */}
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-100 rounded-full mb-6">
          <svg className="w-10 h-10 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Academic Records Registry
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
          A hybrid blockchain system for secure storage and verification of academic records. 
          Combining on-chain integrity with off-chain encrypted storage.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link 
            href="/issuer" 
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
          >
            Issue Records
          </Link>
          <Link 
            href="/verifier" 
            className="px-6 py-3 bg-white text-primary-600 border border-primary-600 rounded-lg hover:bg-primary-50 transition-colors font-medium"
          >
            Verify Records
          </Link>
        </div>
      </div>

      {/* Features Section */}
      <div className="grid md:grid-cols-3 gap-8 py-12">
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Tamper-Proof</h3>
          <p className="text-gray-600">
            Records are anchored on the blockchain using keccak256 hashing. Any modification to the original document will result in a hash mismatch, ensuring integrity.
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Privacy First</h3>
          <p className="text-gray-600">
            Sensitive data is encrypted and stored off-chain. Only cryptographic hashes are stored on the blockchain, ensuring GDPR compliance.
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Instant Verification</h3>
          <p className="text-gray-600">
            Employers can verify academic credentials instantly without contacting the issuing institution. Fully trustless and decentralized.
          </p>
        </div>
      </div>

      {/* How It Works */}
      <div className="py-12">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">How It Works</h2>
        <div className="grid md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">1</div>
            <h3 className="font-semibold text-gray-900 mb-2">Upload</h3>
            <p className="text-sm text-gray-600">University uploads the academic record</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">2</div>
            <h3 className="font-semibold text-gray-900 mb-2">Encrypt & Hash</h3>
            <p className="text-sm text-gray-600">Data is encrypted and keccak256 hash computed</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">3</div>
            <h3 className="font-semibold text-gray-900 mb-2">Store On-Chain</h3>
            <p className="text-sm text-gray-600">Hash stored permanently on blockchain</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">4</div>
            <h3 className="font-semibold text-gray-900 mb-2">Verify</h3>
            <p className="text-sm text-gray-600">Anyone can verify record authenticity</p>
          </div>
        </div>
      </div>

      {/* Contract Info */}
      <div className="bg-gray-900 text-white rounded-xl p-8 mt-8">
        <h2 className="text-2xl font-bold mb-4">Smart Contract Information</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <p className="text-gray-400 text-sm mb-1">RecordRegistry Address</p>
            <code className="bg-gray-800 px-3 py-2 rounded block text-sm break-all">
              0x0165878A594ca255338adfa4d48449f69242Eb8F
            </code>
          </div>
          <div>
            <p className="text-gray-400 text-sm mb-1">Network</p>
            <code className="bg-gray-800 px-3 py-2 rounded block text-sm">
              Localhost (Hardhat)
            </code>
          </div>
        </div>
      </div>
    </div>
  )
}

