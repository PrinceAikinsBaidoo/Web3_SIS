'use client'

import { useState, useEffect } from 'react'
import { contractService } from '@/lib/contract'
import { useWallet } from '@/context/WalletContext'
import { ethers } from 'ethers'
import { DelayedLoading } from '@/components/LoadingSpinner'

export default function InstitutionPage() {
  const { wallet, signer: walletSigner } = useWallet()
  const [isRegistered, setIsRegistered] = useState<boolean>(false)
  const [isAccredited, setIsAccredited] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isDelayedLoading, setIsDelayedLoading] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)
  const [institutionInfo, setInstitutionInfo] = useState<any>(null)
  
  // Form state for registration
  const [institutionName, setInstitutionName] = useState('')
  const [domain, setDomain] = useState('')
  // Accreditation ID is auto-generated
  const [accreditationId] = useState(() => 
    'ACC-' + Math.random().toString(36).substring(2, 8).toUpperCase() + '-' + Date.now().toString().slice(-4)
  )
  
  // Form state for adding wallet
  const [walletToAdd, setWalletToAdd] = useState('')
  const [isTransactionPending, setIsTransactionPending] = useState(false)
  const [transactionStep, setTransactionStep] = useState('')

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

  // Check registration when wallet connects
  useEffect(() => {
    if (wallet.isConnected && wallet.address) {
      checkRegistration(wallet.address)
    }
  }, [wallet.isConnected, wallet.address])

  const checkRegistration = async (address: string) => {
    try {
      const registered = await contractService.isInstitutionRegistered(address)
      setIsRegistered(registered)
      
      if (registered) {
        const accredited = await contractService.isInstitutionAccredited(address)
        setIsAccredited(accredited)
        
        const info = await contractService.getInstitutionInfo(address)
        setInstitutionInfo(info)
      }
    } catch (error: any) {
      console.error('Error checking registration:', error)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!wallet.address) {
      setStatus({ type: 'error', message: 'Please connect wallet first' })
      return
    }

    // Check if already registered
    if (isRegistered) {
      setStatus({ type: 'error', message: 'Your institution is already registered!' })
      return
    }

    try {
      setIsLoading(true)
      setStatus(null)

      // Use the signer from wallet context
      const signer = walletSigner || new ethers.providers.Web3Provider(window.ethereum!).getSigner()

      const tx = await contractService.registerInstitution(
        signer,
        institutionName,
        domain,
        accreditationId,
        JSON.stringify({ description: 'Academic institution' })
      )
      await tx.wait()

      setStatus({ type: 'success', message: 'Institution registered successfully!' })
      await checkRegistration(wallet.address)
      
      // Clear form
      setInstitutionName('')
      setDomain('')
    } catch (error: any) {
      // Handle already registered error
      if (error.message.includes('Already registered') || error.message.includes('already registered')) {
        setStatus({ type: 'error', message: 'Your institution is already registered!' })
      } else {
        setStatus({ type: 'error', message: error.message })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleAccredit = async () => {
    if (!wallet.address) {
      setStatus({ type: 'error', message: 'Please connect wallet first' })
      return
    }

    try {
      setIsLoading(true)
      setStatus(null)

      const signer = walletSigner || new ethers.providers.Web3Provider(window.ethereum!).getSigner()

      const tx = await contractService.selfAccredit(signer, accreditationId || 'SELF-ACCREDITED')
      await tx.wait()

      setStatus({ type: 'success', message: 'Institution self-accredited successfully!' })
      await checkRegistration(wallet.address)
    } catch (error: any) {
      setStatus({ type: 'error', message: error.message })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddWallet = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!wallet.address) {
      setStatus({ type: 'error', message: 'Please connect wallet first' })
      return
    }

    if (!walletToAdd) {
      setStatus({ type: 'error', message: 'Please enter a wallet address' })
      return
    }

    try {
      setIsLoading(true)
      setIsTransactionPending(true)
      setTransactionStep('Initiating transaction...')
      setStatus(null)

      const signer = walletSigner || new ethers.providers.Web3Provider(window.ethereum!).getSigner()

      // Check if wallet is already authorized
      const isAlreadyAuthorized = await contractService.isWalletAuthorized(wallet.address, walletToAdd)
      
      if (isAlreadyAuthorized) {
        setStatus({ type: 'error', message: 'This wallet is already authorized for your institution' })
        setIsTransactionPending(false)
        setIsLoading(false)
        return
      }

      setTransactionStep('Waiting for MetaMask confirmation...')
      const tx = await contractService.addAuthorizedWallet(signer, walletToAdd)
      
      setTransactionStep('Transaction submitted. Waiting for confirmation...')
      await tx.wait()

      setStatus({ type: 'success', message: `Wallet ${walletToAdd.slice(0, 10)}... added successfully!` })
      setWalletToAdd('')
    } catch (error: any) {
      console.error('Error adding wallet:', error)
      if (error.message.includes('Wallet already authorized')) {
        setStatus({ type: 'error', message: 'This wallet is already authorized for your institution' })
      } else {
        setStatus({ type: 'error', message: error.message })
      }
    } finally {
      setIsLoading(false)
      setIsTransactionPending(false)
      setTransactionStep('')
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Institution Registration</h1>
        <p className="text-gray-600">
          Register your institution to become an authorized credential issuer on the blockchain.
        </p>
      </div>

      {/* Connection Status - Now handled by Navbar */}
      {!wallet.isConnected ? (
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Connect Your Institution Wallet</h2>
          <p className="text-gray-600 mb-6">
            Please connect your wallet using the button in the navigation bar to register your institution.
          </p>
        </div>
      ) : (
        <>
          {/* Wallet Connected */}
          <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Connected Wallet</p>
                <p className="font-mono text-sm">{wallet.address.slice(0, 10)}...{wallet.address.slice(-8)}</p>
              </div>
              <div className={`px-4 py-2 rounded-full text-sm font-medium ${
                isRegistered 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-yellow-100 text-yellow-700'
              }`}>
                {isRegistered ? '✓ Registered' : '✗ Not Registered'}
              </div>
            </div>
          </div>

          {/* Registration Form */}
          {!isRegistered ? (
            <form onSubmit={handleRegister} className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Register Institution</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Institution Name
                  </label>
                  <input
                    type="text"
                    value={institutionName}
                    onChange={(e) => setInstitutionName(e.target.value)}
                    required
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="University of Example"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Official Domain
                  </label>
                  <input
                    type="text"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    required
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="university.edu"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Accreditation ID (Auto-generated)
                  </label>
                  <input
                    type="text"
                    value={accreditationId}
                    readOnly
                    className="w-full px-4 py-2 border rounded-lg bg-gray-50 text-gray-600"
                  />
                </div>
              </div>

              {/* Status Message */}
              {status && (
                <div className={`mt-6 p-4 rounded-lg ${
                  status.type === 'success' ? 'bg-green-50 text-green-700' :
                  status.type === 'error' ? 'bg-red-50 text-red-700' :
                  'bg-blue-50 text-blue-700'
                }`}>
                  {status.message}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="mt-6 w-full px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <DelayedLoading isLoading={isLoading} size="sm" color="white" />
                    <span>Registering...</span>
                  </>
                ) : (
                  'Register Institution'
                )}
              </button>
            </form>
          ) : (
            <>
              {/* Institution Registered - Show Info & Actions */}
              <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">Institution Details</h2>
                  <div className={`px-4 py-2 rounded-full text-sm font-medium ${
                    isAccredited 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {isAccredited ? '✓ Accredited' : '✗ Not Accredited'}
                  </div>
                </div>
                
                {institutionInfo && (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Name</p>
                      <p className="font-medium">{institutionInfo.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Domain</p>
                      <p className="font-medium">{institutionInfo.domain}</p>
                    </div>
                  </div>
                )}

                {/* Self-Accredit Button */}
                {!isAccredited && (
                  <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="font-medium text-yellow-800">Self-Accreditation (Demo Mode)</p>
                        <p className="text-sm text-yellow-700 mt-1">
                          In a production system, accreditation would be verified by an external accreditation authority 
                          (e.g., government education ministry, regional accrediting body). 
                          This demo allows self-accreditation for testing purposes.
                        </p>
                        <button
                          onClick={handleAccredit}
                          disabled={isLoading}
                          className="mt-4 px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
                        >
                          {isLoading ? (
                            <>
                              <DelayedLoading isLoading={isLoading} size="sm" color="white" />
                              <span>Processing...</span>
                            </>
                          ) : (
                            'Self-Accredit (Demo)'
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Add Authorized Wallet */}
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Add Authorized Wallets</h2>
                <p className="text-gray-600 mb-4">
                  Add wallet addresses that are authorized to issue academic records on behalf of your institution.
                </p>
                
                {/* Transaction Pending Status */}
                {isTransactionPending && (
                  <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                      <span className="text-blue-700 font-medium">{transactionStep}</span>
                    </div>
                  </div>
                )}
                
                <form onSubmit={handleAddWallet} className="flex gap-4">
                  <input
                    type="text"
                    value={walletToAdd}
                    onChange={(e) => setWalletToAdd(e.target.value)}
                    disabled={isTransactionPending}
                    className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100"
                    placeholder="0x..."
                  />
                  <button
                    type="submit"
                    disabled={isLoading || isTransactionPending || !walletToAdd}
                    className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
                  >
                    {isTransactionPending ? (
                      <>
                        <DelayedLoading isLoading={isTransactionPending} size="sm" color="white" />
                        <span>Adding...</span>
                      </>
                    ) : (
                      'Add Wallet'
                    )}
                  </button>
                </form>

                {status && (
                  <div className={`mt-4 p-4 rounded-lg ${
                    status.type === 'success' ? 'bg-green-50 text-green-700' :
                    status.type === 'error' ? 'bg-red-50 text-red-700' :
                    'bg-blue-50 text-blue-700'
                  }`}>
                    {status.message}
                  </div>
                )}

                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-medium text-blue-900 mb-2">How to Issue Records:</h3>
                  <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
                    <li>Add wallet addresses that will issue records</li>
                    <li>Use MetaMask to switch to an authorized wallet</li>
                    <li>Go to the Issuer Dashboard to issue records</li>
                  </ol>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

