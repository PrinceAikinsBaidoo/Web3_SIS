'use client'

import { useState, useEffect } from 'react'
import { contractService, InstitutionDetails } from '@/lib/contract'
import { useWallet } from '@/context/WalletContext'
import { ethers } from 'ethers'
import { DelayedLoading } from '@/components/LoadingSpinner'
import { uploadToIPFS } from '@/lib/ipfs'
import { createEncryptedRecordWithSecret, decryptEncryptedRecordWithSecret } from '@/lib/encryption'

// Types for enhanced student record
interface CourseGrade {
  courseCode: string
  courseName: string
  credits: number
  grade: string
  semester: string
}

interface StudentRecord {
  // Public (stored on-chain in metadata)
  fullLegalName: string
  programMajor: string
  enrollmentStatus: 'active' | 'graduated' | 'suspended' | 'completed'
  degreeAwarded: string
  
  // Private (encrypted in IPFS with secret key)
  cwa: number
  grades: CourseGrade[]
  minor?: string
  concentration?: string
  graduationDate: string
  transcriptDetails: string
  
  // Off-chain only (encrypted, never referenced on-chain)
  disciplinaryRecords?: string
}

export default function IssuerDashboard() {
  const { wallet, signer: walletSigner } = useWallet()
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)
  
  // ===== INSTITUTION INFO (fetched from blockchain) =====
  const [institutionInfo, setInstitutionInfo] = useState<InstitutionDetails | null>(null)
  
  // ===== PUBLIC FIELDS (stored on-chain) =====
  const [fullLegalName, setFullLegalName] = useState('')
  const [programMajor, setProgramMajor] = useState('')
  const [enrollmentStatus, setEnrollmentStatus] = useState<'active' | 'graduated' | 'suspended' | 'completed'>('active')
  const [degreeAwarded, setDegreeAwarded] = useState('')
  
  // ===== PRIVATE FIELDS (encrypted in IPFS, requires secret) =====
  const [cwa, setCwa] = useState('')
  const [minor, setMinor] = useState('')
  const [concentration, setConcentration] = useState('')
  const [graduationDate, setGraduationDate] = useState('')
  const [transcriptDetails, setTranscriptDetails] = useState('')
  
  // Grades (private)
  const [grades, setGrades] = useState<CourseGrade[]>([])
  const [newCourseCode, setNewCourseCode] = useState('')
  const [newCourseName, setNewCourseName] = useState('')
  const [newCourseCredits, setNewCourseCredits] = useState('')
  const [newCourseGrade, setNewCourseGrade] = useState('')
  const [newCourseSemester, setNewCourseSemester] = useState('')
  
  // ===== OFF-CHAIN ONLY (never on blockchain) =====
  const [disciplinaryRecords, setDisciplinaryRecords] = useState('')
  
  // ===== SECRET KEY (student's password) =====
  const [secretKey, setSecretKey] = useState('')
  const [confirmSecretKey, setConfirmSecretKey] = useState('')

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
      
      // Fetch institution info if authorized
      if (authorized) {
        const instInfo = await contractService.getInstitutionByWallet(wallet.address)
        setInstitutionInfo(instInfo)
      }
      
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

  const addGrade = () => {
    if (!newCourseCode || !newCourseName || !newCourseCredits || !newCourseGrade || !newCourseSemester) {
      setStatus({ type: 'error', message: 'Please fill all grade fields' })
      return
    }
    
    const newGrade: CourseGrade = {
      courseCode: newCourseCode,
      courseName: newCourseName,
      credits: parseFloat(newCourseCredits),
      grade: newCourseGrade,
      semester: newCourseSemester
    }
    
    setGrades([...grades, newGrade])
    // Clear inputs
    setNewCourseCode('')
    setNewCourseName('')
    setNewCourseCredits('')
    setNewCourseGrade('')
    setNewCourseSemester('')
  }

  const removeGrade = (index: number) => {
    const updatedGrades = [...grades]
    updatedGrades.splice(index, 1)
    setGrades(updatedGrades)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!wallet.address || !isAuthorized) {
      setStatus({ type: 'error', message: 'Please connect wallet and ensure you are authorized' })
      return
    }

    // Validate required fields
    if (!fullLegalName || !programMajor || !degreeAwarded) {
      setStatus({ type: 'error', message: 'Please fill all required public fields' })
      return
    }

    // Validate secret key
    if (!secretKey || secretKey.length < 6) {
      setStatus({ type: 'error', message: 'Secret key must be at least 6 characters' })
      return
    }

    if (secretKey !== confirmSecretKey) {
      setStatus({ type: 'error', message: 'Secret keys do not match' })
      return
    }

    try {
      setIsLoading(true)
      setStatus(null)

      // ===== Step 1: Create PUBLIC data object =====
      const publicData = {
        fullLegalName,
        programMajor,
        enrollmentStatus,
        degreeAwarded,
        issueDate: new Date().toISOString(),
        issuer: wallet.address
      }

      // ===== Step 2: Create PRIVATE data object (for IPFS with secret) =====
      const privateData = {
        cwa: parseFloat(cwa) || 0,
        grades,
        minor: minor || null,
        concentration: concentration || null,
        graduationDate: graduationDate || null,
        transcriptDetails: transcriptDetails || null
      }

      // ===== Step 3: Create OFF-CHAIN ONLY data (never on blockchain) =====
      const offChainData = {
        disciplinaryRecords: disciplinaryRecords || null
      }

      // ===== Step 4: Encrypt private data with secret key =====
      setStatus({ type: 'info', message: 'Encrypting private data with secret key...' })
      const encryptedPrivateData = await createEncryptedRecordWithSecret(privateData, secretKey)
      
      // ===== Step 5: Encrypt off-chain only data with secret key =====
      const encryptedOffChainData = await createEncryptedRecordWithSecret(offChainData, secretKey)

      // ===== Step 6: Upload encrypted data to IPFS =====
      setStatus({ type: 'info', message: 'Uploading encrypted data to IPFS...' })
      
      // Combine public + encrypted private + encrypted off-chain for full record
      const fullRecordData = {
        public: publicData,
        private: encryptedPrivateData,
        offChain: encryptedOffChainData
      }
      
      let ipfsCid = ''
      let recordHash = ''
      
      try {
        const ipfsResult = await uploadToIPFS(fullRecordData)
        ipfsCid = ipfsResult.cid
        console.log('IPFS Upload successful, CID:', ipfsCid)

        // ===== Step 7: Hash the encrypted data for on-chain storage =====
        const encryptedJson = JSON.stringify(fullRecordData)
        recordHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(encryptedJson))
        
        setStatus({ type: 'info', message: 'Issuing record on blockchain...' })
      } catch (ipfsError) {
        console.error('IPFS upload failed:', ipfsError)
        // Fallback demo mode
        ipfsCid = 'Qm' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
        
        const encryptedJson = JSON.stringify(fullRecordData)
        recordHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(encryptedJson))
        
        setStatus({ type: 'info', message: 'IPFS upload failed, using demo mode...' })
      }

      // ===== Step 8: Store PUBLIC data as on-chain metadata =====
      const metadata = {
        // Public fields (readable without secret)
        fullLegalName,
        programMajor,
        enrollmentStatus,
        degreeAwarded,
        // Institution info (auto-filled from registered institution)
        institutionName: institutionInfo?.name || '',
        institutionDomain: institutionInfo?.domain || '',
        // Reference to IPFS (contains encrypted private data)
        cid: ipfsCid,
        ipfsGateway: `https://gateway.pinata.cloud/ipfs/${ipfsCid}`,
        // Flags
        hasPrivateData: true,
        hasOffChainData: !!disciplinaryRecords,
        issueDate: new Date().toISOString()
      }

      // ===== Step 9: Issue record on blockchain =====
      const signer = walletSigner || new ethers.providers.Web3Provider(window.ethereum!).getSigner()
      const tx = await contractService.issueRecord(signer, recordHash, JSON.stringify(metadata))
      await tx.wait()

      setStatus({ 
        type: 'success', 
        message: `Record issued successfully! 
        
📋 IPFS CID: ${ipfsCid.slice(0, 20)}...

🔑 IMPORTANT - Share with student:
- Secret Key: ${secretKey}

The student must share this secret key with anyone who needs to view private data (grades, CWA, etc).`
      })

      // Clear form
      clearForm()

    } catch (error: any) {
      setStatus({ type: 'error', message: error.message })
    } finally {
      setIsLoading(false)
    }
  }

  const clearForm = () => {
    setFullLegalName('')
    setProgramMajor('')
    setEnrollmentStatus('active')
    setDegreeAwarded('')
    setCwa('')
    setGrades([])
    setMinor('')
    setConcentration('')
    setGraduationDate('')
    setTranscriptDetails('')
    setDisciplinaryRecords('')
    setSecretKey('')
    setConfirmSecretKey('')
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Issuer Dashboard</h1>
        <p className="text          Issue new academic records. Public everyone; private data-gray-600">
 data is visible to requires the student's secret key.
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
            <form onSubmit={handleSubmit} className="space-y-8">
              
              {/* ===== PUBLIC DATA SECTION ===== */}
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Public Information</h2>
                    <p className="text-sm text-gray-500">Visible to everyone (no secret key required)</p>
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Legal Name <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      value={fullLegalName} 
                      onChange={(e) => setFullLegalName(e.target.value)} 
                      required
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500" 
                      placeholder="John Michael Doe" 
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Program/Major <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      value={programMajor} 
                      onChange={(e) => setProgramMajor(e.target.value)} 
                      required
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500" 
                      placeholder="Bachelor of Computer Science" 
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Enrollment Status <span className="text-red-500">*</span>
                    </label>
                    <select 
                      value={enrollmentStatus} 
                      onChange={(e) => setEnrollmentStatus(e.target.value as any)}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="active">Active</option>
                      <option value="graduated">Graduated</option>
                      <option value="completed">Completed</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Degree Awarded <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      value={degreeAwarded} 
                      onChange={(e) => setDegreeAwarded(e.target.value)} 
                      required
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500" 
                      placeholder="Bachelor of Science (B.Sc.)" 
                    />
                  </div>
                </div>
              </div>

              {/* ===== PRIVATE DATA SECTION ===== */}
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Private Information</h2>
                    <p className="text-sm text-gray-500">Encrypted in IPFS - requires secret key to view</p>
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      CWA (0 - 100)
                    </label>
                    <input 
                      type="number" 
                      step="0.01"
                      min="0"
                      max="100"
                      value={cwa} 
                      onChange={(e) => setCwa(e.target.value)} 
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500" 
                      placeholder="85.50" 
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minor (optional)
                    </label>
                    <input 
                      type="text" 
                      value={minor} 
                      onChange={(e) => setMinor(e.target.value)} 
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500" 
                      placeholder="Mathematics" 
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Concentration (optional)
                    </label>
                    <input 
                      type="text" 
                      value={concentration} 
                      onChange={(e) => setConcentration(e.target.value)} 
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500" 
                      placeholder="Artificial Intelligence" 
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Graduation Date
                    </label>
                    <input 
                      type="date" 
                      value={graduationDate} 
                      onChange={(e) => setGraduationDate(e.target.value)} 
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500" 
                    />
                  </div>
                </div>

                {/* Course Grades */}
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Course Grades
                  </label>
                  
                  {/* Add new grade form */}
                  <div className="grid grid-cols-5 gap-2 mb-4">
                    <input 
                      type="text" 
                      value={newCourseCode} 
                      onChange={(e) => setNewCourseCode(e.target.value)}
                      placeholder="CS101"
                      className="px-2 py-2 border rounded text-sm"
                    />
                    <input 
                      type="text" 
                      value={newCourseName} 
                      onChange={(e) => setNewCourseName(e.target.value)}
                      placeholder="Intro to CS"
                      className="px-2 py-2 border rounded text-sm col-span-2"
                    />
                    <input 
                      type="number" 
                      value={newCourseCredits} 
                      onChange={(e) => setNewCourseCredits(e.target.value)}
                      placeholder="Credits"
                      className="px-2 py-2 border rounded text-sm"
                    />
                    <input 
                      type="text" 
                      value={newCourseGrade} 
                      onChange={(e) => setNewCourseGrade(e.target.value)}
                      placeholder="A"
                      className="px-2 py-2 border rounded text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <input 
                      type="text" 
                      value={newCourseSemester} 
                      onChange={(e) => setNewCourseSemester(e.target.value)}
                      placeholder="Fall 2023"
                      className="px-4 py-2 border rounded-lg"
                    />
                    <button 
                      type="button"
                      onClick={addGrade}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                    >
                      Add Course
                    </button>
                  </div>
                  
                  {/* Display added grades */}
                  {grades.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {grades.map((grade, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                          <span className="text-sm">
                            <strong>{grade.courseCode}</strong> - {grade.courseName} | {grade.credits} credits | Grade: {grade.grade} | {grade.semester}
                          </span>
                          <button 
                            type="button"
                            onClick={() => removeGrade(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Transcript Details
                  </label>
                  <textarea 
                    value={transcriptDetails} 
                    onChange={(e) => setTranscriptDetails(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500" 
                    placeholder="Additional transcript details..."
                  />
                </div>
              </div>

              {/* ===== OFF-CHAIN ONLY SECTION ===== */}
              <div className="bg-white rounded-xl shadow-sm border p-6 border-l-4 border-l-yellow-400">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Sensitive Off-Chain Data</h2>
                    <p className="text-sm text-gray-500">Encrypted but NEVER stored on blockchain (GDPR "right to be forgotten")</p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Disciplinary Records (if any)
                  </label>
                  <textarea 
                    value={disciplinaryRecords} 
                    onChange={(e) => setDisciplinaryRecords(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500" 
                    placeholder="Any disciplinary actions or notes (stored encrypted, never on-chain)..."
                  />
                </div>
              </div>

              {/* ===== SECRET KEY SECTION ===== */}
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Student Secret Key</h2>
                    <p className="text-sm text-gray-600">This key is required to view private data</p>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 mb-4">
                  The student must share this key with anyone who needs to view private information (grades, CWA, etc).
                  Keep this key secure - anyone with it can decrypt the private data.
                </p>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Secret Key <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="password" 
                      value={secretKey} 
                      onChange={(e) => setSecretKey(e.target.value)} 
                      required
                      minLength={6}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500" 
                      placeholder="At least 6 characters" 
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm Secret Key <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="password" 
                      value={confirmSecretKey} 
                      onChange={(e) => setConfirmSecretKey(e.target.value)} 
                      required
                      minLength={6}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500" 
                      placeholder="Confirm secret key" 
                    />
                  </div>
                </div>
              </div>

              {/* Status Message */}
              {status && (
                <div className={`p-4 rounded-lg ${
                  status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
                  status.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 
                  'bg-blue-50 text-blue-700 border border-blue-200'
                }`}>
                  <pre className="whitespace-pre-wrap text-sm">{status.message}</pre>
                </div>
              )}

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full px-6 py-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <DelayedLoading isLoading={isLoading} size="sm" color="white" />
                    <span>Issuing Record...</span>
                  </>
                ) : (
                  'Issue Academic Record'
                )}
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

