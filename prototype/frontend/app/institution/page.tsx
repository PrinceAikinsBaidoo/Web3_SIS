'use client'

import { useState, useEffect } from 'react'
import { contractService, InstitutionDetails } from '@/lib/contract'
import { useWallet } from '@/context/WalletContext'
import { ethers } from 'ethers'

export default function InstitutionPage() {
  const { wallet, signer: walletSigner } = useWallet()
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null)
  /** True when InstitutionRegistry has no code on the wallet RPC (or MM/Hardhat URL mismatch). Not the same as “wallet never registered”. */
  const [deployBlocked, setDeployBlocked] = useState(false)
  const [isAccredited, setIsAccredited] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)
  const [institutionInfo, setInstitutionInfo] = useState<InstitutionDetails | null>(null)
  
  // Form state
  const [institutionName, setInstitutionName] = useState('')
  const [domain, setDomain] = useState('')
  const [accreditationId] = useState(() => 
    'ACC-' + Math.random().toString(36).substring(2, 8).toUpperCase() + '-' + Date.now().toString().slice(-4)
  )
  
  // Wallet to add
  const [walletToAdd, setWalletToAdd] = useState('')

  // Reset form to empty state when wallet disconnects or changes
  useEffect(() => {
    if (!wallet.isConnected) {
      // Clear form when wallet disconnects
      setInstitutionName('')
      setDomain('')
      setWalletToAdd('')
    }
  }, [wallet.isConnected])

  // Check registration when wallet changes
  useEffect(() => {
    if (wallet.isConnected && wallet.address) {
      checkRegistration()
    } else {
      setIsRegistered(null)
      setInstitutionInfo(null)
      setDeployBlocked(false)
    }
  }, [wallet.isConnected, wallet.address])

  const checkRegistration = async () => {
    if (!wallet.address) return
    
    try {
      setIsLoading(true)

      await contractService.ensureDeployAddressesLoaded()

      const registryAddr = contractService.getContractAddresses().institutionRegistry
      const probe = await contractService.probeInstitutionRegistry()

      if (!probe.walletSeesBytecode && probe.httpSeesBytecode) {
        setIsRegistered(false)
        setInstitutionInfo(null)
        setDeployBlocked(true)
        setStatus({
          type: 'error',
          message: `Contracts exist on Hardhat at ${registryAddr.slice(0, 10)}…${registryAddr.slice(-6)} (${probe.rpcUrlUsed}), but MetaMask did not return bytecode there. Open MetaMask → Networks → your Localhost network → set RPC URL exactly to ${probe.rpcUrlUsed} and chain ID 31337 (must match Hardhat). Then refresh.`,
        })
        return
      }

      if (!probe.walletSeesBytecode && !probe.httpSeesBytecode) {
        setIsRegistered(false)
        setInstitutionInfo(null)
        setDeployBlocked(true)
        const chainHint =
          probe.walletChainId != null && probe.walletChainId !== 31337
            ? ` Your wallet reports chain ID ${probe.walletChainId} (Hardhat local is 31337).`
            : ''
        setStatus({
          type: 'error',
          message: `No InstitutionRegistry bytecode at ${registryAddr.slice(0, 10)}…${registryAddr.slice(-6)} on ${probe.rpcUrlUsed}.${chainHint} Restarting Hardhat clears chain state — old addresses in contract-addresses.json no longer work. Leave npm run node running, then in another terminal: cd prototype && npm run deploy. Hard refresh this page.`,
        })
        return
      }

      setDeployBlocked(false)

      // Check if this wallet IS the institution (registered directly)
      const registered = await contractService.isInstitutionRegistered(wallet.address)
      setIsRegistered(registered)
      
      if (!registered) {
        setInstitutionInfo(null)
        return
      }

      // Do not let detail-fetch errors wipe "registered" — only the isRegistered call defines that
      try {
        const accredited = await contractService.isInstitutionAccredited(wallet.address)
        setIsAccredited(accredited)
        const info = await contractService.getInstitutionDetails(wallet.address)
        setInstitutionInfo(info)
      } catch (detailErr: any) {
        console.error('Error loading institution details:', detailErr)
        setInstitutionInfo(null)
      }
    } catch (error: any) {
      console.error('Error checking registration:', error)
      setIsRegistered(false)
      setInstitutionInfo(null)
      setDeployBlocked(false)
      const registryAddr = contractService.getContractAddresses().institutionRegistry
      const hint =
        error?.code === 'CALL_EXCEPTION'
          ? `Registry call failed at ${registryAddr.slice(0, 10)}…${registryAddr.slice(-6)}. Deploy contracts (cd prototype → npm run deploy), MetaMask → Localhost 8545 (chain 31337), then refresh.`
          : error?.message || 'Could not check registration.'
      setStatus({ type: 'error', message: hint })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!wallet.address) {
      setStatus({ type: 'error', message: 'Please connect wallet first' })
      return
    }

    if (!institutionName || !domain) {
      setStatus({ type: 'error', message: 'Please fill all fields' })
      return
    }

    try {
      setIsLoading(true)
      setStatus(null)

      await contractService.ensureDeployAddressesLoaded()

      const probe = await contractService.probeInstitutionRegistry()
      if (!probe.walletSeesBytecode) {
        setStatus({
          type: 'error',
          message:
            'InstitutionRegistry is not on this network yet (or MetaMask RPC does not match Hardhat). Deploy to the running node (cd prototype && npm run deploy), fix Localhost in MetaMask to http://127.0.0.1:8545 / chain 31337, then refresh.',
        })
        return
      }

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
      await checkRegistration()
      
      setInstitutionName('')
      setDomain('')
    } catch (error: any) {
      console.error('Registration error:', error)
      
      // Check if already registered - refresh and show dashboard
      if (error.message.includes('Already registered') || error.message.includes('already registered')) {
        setStatus({ type: 'info', message: 'You are already registered! Refreshing...' })
        await checkRegistration()
      } else if (error.message.includes('Domain already taken') || error.message.includes('domain')) {
        // If domain is taken, check if THIS wallet already owns an institution with that domain
        const alreadyRegistered = await contractService.isInstitutionRegistered(wallet.address)
        if (alreadyRegistered) {
          setStatus({ type: 'info', message: 'You are already registered! Refreshing...' })
          await checkRegistration()
        } else {
          setStatus({ type: 'error', message: 'This domain is already taken. Please use a different domain.' })
        }
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

      const tx = await contractService.selfAccredit(signer, accreditationId)
      await tx.wait()

      setStatus({ type: 'success', message: 'Institution self-accredited successfully!' })
      setIsAccredited(true)
    } catch (error: any) {
      setStatus({ type: 'error', message: error.message })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddWallet = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!wallet.address || !walletToAdd) {
      setStatus({ type: 'error', message: 'Please enter a wallet address' })
      return
    }

    try {
      setIsLoading(true)
      setStatus(null)

      const signer = walletSigner || new ethers.providers.Web3Provider(window.ethereum!).getSigner()

      const tx = await contractService.addAuthorizedWallet(signer, walletToAdd)
      await tx.wait()

      setStatus({ type: 'success', message: `Wallet ${walletToAdd.slice(0, 10)}... added successfully!` })
      setWalletToAdd('')
      
      // Refresh info
      await checkRegistration()
    } catch (error: any) {
      console.error('Error adding wallet:', error)
      if (error.message.includes('already authorized')) {
        setStatus({ type: 'error', message: 'This wallet is already authorized' })
      } else {
        setStatus({ type: 'error', message: error.message })
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Not connected
  if (!wallet.isConnected) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Institution Registration</h1>
          <p className="text-gray-600">
            Register your institution to become an authorized credential issuer
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Connect Your Wallet</h2>
          <p className="text-gray-600">
            Please connect your wallet to register your institution
          </p>
        </div>
      </div>
    )
  }

  // Loading
  if (isLoading && isRegistered === null) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Institution Registration</h1>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Checking registration status...</p>
        </div>
      </div>
    )
  }

  // Not registered - show registration form
  if (!isRegistered) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Institution Registration</h1>
          <p className="text-gray-600">
            Register your institution to become an authorized credential issuer
          </p>
        </div>

        {/* Wallet Status */}
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Connected Wallet</p>
              <p className="font-mono text-sm">{wallet.address.slice(0, 10)}...{wallet.address.slice(-8)}</p>
            </div>
            <div
              className={`px-4 py-2 rounded-full text-sm font-medium ${
                deployBlocked ? 'bg-amber-100 text-amber-800' : 'bg-yellow-100 text-yellow-700'
              }`}
            >
              {deployBlocked ? 'Local contracts missing' : '✗ Not Registered'}
            </div>
          </div>
        </div>

        {deployBlocked && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
            <p className="font-semibold text-amber-900 mb-2">Finish blockchain setup first</p>
            <p className="text-sm text-amber-900/90 mb-3">
              The UI is pointing at an InstitutionRegistry address from contract-addresses.json, but that address has no
              contract code on your RPC. That usually means Hardhat was restarted (chain wiped) or nothing was deployed
              yet — not that your institution was rejected.
            </p>
            <ol className="list-decimal list-inside text-sm space-y-1 text-amber-900/90">
              <li>
                Terminal 1: <code className="rounded bg-amber-100/80 px-1">cd prototype</code> then{' '}
                <code className="rounded bg-amber-100/80 px-1">npm run node</code> — leave it running.
              </li>
              <li>
                Terminal 2: <code className="rounded bg-amber-100/80 px-1">cd prototype</code> then{' '}
                <code className="rounded bg-amber-100/80 px-1">npm run deploy</code> — updates contract-addresses.json.
              </li>
              <li>MetaMask: Localhost / chain ID 31337, RPC URL http://127.0.0.1:8545 (same as the node).</li>
              <li>Hard refresh this app so it reloads addresses from the API.</li>
            </ol>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleRegister} className="bg-white rounded-xl shadow-sm border p-6" autoComplete="off">
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
                autoComplete="off"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
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
                autoComplete="off"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
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
            disabled={isLoading || deployBlocked}
            className="mt-6 w-full px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50"
          >
            {isLoading ? 'Registering...' : deployBlocked ? 'Fix setup above, then register' : 'Register Institution'}
          </button>
        </form>
      </div>
    )
  }

  // Registered - show info and actions
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Institution Dashboard</h1>
        <p className="text-gray-600">
          Manage your institution and authorized wallets
        </p>
      </div>

      {/* Wallet Status */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 mb-1">Connected Wallet</p>
            <p className="font-mono text-sm">{wallet.address.slice(0, 10)}...{wallet.address.slice(-8)}</p>
          </div>
          <div className="px-4 py-2 rounded-full text-sm font-medium bg-green-100 text-green-700">
            ✓ Registered
          </div>
        </div>
      </div>

      {/* Institution Details */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Institution Details</h2>
          <div className={`px-4 py-2 rounded-full text-sm font-medium ${
            isAccredited ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
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
            <div>
              <p className="text-sm text-gray-500">Accreditation ID</p>
              <p className="font-medium">{institutionInfo.accreditationId || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Authorized Wallets</p>
              <p className="font-medium">{institutionInfo.authorizedWallets?.length || 0}</p>
            </div>
          </div>
        )}

        {/* Self-Accredit Button */}
        {!isAccredited && (
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800 mb-3">
              In production, accreditation would be verified by an external authority. 
              For demo purposes, you can self-accredit.
            </p>
            <button
              onClick={handleAccredit}
              disabled={isLoading}
              className="px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 font-medium disabled:opacity-50"
            >
              {isLoading ? 'Processing...' : 'Self-Accredit (Demo)'}
            </button>
          </div>
        )}
      </div>

      {/* Add Authorized Wallet */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Add Authorized Wallets</h2>
        <p className="text-gray-600 mb-4">
          Add wallet addresses that can issue records on behalf of your institution
        </p>
        
        <form onSubmit={handleAddWallet} className="flex gap-4">
          <input
            type="text"
            value={walletToAdd}
            onChange={(e) => setWalletToAdd(e.target.value)}
            className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
            placeholder="0x..."
          />
          <button
            type="submit"
            disabled={isLoading || !walletToAdd}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50"
          >
            {isLoading ? 'Adding...' : 'Add Wallet'}
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

        {/* List authorized wallets */}
        {institutionInfo?.authorizedWallets && institutionInfo.authorizedWallets.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Authorized Wallets:</h3>
            <div className="space-y-2">
              {institutionInfo.authorizedWallets.map((w, i) => (
                <div key={i} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                  <span className="font-mono text-sm">{w.slice(0, 10)}...{w.slice(-8)}</span>
                  {w.toLowerCase() === wallet.address.toLowerCase() && (
                    <span className="text-xs text-gray-500">(Owner)</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 rounded-xl p-6">
        <h3 className="font-medium text-blue-900 mb-2">How to Issue Records:</h3>
        <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
          <li>Add wallet addresses that will issue records (or use your current wallet)</li>
          <li>Make sure the wallet is authorized (shown above)</li>
          <li>Go to the Issuer Dashboard to issue records</li>
        </ol>
        <a href="/issuer" className="inline-block mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Go to Issuer Dashboard
        </a>
      </div>
    </div>
  )
}

