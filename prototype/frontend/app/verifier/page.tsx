'use client'

import { useState, useEffect } from 'react'
import { contractService, RecordWithMetadata } from '@/lib/contract'
import { ethers } from 'ethers'
import { DelayedLoading } from '@/components/LoadingSpinner'

export default function Verifier() {
  const [recordHash, setRecordHash] = useState('')
  const [result, setResult] = useState<{ valid: boolean; record?: RecordWithMetadata } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isDelayedLoading, setIsDelayedLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Track delayed loading state
  useEffect(() => {
    let timeout: NodeJS.Timeout
    if (isLoading) {
      timeout = setTimeout(() => {
        setIsDelayedLoading(true)
      }, 2000)
    } else {
      setIsDelayedLoading(false)
    }
    return () => {
      if (timeout) clearTimeout(timeout)
    }
  }, [isLoading])

  const verifyRecord = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!recordHash.trim()) {
      setError('Please enter a record hash')
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      setResult(null)

      // Validate hash format
      let hash = recordHash.trim()
      if (!hash.startsWith('0x')) {
        // If user enters plain text, hash it
        hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(hash))
      }

      const verificationResult = await contractService.verifyRecord(hash)
      setResult(verificationResult)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 10)}...${address.slice(-8)}`
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Verify Academic Records</h1>
        <p className="text-gray-600">
          Enter a record hash to verify its authenticity on the blockchain.
        </p>
      </div>

      {/* Search Form */}
      <form onSubmit={verifyRecord} className="bg-white rounded-xl shadow-sm border p-6 mb-8">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Record Hash
        </label>
        <div className="flex gap-4">
          <input
            type="text"
            value={recordHash}
            onChange={(e) => setRecordHash(e.target.value)}
            className="flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-sm"
            placeholder="0x..."
          />
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <DelayedLoading isLoading={isLoading} size="sm" color="white" />
                <span>Verifying...</span>
              </>
            ) : (
              'Verify'
            )}
          </button>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Enter the keccak256 hash of the academic record, or plain text to auto-hash
        </p>
      </form>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-red-900">Verification Failed</h3>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className={`rounded-xl border p-6 ${result.valid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-center gap-3 mb-6">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${result.valid ? 'bg-green-100' : 'bg-red-100'}`}>
              {result.valid ? (
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
            <div>
              <h2 className={`text-xl font-bold ${result.valid ? 'text-green-900' : 'text-red-900'}`}>
                {result.valid ? '✓ Record Verified' : '✗ Record Invalid'}
              </h2>
              <p className={result.valid ? 'text-green-700' : 'text-red-700'}>
                {result.valid 
                  ? 'This academic record is valid and has not been tampered with.' 
                  : 'This record has been revoked or does not exist.'}
              </p>
            </div>
          </div>

          {result.record && (
            <div className="bg-white rounded-lg border border-green-200 p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Record Details</h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Record Hash</p>
                  <p className="font-mono text-xs break-all">{result.record.recordHash}</p>
                </div>
                <div>
                  <p className="text-gray-500">Issuer Address</p>
                  <p className="font-mono">{formatAddress(result.record.issuer)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Issue Date</p>
                  <p>{formatDate(result.record.timestamp)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Status</p>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${result.record.isValid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {result.record.isValid ? 'Valid' : 'Revoked'}
                  </span>
                </div>
              </div>
              
              {result.record.parsedMetadata && Object.keys(result.record.parsedMetadata).length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-gray-500 text-sm">Metadata</p>
                    {result.record.parsedMetadata.encrypted && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        🔒 Encrypted
                      </span>
                    )}
                  </div>
                  <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
                    {JSON.stringify(result.record.parsedMetadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mt-8">
        <h3 className="font-semibold text-blue-900 mb-2">How Verification Works</h3>
        <ol className="text-blue-700 text-sm space-y-2">
          <li>1. The record hash is computed from the encrypted academic document</li>
          <li>2. The smart contract is queried to check if this hash exists on the blockchain</li>
          <li>3. If found, the contract returns whether the record is valid or has been revoked</li>
          <li>4. Any tampering with the original document will result in a different hash, causing verification to fail</li>
        </ol>
      </div>
    </div>
  )
}

