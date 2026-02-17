'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { ethers } from 'ethers'
import { contractService } from '@/lib/contract'

interface WalletState {
  address: string
  isConnected: boolean
  isConnecting: boolean
}

interface WalletContextType {
  wallet: WalletState
  connectWallet: () => Promise<void>
  disconnectWallet: () => void
  signer: ethers.Signer | null
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

const STORAGE_KEY = 'wallet_address'

export function WalletProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<WalletState>({
    address: '',
    isConnected: false,
    isConnecting: false
  })
  const [signer, setSigner] = useState<ethers.Signer | null>(null)

  // Check for stored wallet address on mount
  useEffect(() => {
    const storedAddress = localStorage.getItem(STORAGE_KEY)
    if (storedAddress && typeof window !== 'undefined' && window.ethereum) {
      // Try to reconnect
      connectWalletFromStorage(storedAddress)
    }
  }, [])

  // Listen for account changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum) return

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        // User disconnected from MetaMask
        disconnectWallet()
      } else if (accounts[0] !== wallet.address) {
        // Account changed - update state
        setWallet({
          address: accounts[0],
          isConnected: true,
          isConnecting: false
        })
      }
    }

    const handleChainChanged = () => {
      // Reload on chain change
      window.location.reload()
    }

    window.ethereum.on('accountsChanged', handleAccountsChanged)
    window.ethereum.on('chainChanged', handleChainChanged)

    return () => {
      window.ethereum?.removeListener('accountsChanged', handleAccountsChanged)
      window.ethereum?.removeListener('chainChanged', handleChainChanged)
    }
  }, [wallet.address])

  const connectWalletFromStorage = async (storedAddress: string) => {
    if (!window.ethereum) return

    try {
      setWallet(prev => ({ ...prev, isConnecting: true }))
      
      const provider = new ethers.providers.Web3Provider(window.ethereum as any)
      const currentAccounts = await provider.listAccounts()
      
      if (currentAccounts.length > 0 && currentAccounts[0].toLowerCase() === storedAddress.toLowerCase()) {
        const signer = provider.getSigner()
        setSigner(signer)
        setWallet({
          address: currentAccounts[0],
          isConnected: true,
          isConnecting: false
        })
      } else {
        // Stored address doesn't match - clear storage
        localStorage.removeItem(STORAGE_KEY)
        setWallet({
          address: '',
          isConnected: false,
          isConnecting: false
        })
      }
    } catch (error) {
      console.error('Error reconnecting wallet:', error)
      setWallet({
        address: '',
        isConnected: false,
        isConnecting: false
      })
    }
  }

  const connectWallet = async () => {
    if (!window.ethereum) {
      throw new Error('MetaMask not installed')
    }

    try {
      setWallet(prev => ({ ...prev, isConnecting: true }))

      await window.ethereum.request({ method: 'eth_requestAccounts' })
      const provider = new ethers.providers.Web3Provider(window.ethereum as any)
      const signer = provider.getSigner()
      const address = await signer.getAddress()

      // Save to localStorage
      localStorage.setItem(STORAGE_KEY, address)

      setSigner(signer)
      setWallet({
        address,
        isConnected: true,
        isConnecting: false
      })
    } catch (error) {
      setWallet(prev => ({ ...prev, isConnecting: false }))
      throw error
    }
  }

  const disconnectWallet = () => {
    localStorage.removeItem(STORAGE_KEY)
    setSigner(null)
    setWallet({
      address: '',
      isConnected: false,
      isConnecting: false
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

