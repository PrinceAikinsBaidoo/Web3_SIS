'use client'

import { useState, useEffect } from 'react'
import { contractService } from '@/lib/contract'
import { uploadToIPFS } from '@/lib/ipfs'
import { createEncryptedRecordWithSecret } from '@/lib/encryption'
import { useWallet } from '@/context/WalletContext'
import { ethers } from 'ethers'

// Types for course grades
interface CourseGrade {
  courseCode: string
  courseName: string
  credits: number
  grade: string
  semester: string
}

// Types for credential
interface CredentialType {
  id: string
  label: string
}

const CREDENTIAL_TYPES: CredentialType[] = [
  { id: 'degree', label: 'Degree' },
  { id: 'diploma', label: 'Diploma' },
  { id: 'transcript', label: 'Transcript' },
  { id: 'badge', label: 'Digital Badge' },
  { id: 'certificate', label: 'Certificate' },
  { id: 'achievement', label: 'Achievement' }
]

export default function IssuerDashboard() {
  const { wallet, signer: walletSigner } = useWallet()
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string; ipfsCid?: string } | null>(null)
  
  // Institution info
  const [institutionName, setInstitutionName] = useState('')
  const [institutionDomain, setInstitutionDomain] = useState('')
  
  // ==================== PUBLIC FIELDS (Stored on-chain) ====================
  // Credential ID / Certificate Serial Number
  const [credentialId, setCredentialId] = useState('')
  // Credential Type
  const [credentialType, setCredentialType] = useState('degree')
  // Full Legal Name
  const [fullLegalName, setFullLegalName] = useState('')
  // Program/Major
  const [programMajor, setProgramMajor] = useState('')
  // Graduation Year
  const [graduationYear, setGraduationYear] = useState('')
  // Issue Date (auto-filled)
  const [issueDate, setIssueDate] = useState('')
  // Enrollment Status
  const [enrollmentStatus, setEnrollmentStatus] = useState<'active' | 'graduated' | 'suspended' | 'completed'>('active')
  // Degree Awarded
  const [degreeAwarded, setDegreeAwarded] = useState('')

  // ==================== PRIVATE FIELDS (Stored in IPFS, require secret key) ====================
  // Student ID / Index Number
  const [studentId, setStudentId] = useState('')
  // Date of Birth
  const [dateOfBirth, setDateOfBirth] = useState('')
  // Email
  const [email, setEmail] = useState('')
  // CWA / GPA
  const [cwa, setCwa] = useState('')
  // Internal Remarks
  const [internalRemarks, setInternalRemarks] = useState('')
  
  // Course Grades (array)
  const [courseGrades, setCourseGrades] = useState<CourseGrade[]>([])
  const [newCourse, setNewCourse] = useState<CourseGrade>({
    courseCode: '',
    courseName: '',
    credits: 0,
    grade: '',
    semester: ''
  })

  // Secret Key
  const [secretKey, setSecretKey] = useState('')
  const [confirmSecretKey, setConfirmSecretKey] = useState('')

  // Set default issue date
  useEffect(() => {
    setIssueDate(new Date().toISOString().split('T')[0])
  }, [])

  // Check authorization when wallet connects
  useEffect(() => {
    if (wallet.isConnected && wallet.address) {
      checkAuthorization()
    } else {
      setIsAuthorized(null)
    }
  }, [wallet.isConnected, wallet.address])

  const checkAuthorization = async () => {
    if (!wallet.address) return
    
    try {
      setIsLoading(true)
      const authorized = await contractService.isAuthorizedIssuer(wallet.address)
      setIsAuthorized(authorized)
      
      if (authorized) {
        // Try to get institution info
        try {
          // First, try to find institution by authorized wallet
          let instInfo = await contractService.getInstitutionByWallet(wallet.address)
          
          // If not found, check if this wallet IS the institution owner
          if (!instInfo) {
            const isOwnerRegistered = await contractService.isInstitutionRegistered(wallet.address)
            if (isOwnerRegistered) {
              instInfo = await contractService.getInstitutionDetails(wallet.address)
            }
          }
          
          if (instInfo) {
            setInstitutionName(instInfo.name)
            setInstitutionDomain(instInfo.domain)
          }
        } catch (e) {
          console.log('Could not fetch institution info')
        }
      }
    } catch (error) {
      console.error('Error checking authorization:', error)
      setIsAuthorized(false)
    } finally {
      setIsLoading(false)
    }
  }

  // Add a course grade
  const addCourseGrade = () => {
    if (newCourse.courseCode && newCourse.courseName && newCourse.grade) {
      setCourseGrades([...courseGrades, newCourse])
      setNewCourse({
        courseCode: '',
        courseName: '',
        credits: 0,
        grade: '',
        semester: ''
      })
    }
  }

  // Remove a course grade
  const removeCourseGrade = (index: number) => {
    setCourseGrades(courseGrades.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!wallet.address || !isAuthorized) {
      setStatus({ type: 'error', message: 'Please connect wallet and ensure you are authorized' })
      return
    }

    // Validate required public fields
    if (!credentialId || !fullLegalName || !programMajor || !graduationYear || !degreeAwarded) {
      setStatus({ type: 'error', message: 'Please fill all required public fields' })
      return
    }

    // Validate private fields (at least student ID or email)
    if (!studentId && !email) {
      setStatus({ type: 'error', message: 'Please provide at least Student ID or Email' })
      return
    }

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

      // ==================== Create Public Metadata (stored on-chain) ====================
      const publicMetadata = {
        // Public fields
        credentialId,
        credentialType,
        fullLegalName,
        programMajor,
        graduationYear,
        issueDate: issueDate || new Date().toISOString().split('T')[0],
        enrollmentStatus,
        degreeAwarded,
        issuer: wallet.address,
        institutionName: institutionName || 'Unknown Institution',
        institutionDomain: institutionDomain || '',
        // Validity status
        isValid: true,
        // Note: IPFS CID will be added after upload
      }

      // ==================== Create Private Data (stored in IPFS, encrypted) ====================
      // Format private data to match what the verifier expects
      // The verifier expects: { private: { encryptedData, iv, salt }, offChain: { encryptedData, iv, salt } }
      
      const privateDataPayload = {
        // Student identification
        studentId: studentId || null,
        dateOfBirth: dateOfBirth || null,
        email: email || null,
        // Academic details
        cwa: cwa ? parseFloat(cwa) : null,
        grades: courseGrades.length > 0 ? courseGrades : null,
        minor: null,
        concentration: null,
        graduationDate: graduationYear ? `Year ${graduationYear}` : null,
        transcriptDetails: internalRemarks || null,
        // Reference to public data
        credentialId,
        issueDate: issueDate || new Date().toISOString().split('T')[0],
      }

      // Encrypt the private data with the secret key
      const encryptedPrivate = await createEncryptedRecordWithSecret(privateDataPayload, secretKey)
      
      // Format for IPFS storage (verifier expects this structure)
      const ipfsData = {
        public: {
          credentialId,
          credentialType,
          fullLegalName,
          programMajor,
          degreeAwarded,
          graduationYear,
          enrollmentStatus,
          issuer: wallet.address,
          institutionName: institutionName || 'Unknown Institution',
        },
        private: encryptedPrivate,
        offChain: null // No off-chain data for now
      }

      // ==================== Upload Encrypted Data to IPFS ====================
      let ipfsCid = ''
      try {
        const ipfsResult = await uploadToIPFS(ipfsData)
        ipfsCid = ipfsResult.cid
        console.log('IPFS Upload Result:', ipfsResult)
      } catch (ipfsError) {
        console.error('IPFS Upload Error:', ipfsError)
        setStatus({ type: 'error', message: 'Failed to upload to IPFS. Please check your IPFS configuration.' })
        setIsLoading(false)
        return
      }

      // Add IPFS CID to public metadata
      const fullMetadata = {
        ...publicMetadata,
        ipfsCid, // This links to the private data in IPFS
        ipfsGateway: 'https://gateway.pinata.cloud/ipfs/'
      }

      // ==================== Create Hash for the Record ====================
      const recordDataString = JSON.stringify({
        ...publicMetadata,
        ipfsCid
      })
      const recordHash = ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes(recordDataString + Date.now().toString())
      )

      // ==================== Issue on Blockchain ====================
      const signer = walletSigner || new ethers.providers.Web3Provider(window.ethereum!).getSigner()
      const tx = await contractService.issueRecord(signer, recordHash, JSON.stringify(fullMetadata))
      const receipt = await tx.wait()

      setStatus({ 
        type: 'success', 
        message: `Record issued successfully!

=== PUBLIC INFORMATION ===
Credential ID: ${credentialId}
Credential Type: ${credentialType}
Student Name: ${fullLegalName}
Program: ${programMajor}
Degree: ${degreeAwarded}
Graduation Year: ${graduationYear}
Issue Date: ${issueDate}
Status: ${enrollmentStatus}
Institution: ${institutionName || 'Unknown Institution'}

=== PRIVATE DATA (Share with Student) ===
IPFS CID: ${ipfsCid}
Secret Key: ${secretKey}

=== VERIFICATION ===
Record Hash: ${recordHash.slice(0, 20)}...
Tx Hash: ${receipt.transactionHash.slice(0, 20)}...

The student can view private details using their Student ID/Email and the secret key.`,
        ipfsCid: ipfsCid
      })

      // Clear form
      setCredentialId('')
      setCredentialType('degree')
      setFullLegalName('')
      setProgramMajor('')
      setGraduationYear('')
      setEnrollmentStatus('active')
      setDegreeAwarded('')
      setStudentId('')
      setDateOfBirth('')
      setEmail('')
      setCwa('')
      setInternalRemarks('')
      setCourseGrades([])
      setSecretKey('')
      setConfirmSecretKey('')

    } catch (error: any) {
      console.error('Error issuing record:', error)
      setStatus({ type: 'error', message: error.message || 'Failed to issue record' })
    } finally {
      setIsLoading(false)
    }
  }

  // Not connected
  if (!wallet.isConnected) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Issuer Dashboard</h1>
          <p className="text-gray-600">Issue new academic records on the blockchain</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Connect Your Wallet</h2>
          <p className="text-gray-600">
            Please connect your wallet to issue academic records
          </p>
        </div>
      </div>
    )
  }

  // Loading
  if (isLoading && isAuthorized === null) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Issuer Dashboard</h1>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authorization...</p>
        </div>
      </div>
    )
  }

  // Not authorized
  if (!isAuthorized) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Issuer Dashboard</h1>
          <p className="text-gray-600">Issue new academic records on the blockchain</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Connected Wallet</p>
              <p className="font-mono text-sm">{wallet.address.slice(0, 10)}...{wallet.address.slice(-8)}</p>
            </div>
            <div className="px-4 py-2 rounded-full text-sm font-medium bg-red-100 text-red-700">
              ✗ Not Authorized
            </div>
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <h3 className="text-lg font-semibold text-red-900 mb-2">Authorization Required</h3>
          <p className="text-red-700 mb-4">
            Your wallet is not authorized to issue records. Please register your institution first.
          </p>
          <a href="/institution" className="inline-block px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700">
            Go to Institution Registration
          </a>
        </div>
      </div>
    )
  }

  // Authorized - show form
  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Issuer Dashboard</h1>
        <p className="text-gray-600">Issue new academic records on the blockchain</p>
      </div>

      {/* Status */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 mb-1">Connected Wallet</p>
            <p className="font-mono text-sm">{wallet.address.slice(0, 10)}...{wallet.address.slice(-8)}</p>
            {institutionName && (
              <p className="text-sm text-gray-600 mt-1">Institution: {institutionName}</p>
            )}
          </div>
          <div className="px-4 py-2 rounded-full text-sm font-medium bg-green-100 text-green-700">
            ✓ Authorized Issuer
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* ==================== PUBLICLY VIEWABLE INFORMATION ==================== */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center gap-2 mb-6">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-xl font-semibold text-gray-900">Public Information (On-Chain)</h2>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Publicly Viewable</span>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Credential ID / Serial # <span className="text-red-500">*</span>
              </label>
              <input 
                type="text" 
                value={credentialId} 
                onChange={(e) => setCredentialId(e.target.value)} 
                required
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500" 
                placeholder="e.g., CERT-2024-001234" 
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Credential Type <span className="text-red-500">*</span>
              </label>
              <select 
                value={credentialType} 
                onChange={(e) => setCredentialType(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                {CREDENTIAL_TYPES.map(type => (
                  <option key={type.id} value={type.id}>{type.label}</option>
                ))}
              </select>
            </div>
            
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
                placeholder="John Doe" 
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Program / Major <span className="text-red-500">*</span>
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
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Graduation Year <span className="text-red-500">*</span>
              </label>
              <input 
                type="text" 
                value={graduationYear} 
                onChange={(e) => setGraduationYear(e.target.value)} 
                required
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500" 
                placeholder="2024" 
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Issue Date
              </label>
              <input 
                type="date" 
                value={issueDate} 
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500" 
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
          </div>
        </div>

        {/* ==================== PRIVATE INFORMATION (IPFS) ==================== */}
        <div className="bg-purple-50 rounded-xl border border-purple-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <h2 className="text-xl font-semibold text-gray-900">Private Information (IPFS + Secret Key)</h2>
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">Requires Secret Key</span>
          </div>
          
          <p className="text-sm text-gray-600 mb-6">
            This data is stored in IPFS and requires a secret key to access. Only the student can view these details.
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Student ID / Index Number
              </label>
              <input 
                type="text" 
                value={studentId} 
                onChange={(e) => setStudentId(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500" 
                placeholder="e.g., STU-2024-001" 
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date of Birth
              </label>
              <input 
                type="date" 
                value={dateOfBirth} 
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500" 
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500" 
                placeholder="student@university.edu" 
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CWA
              </label>
              <input 
                type="text" 
                value={cwa} 
                onChange={(e) => setCwa(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500" 
                placeholder="e.g., 3.85" 
              />
            </div>
            
          </div>

          {/* Course Grades Section */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Course Grades
            </label>
            
            {/* Add new course form */}
            <div className="bg-white rounded-lg border p-4 mb-4">
              <p className="text-sm font-medium text-gray-700 mb-3">Add Course Grade</p>
              <div className="grid md:grid-cols-5 gap-3">
                <input 
                  type="text" 
                  value={newCourse.courseCode} 
                  onChange={(e) => setNewCourse({...newCourse, courseCode: e.target.value})}
                  placeholder="Course Code"
                  className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 text-sm" 
                />
                <input 
                  type="text" 
                  value={newCourse.courseName} 
                  onChange={(e) => setNewCourse({...newCourse, courseName: e.target.value})}
                  placeholder="Course Name"
                  className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 text-sm" 
                />
                <input 
                  type="number" 
                  value={newCourse.credits || ''} 
                  onChange={(e) => setNewCourse({...newCourse, credits: parseInt(e.target.value) || 0})}
                  placeholder="Credits"
                  className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 text-sm" 
                />
                <input 
                  type="text" 
                  value={newCourse.grade} 
                  onChange={(e) => setNewCourse({...newCourse, grade: e.target.value})}
                  placeholder="Grade"
                  className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 text-sm" 
                />
                <input 
                  type="text" 
                  value={newCourse.semester} 
                  onChange={(e) => setNewCourse({...newCourse, semester: e.target.value})}
                  placeholder="Semester"
                  className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 text-sm" 
                />
              </div>
              <button 
                type="button"
                onClick={addCourseGrade}
                className="mt-3 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
              >
                Add Course
              </button>
            </div>

            {/* Course grades list */}
            {courseGrades.length > 0 && (
              <div className="space-y-2">
                {courseGrades.map((course, index) => (
                  <div key={index} className="flex items-center justify-between bg-white rounded-lg border p-3">
                    <div className="flex-1 grid grid-cols-5 gap-2 text-sm">
                      <span className="font-medium">{course.courseCode}</span>
                      <span className="col-span-2">{course.courseName}</span>
                      <span>{course.credits} cr</span>
                      <span className="font-medium text-purple-600">{course.grade}</span>
                    </div>
                    <button 
                      type="button"
                      onClick={() => removeCourseGrade(index)}
                      className="ml-3 text-red-500 hover:text-red-700"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Internal Remarks */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Internal Remarks
            </label>
            <textarea 
              value={internalRemarks} 
              onChange={(e) => setInternalRemarks(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500" 
              placeholder="Any internal notes or remarks (not visible to student)..."
            />
          </div>
        </div>

        {/* Secret Key Section */}
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            <h2 className="text-xl font-semibold text-gray-900">Student Secret Key</h2>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            This key is required to view private data. Share it with the student securely.
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
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" 
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
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" 
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
            <pre className="whitespace-pre-wrap text-sm font-mono">{status.message}</pre>
            {status.ipfsCid && (
              <div className="mt-4 pt-4 border-t border-green-200">
                <p className="text-sm font-medium">IPFS Gateway URL:</p>
                <a 
                  href={`https://gateway.pinata.cloud/ipfs/${status.ipfsCid}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline break-all"
                >
                  https://gateway.pinata.cloud/ipfs/{status.ipfsCid}
                </a>
              </div>
            )}
          </div>
        )}

        <button 
          type="submit" 
          disabled={isLoading}
          className="w-full px-6 py-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50"
        >
          {isLoading ? 'Issuing Record...' : 'Issue Academic Record'}
        </button>
      </form>
    </div>
  )
}

