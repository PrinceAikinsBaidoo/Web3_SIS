'use client'

import { useState, useEffect } from 'react'
import { contractService, RecordWithMetadata } from '@/lib/contract'
import { ethers } from 'ethers'
import { DelayedLoading } from '@/components/LoadingSpinner'
import { decryptEncryptedRecordWithSecret } from '@/lib/encryption'

// Types for decrypted data
interface CourseGrade {
  courseCode: string
  courseName: string
  credits: number
  grade: string
  semester: string
}

interface PrivateData {
  cwa: number
  grades: CourseGrade[]
  minor: string | null
  concentration: string | null
  graduationDate: string | null
  transcriptDetails: string | null
}

interface OffChainData {
  disciplinaryRecords: string | null
}

interface PublicData {
  fullLegalName: string
  programMajor: string
  enrollmentStatus: string
  degreeAwarded: string
  issueDate: string
  cid: string
  hasPrivateData: boolean
  hasOffChainData: boolean
}

interface FullRecordData {
  public: PublicData
  private: {
    encryptedData: string
    iv: string
    salt: string
  }
  offChain: {
    encryptedData: string
    iv: string
    salt: string
  }
}

export default function Verifier() {
  const [recordHash, setRecordHash] = useState('')
  const [secretKey, setSecretKey] = useState('')
  const [result, setResult] = useState<{ valid: boolean; record?: RecordWithMetadata; privateData?: PrivateData; offChainData?: OffChainData } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isDecrypting, setIsDecrypting] = useState(false)
  const [isDelayedLoading, setIsDelayedLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSecretInput, setShowSecretInput] = useState(false)
  const [decryptError, setDecryptError] = useState<string | null>(null)

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
      setDecryptError(null)
      setResult(null)

      // Validate hash format
      let hash = recordHash.trim()
      if (!hash.startsWith('0x')) {
        // If user enters plain text, hash it
        hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(hash))
      }

      const verificationResult = await contractService.verifyRecord(hash)
      
      // Set initial result with public data
      setResult({
        valid: verificationResult.valid,
        record: verificationResult.record
      })

      // If secret key is provided, try to decrypt private data
      if (secretKey && verificationResult.record?.parsedMetadata?.cid) {
        await decryptPrivateData(verificationResult.record.parsedMetadata.cid)
      }

    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const decryptWithSecret = async () => {
    if (!result?.record?.parsedMetadata?.cid) {
      setDecryptError('No IPFS data to decrypt')
      return
    }

    await decryptPrivateData(result.record.parsedMetadata.cid)
  }

  const decryptPrivateData = async (cid: string) => {
    try {
      setIsDecrypting(true)
      setDecryptError(null)

      // Fetch the full record from IPFS
      const response = await fetch(`https://gateway.pinata.cloud/ipfs/${cid}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch record from IPFS: ${response.status} ${response.statusText}`)
      }
      
      const fullData: FullRecordData = await response.json()

      if (!fullData.private || !fullData.private.salt) {
        setDecryptError('No private data found in this record')
        return
      }

      // Decrypt private data with the secret key
      const privateData = await decryptEncryptedRecordWithSecret<PrivateData>(
        fullData.private,
        secretKey
      )

      // Decrypt off-chain data (disciplinary records)
      let offChainData: OffChainData | undefined
      if (fullData.offChain && fullData.offChain.salt) {
        offChainData = await decryptEncryptedRecordWithSecret<OffChainData>(
          fullData.offChain,
          secretKey
        )
      }

      // Update result with decrypted private data
      setResult(prev => ({
        ...prev!,
        privateData,
        offChainData
      }))

    } catch (err: any) {
      console.error('Decryption error details:', err)
      // Provide more specific error messages
      if (err.message.includes('Failed to fetch')) {
        setDecryptError(`IPFS Error: ${err.message}`)
      } else if (err.message.includes('Unsupported state')) {
        setDecryptError('Decryption failed: Invalid secret key or corrupted data. Please check your secret key and try again.')
      } else if (err.message.includes('The payload')) {
        setDecryptError('Decryption failed: Invalid secret key format. Please ensure you are using the correct secret key.')
      } else if (err.message.includes('OperationError')) {
        setDecryptError('Decryption failed: The secret key is incorrect. Please verify and try again.')
      } else {
        setDecryptError(`Decryption failed: ${err.message || 'Unknown error. Please check your secret key.'}`)
      }
    } finally {
      setIsDecrypting(false)
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
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Verify Academic Records</h1>
        <p className="text-gray-600">
          Enter a record hash to verify its authenticity. Add a secret key to view private data.
        </p>
      </div>

      {/* Search Form */}
      <form onSubmit={verifyRecord} className="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Record Hash
        </label>
        <div className="flex gap-4 mb-4">
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
        
        {/* Secret Key Toggle */}
        <div className="border-t pt-4">
          <button
            type="button"
            onClick={() => setShowSecretInput(!showSecretInput)}
            className="text-sm text-purple-600 hover:text-purple-800 flex items-center gap-2"
          >
            {showSecretInput ? '▼' : '▶'} Have a secret key? Click to reveal private data
          </button>
          
          {showSecretInput && (
            <div className="mt-3 flex gap-4">
              <input
                type="password"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 font-mono text-sm"
                placeholder="Enter secret key to decrypt private data"
              />
              <button
                type="button"
                onClick={decryptWithSecret}
                disabled={isDecrypting || !result?.record?.parsedMetadata?.cid}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
              >
                {isDecrypting ? (
                  <>
                    <DelayedLoading isLoading={isDecrypting} size="sm" color="white" />
                    <span>Decrypting...</span>
                  </>
                ) : (
                  'Decrypt'
                )}
              </button>
            </div>          )}
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Enter the keccak256 hash of the academic record, or plain text to auto-hash
        </p>
      </form>

      {/* Decrypt Error */}
      {decryptError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <p className="text-red-700">{decryptError}</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
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
            <>
              {/* PUBLIC DATA - Always Visible */}
              <div className="bg-white rounded-lg border border-green-200 p-4 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-gray-900">Public Information</h3>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Visible to everyone</span>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  {result.record.parsedMetadata?.institutionName && (
                    <div>
                      <p className="text-gray-500">Institution</p>
                      <p className="font-medium">{result.record.parsedMetadata.institutionName}</p>
                    </div>
                  )}
                  {result.record.parsedMetadata?.institutionDomain && (
                    <div>
                      <p className="text-gray-500">Institution Domain</p>
                      <p className="font-medium">{result.record.parsedMetadata.institutionDomain}</p>
                    </div>
                  )}
                  {result.record.parsedMetadata?.fullLegalName && (
                    <div>
                      <p className="text-gray-500">Full Legal Name</p>
                      <p className="font-medium">{result.record.parsedMetadata.fullLegalName}</p>
                    </div>
                  )}
                  {result.record.parsedMetadata?.programMajor && (
                    <div>
                      <p className="text-gray-500">Program/Major</p>
                      <p className="font-medium">{result.record.parsedMetadata.programMajor}</p>
                    </div>
                  )}
                  {result.record.parsedMetadata?.enrollmentStatus && (
                    <div>
                      <p className="text-gray-500">Enrollment Status</p>
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        result.record.parsedMetadata.enrollmentStatus === 'active' ? 'bg-green-100 text-green-700' :
                        result.record.parsedMetadata.enrollmentStatus === 'graduated' ? 'bg-blue-100 text-blue-700' :
                        result.record.parsedMetadata.enrollmentStatus === 'completed' ? 'bg-gray-100 text-gray-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {result.record.parsedMetadata.enrollmentStatus.charAt(0).toUpperCase() + result.record.parsedMetadata.enrollmentStatus.slice(1)}
                      </span>
                    </div>
                  )}
                  {result.record.parsedMetadata?.degreeAwarded && (
                    <div>
                      <p className="text-gray-500">Degree Awarded</p>
                      <p className="font-medium">{result.record.parsedMetadata.degreeAwarded}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-gray-500">Issuer Address</p>
                    <p className="font-mono">{formatAddress(result.record.issuer)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Issue Date</p>
                    <p>{formatDate(result.record.timestamp)}</p>
                  </div>
                </div>
              </div>

              {/* PRIVATE DATA - Requires Secret Key */}
              {result.privateData && (
                <div className="bg-purple-50 rounded-lg border border-purple-200 p-4 mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <h3 className="font-semibold text-gray-900">Private Information</h3>
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">Decrypted with secret key</span>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    {result.privateData.cwa > 0 && (
                      <div>
                        <p className="text-gray-500">CWA</p>
                        <p className="font-medium text-lg">{result.privateData.cwa.toFixed(2)} / 100</p>
                      </div>
                    )}
                    {result.privateData.graduationDate && (
                      <div>
                        <p className="text-gray-500">Graduation Date</p>
                        <p className="font-medium">{result.privateData.graduationDate}</p>
                      </div>
                    )}
                    {result.privateData.minor && (
                      <div>
                        <p className="text-gray-500">Minor</p>
                        <p className="font-medium">{result.privateData.minor}</p>
                      </div>
                    )}
                    {result.privateData.concentration && (
                      <div>
                        <p className="text-gray-500">Concentration</p>
                        <p className="font-medium">{result.privateData.concentration}</p>
                      </div>
                    )}
                  </div>

                  {/* Course Grades */}
                  {result.privateData.grades && result.privateData.grades.length > 0 && (
                    <div className="mt-4">
                      <p className="text-gray-500 mb-2">Course Grades</p>
                      <div className="bg-white rounded border overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left text-gray-600">Course</th>
                              <th className="px-3 py-2 text-left text-gray-600">Name</th>
                              <th className="px-3 py-2 text-center text-gray-600">Credits</th>
                              <th className="px-3 py-2 text-center text-gray-600">Grade</th>
                              <th className="px-3 py-2 text-left text-gray-600">Semester</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {result.privateData.grades.map((grade, idx) => (
                              <tr key={idx}>
                                <td className="px-3 py-2 font-mono">{grade.courseCode}</td>
                                <td className="px-3 py-2">{grade.courseName}</td>
                                <td className="px-3 py-2 text-center">{grade.credits}</td>
                                <td className="px-3 py-2 text-center font-medium">{grade.grade}</td>
                                <td className="px-3 py-2">{grade.semester}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Transcript Details */}
                  {result.privateData.transcriptDetails && (
                    <div className="mt-4">
                      <p className="text-gray-500 mb-1">Transcript Details</p>
                      <p className="text-sm bg-white p-2 rounded border">{result.privateData.transcriptDetails}</p>
                    </div>
                  )}
                </div>
              )}

              {/* OFF-CHAIN DATA - Sensitive (if decrypted) */}
              {result.offChainData && result.offChainData.disciplinaryRecords && (
                <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    </div>
                    <h3 className="font-semibold text-gray-900">Sensitive Off-Chain Data</h3>
                    <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">Never on blockchain</span>
                  </div>
                  <p className="text-sm">{result.offChainData.disciplinaryRecords}</p>
                </div>
              )}

              {/* IPFS Reference */}
              {result.record.parsedMetadata?.cid && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-gray-500 text-xs">IPFS CID</p>
                  <p className="font-mono text-xs break-all">{result.record.parsedMetadata.cid}</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mt-8">
        <h3 className="font-semibold text-blue-900 mb-2">How Verification Works</h3>
        <ol className="text-blue-700 text-sm space-y-2">
          <li>1. Enter the record hash to verify basic credential information (public data)</li>
          <li>2. Public data (name, degree, program) is visible to everyone</li>
          <li>3. If you have the student's secret key, enter it to decrypt private data (grades, CWA)</li>
          <li>4. Any tampering with the original document will result in a different hash, causing verification to fail</li>
        </ol>
      </div>
    </div>
  )
}

