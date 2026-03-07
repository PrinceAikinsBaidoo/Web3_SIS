'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { ethers } from 'ethers'
import { contractService } from '@/lib/contract'

interface WalletState {
  address: string
  isConnected: boolean
  isConnecting: boolean
  chainId: number | null
}

interface WalletContextType {
  wallet: WalletState
  connectWallet: () => Promise<void>
  disconnectWallet: () => void
  signer: ethers.Signer | null
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

const STORAGE_KEY = 'wallet_address'

// Hardhat chain ID (31337) - adjust for other networks
const SUPPORTED_CHAIN_IDS = [31337, 11155111, 1] // Hardhat, Sepolia, Mainnet

// Default RPC URL for read operations (must match Hardhat node port)
const DEFAULT_RPC_URL = 'http://127.0.0.1:8545'

export function WalletProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<WalletState>({
    address: '',
    isConnected: false,
    isConnecting: false,
    chainId: null
  })
  const [signer, setSigner] = useState<ethers.Signer | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // Validate network connection
  const validateNetwork = async (provider: ethers.providers.Web3Provider): Promise<boolean> => {
    try {
      const network = await provider.getNetwork()
      const chainId = network.chainId
      
      // Check if connected to a supported network
      if (chainId && SUPPORTED_CHAIN_IDS.includes(Number(chainId))) {
        setWallet(prev => ({ ...prev, chainId: Number(chainId) }))
        return true
      }
      
      console.warn(`Connected to unsupported network: ${chainId}`)
      return false
    } catch (error) {
      console.error('Error validating network:', error)
      return false
    }
  }

  // Check for stored wallet address on mount
  useEffect(() => {
    const initWallet = async () => {
      if (typeof window === 'undefined' || !window.ethereum) {
        setIsInitialized(true)
        return
      }

      try {
        const storedAddress = localStorage.getItem(STORAGE_KEY)
        
        // Create provider and check for existing accounts
        const provider = new ethers.providers.Web3Provider(window.ethereum as any)
        const currentAccounts = await provider.listAccounts()
        
        if (currentAccounts.length > 0) {
          // MetaMask is connected - validate and restore session
          const isValidNetwork = await validateNetwork(provider)
          
          if (isValidNetwork && storedAddress && 
              currentAccounts[0].toLowerCase() === storedAddress.toLowerCase()) {
            // Restore session
            const signer = provider.getSigner()
            setSigner(signer)
            setWallet({
              address: currentAccounts[0],
              isConnected: true,
              isConnecting: false,
              chainId: Number((await provider.getNetwork()).chainId)
            })
          } else if (!storedAddress) {
            // No stored address but MetaMask connected - use current account
            const signer = provider.getSigner()
            setSigner(signer)
            setWallet({
              address: currentAccounts[0],
              isConnected: true,
              isConnecting: false,
              chainId: Number((await provider.getNetwork()).chainId)
            })
            localStorage.setItem(STORAGE_KEY, currentAccounts[0])
          } else {
            // Address mismatch - clear storage
            localStorage.removeItem(STORAGE_KEY)
          }
        }
      } catch (error) {
        console.error('Error initializing wallet:', error)
      } finally {
        setIsInitialized(true)
      }
    }

    initWallet()
  }, [])

  // Listen for account and network changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum || !isInitialized) return

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        // User disconnected from MetaMask
        disconnectWallet()
      } else if (accounts[0].toLowerCase() !== wallet.address.toLowerCase()) {
        // Account changed - update state and localStorage
        localStorage.setItem(STORAGE_KEY, accounts[0])
        
        // Re-create signer for new account
        const provider = new ethers.providers.Web3Provider(window.ethereum as any)
        const newSigner = provider.getSigner()
        setSigner(newSigner)
        
        setWallet(prev => ({
          ...prev,
          address: accounts[0],
          isConnected: true,
          isConnecting: false
        }))
      }
    }

    const handleChainChanged = async () => {
      // Reload to ensure clean state
      window.location.reload()
    }

    window.ethereum.on('accountsChanged', handleAccountsChanged)
    window.ethereum.on('chainChanged', handleChainChanged)

    return () => {
      window.ethereum?.removeListener('accountsChanged', handleAccountsChanged)
      window.ethereum?.removeListener('chainChanged', handleChainChanged)
    }
  }, [wallet.address, isInitialized])

  const connectWallet = async () => {
    if (!window.ethereum) {
      throw new Error('MetaMask not installed')
    }

    try {
      setWallet(prev => ({ ...prev, isConnecting: true }))

      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' })
      
      const provider = new ethers.providers.Web3Provider(window.ethereum as any)
      
      // Validate network
      const isValidNetwork = await validateNetwork(provider)
      if (!isValidNetwork) {
        setWallet(prev => ({ ...prev, isConnecting: false }))
        throw new Error('Please switch to a supported network (Hardhat, Sepolia, or Mainnet)')
      }

      const signer = provider.getSigner()
      const address = await signer.getAddress()
      const network = await provider.getNetwork()

      // Save to localStorage
      localStorage.setItem(STORAGE_KEY, address)

      setSigner(signer)
      setWallet({
        address,
        isConnected: true,
        isConnecting: false,
        chainId: Number(network.chainId)
      })
    } catch (error: any) {
      setWallet(prev => ({ 
        ...prev, 
        isConnecting: false,
        isConnected: false 
      }))
      throw error
    }
  }

  const disconnectWallet = () => {
    localStorage.removeItem(STORAGE_KEY)
    setSigner(null)
    setWallet({
      address: '',
      isConnected: false,
      isConnecting: false,
      chainId: null
    })
  }

  return (
    <WalletContext.Provider value={{ wallet, connectWallet, disconnectWallet, signer }}>
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const context = useContext(WalletContext)
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider')
  }
  return context
}

