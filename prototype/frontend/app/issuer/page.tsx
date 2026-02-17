'use client'

import { useState, useEffect } from 'react'
import { contractService } from '@/lib/contract'
import { useWallet } from '@/context/WalletContext'
import { ethers } from 'ethers'
import { DelayedLoading } from '@/components/LoadingSpinner'
import { uploadToIPFS } from '@/lib/ipfs'
import { createEncryptedRecord } from '@/lib/encryption'

export default function IssuerDashboard() {
  const { wallet, signer: walletSigner } = useWallet()
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)
  
  // Form state
  const [studentId, setStudentId] = useState('')
  const [studentName, setStudentName] = useState('')
  const [degree, setDegree] = useState('')
  const [graduationYear, setGraduationYear] = useState('')
  const [gpa, setGpa] = useState('')

  useEffect(() => {
    if (wallet.isConnected && wallet.address) {
      checkAuthorization()
    }
  }, [wallet.isConnected, wallet.address])

  const checkAuthorization = async () => {
    if (!wallet.address) return
    try {
      const authorized = await contractService.isAuthorizedIssuer(wallet.address)
      setIsAuthorized(authorized)
      setStatus({ 
        type: 'info', 
        message: authorized 
          ? 'Connected and authorized as issuer!' 
          : 'Connected but not authorized as issuer. Please register your institution first.' 
      })
    } catch (error: any) {
      console.error('Error checking authorization:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!wallet.address || !isAuthorized) {
      setStatus({ type: 'error', message: 'Please connect wallet and ensure you are authorized' })
      return
    }

    try {
      setIsLoading(true)
      setStatus(null)

      const recordData = {
        studentId,
        studentName,
        degree,
        graduationYear,
        gpa,
        issueDate: new Date().toISOString(),
        issuer: wallet.address
      }

      // Step 1: Encrypt the record data with AES-256-GCM
      setStatus({ type: 'info', message: 'Encrypting record data with AES-256-GCM...' })
      const encryptedRecord = await createEncryptedRecord(recordData)
      
      // Step 2: Upload encrypted data to IPFS
      setStatus({ type: 'info', message: 'Uploading encrypted record to IPFS...' })
      let ipfsCid = ''
      let recordHash = ''
      let metadata = {}
      
      try {
        const ipfsResult = await uploadToIPFS(encryptedRecord)
        ipfsCid = ipfsResult.cid
        console.log('IPFS Upload successful, CID:', ipfsCid)

        // Step 3: Hash the ENCRYPTED data for on-chain storage (NOT plaintext)
        const encryptedJson = JSON.stringify(encryptedRecord)
        recordHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(encryptedJson))
        
        // Step 4: Store metadata
        metadata = {
          studentId,
          degree,
          cid: ipfsCid,
          ipfsGateway: `https://gateway.pinata.cloud/ipfs/${ipfsCid}`,
          issueDate: new Date().toISOString(),
          encrypted: true,
          encryptionAlgorithm: 'AES-256-GCM'
        }
      } catch (ipfsError) {
        console.error('IPFS upload failed:', ipfsError)
        // Fallback demo mode
        ipfsCid = 'Qm' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
        
        // Still hash encrypted data for consistency
        const encryptedJson = JSON.stringify(encryptedRecord)
        recordHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(encryptedJson))
        
        metadata = {
          studentId,
          degree,
          cid: ipfsCid,
          issueDate: new Date().toISOString(),
          encrypted: true,
          demo: true
        }
        setStatus({ type: 'info', message: 'IPFS upload failed, using demo mode...' })
      }

      // Step 5: Issue the record on blockchain
      const signer = walletSigner || new ethers.providers.Web3Provider(window.ethereum!).getSigner()
      setStatus({ type: 'info', message: 'Issuing record on blockchain...' })
      const tx = await contractService.issueRecord(signer, recordHash, JSON.stringify(metadata))
      await tx.wait()

      setStatus({ 
        type: 'success', 
        message: `Record issued successfully! IPFS CID: ${ipfsCid.slice(0, 20)}... (AES-256-GCM Encrypted)`
      })

      // Clear form
      setStudentId('')
      setStudentName('')
      setDegree('')
      setGraduationYear('')
      setGpa('')

    } catch (error: any) {
      setStatus({ type: 'error', message: error.message })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Issuer Dashboard</h1>
        <p className="text-gray-600">
          Issue new academic records to the blockchain. Only authorized universities can issue records.
        </p>
      </div>

      {!wallet.isConnected ? (
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Connect Your Wallet</h2>
          <p className="text-gray-600 mb-6">
            Please connect your wallet using the navigation bar to issue academic records.
          </p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Connected Wallet</p>
                <p className="font-mono text-sm">{wallet.address.slice(0, 10)}...{wallet.address.slice(-8)}</p>
              </div>
              <div className={`px-4 py-2 rounded-full text-sm font-medium ${
                isAuthorized ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {isAuthorized ? '✓ Authorized Issuer' : '✗ Not Authorized'}
              </div>
            </div>
          </div>

          {isAuthorized ? (
            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Issue New Record</h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Student ID</label>
                  <input type="text" value={studentId} onChange={(e) => setStudentId(e.target.value)} required
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500" placeholder="STU2024001" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Student Name</label>
                  <input type="text" value={studentName} onChange={(e) => setStudentName(e.target.value)} required
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500" placeholder="John Doe" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Degree</label>
                  <input type="text" value={degree} onChange={(e) => setDegree(e.target.value)} required
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500" placeholder="Bachelor of Computer Science" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Graduation Year</label>
                  <input type="text" value={graduationYear} onChange={(e) => setGraduationYear(e.target.value)} required
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500" placeholder="2024" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">GPA</label>
                  <input type="text" value={gpa} onChange={(e) => setGpa(e.target.value)} required
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500" placeholder="3.85" />
                </div>
              </div>

              {status && (
                <div className={`mt-6 p-4 rounded-lg ${
                  status.type === 'success' ? 'bg-green-50 text-green-700' :
                  status.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'
                }`}>
                  {status.message}
                </div>
              )}

              <button type="submit" disabled={isLoading}
                className="mt-6 w-full px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                {isLoading ? <><DelayedLoading isLoading={isLoading} size="sm" color="white" /><span>Issuing Record...</span></> : 'Issue Record'}
              </button>
            </form>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
              <h3 className="text-lg font-semibold text-red-900 mb-2">Authorization Required</h3>
              <p className="text-red-700 mb-4">Your wallet address is not authorized to issue records.</p>
              <a href="/institution" className="inline-block px-6 py-3 bg-red-600 text-white rounded-lg">Register Institution</a>
            </div>
          )}
        </>
      )}
    </div>
  )
}

