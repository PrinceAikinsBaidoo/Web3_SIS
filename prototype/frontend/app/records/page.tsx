'use client'

import { useState, useEffect } from 'react'
import { contractService, RecordWithMetadata } from '@/lib/contract'
import { useWallet } from '@/context/WalletContext'
import { DelayedLoading } from '@/components/LoadingSpinner'

export default function Records() {
  const { wallet, connectWallet: connectWalletContext } = useWallet()
  const [records, setRecords] = useState<RecordWithMetadata[]>([])
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

  const loadRecords = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const addr = wallet.address
      if (!addr) {
        setError('Please connect your wallet first')
        return
      }

      const issuerRecords = await contractService.getIssuerRecords(addr)
      setRecords(issuerRecords)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (wallet.isConnected && wallet.address) {
      loadRecords()
    }
  }, [wallet.isConnected, wallet.address])

  const formatAddress = (address: string) => {
    return `${address.slice(0, 10)}...${address.slice(-8)}`
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const handleRevoke = async (recordHash: string) => {
    if (!confirm('Are you sure you want to revoke this record? This action cannot be undone.')) {
      return
    }

    try {
      setIsLoading(true)
      const provider = new (await import('ethers')).providers.Web3Provider(window.ethereum!)
      const signer = provider.getSigner()
      
      const tx = await contractService.revokeRecord(signer, recordHash)
      await tx.wait()
      
      // Reload records
      await loadRecords()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">All Records</h1>
        <p className="text-gray-600">
          View and manage academic records issued by your institution.
        </p>
      </div>

      {/* Connect Wallet */}
      {!wallet.isConnected && (
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Connect Your Wallet</h2>
          <p className="text-gray-600 mb-6">
            Connect your wallet to view records issued by your institution.
          </p>
          <button
            onClick={connectWalletContext}
            disabled={isLoading}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <DelayedLoading isLoading={isLoading} size="sm" color="white" />
                <span>Connecting...</span>
              </>
            ) : (
              'Connect Wallet'
            )}
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Records List */}
      {wallet.isConnected && wallet.address && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="p-6 border-b flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Issued Records</h2>
              <p className="text-sm text-gray-500 mt-1">
                Wallet: {formatAddress(wallet.address)}
              </p>
            </div>
            <button
              onClick={() => loadRecords()}
              disabled={isLoading}
              className="px-4 py-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading ? (
                <DelayedLoading isLoading={isLoading} size="sm" color="primary" />
              ) : (
                'Refresh'
              )}
            </button>
          </div>

          {records.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No records found for this address.
            </div>
          ) : (
            <div className="divide-y">
              {records.map((record, index) => (
                <div key={index} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          record.isValid 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {record.isValid ? 'Valid' : 'Revoked'}
                        </span>
                        <span className="text-sm text-gray-500">
                          Issued: {formatDate(record.timestamp)}
                        </span>
                      </div>
                      
                      <p className="font-mono text-sm text-gray-600 mb-3 break-all">
                        {record.recordHash}
                      </p>

                      {record.parsedMetadata && Object.keys(record.parsedMetadata).length > 0 && (
                        <div className="bg-gray-50 rounded-lg p-3 text-sm">
                          <div className="grid md:grid-cols-3 gap-4">
                            {record.parsedMetadata.studentId && (
                              <div>
                                <span className="text-gray-500">Student ID:</span>
                                <span className="ml-2 font-medium">{record.parsedMetadata.studentId}</span>
                              </div>
                            )}
                            {record.parsedMetadata.degree && (
                              <div>
                                <span className="text-gray-500">Degree:</span>
                                <span className="ml-2 font-medium">{record.parsedMetadata.degree}</span>
                              </div>
                            )}
                            {record.parsedMetadata.cid && (
                              <div>
                                <span className="text-gray-500">IPFS CID:</span>
                                <span className="ml-2 font-mono text-xs block break-all">{record.parsedMetadata.cid}</span>
                              </div>
                            )}
                            {record.parsedMetadata.encrypted && (
                              <div className="col-span-full">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                  🔒 Encrypted (AES-256-GCM)
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {record.isValid && (
                      <button
                        onClick={() => handleRevoke(record.recordHash)}
                        disabled={isLoading}
                        className="ml-4 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm disabled:opacity-50 flex items-center gap-1"
                      >
                        {isLoading ? (
                          <DelayedLoading isLoading={isLoading} size="sm" color="primary" />
                        ) : (
                          'Revoke'
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

