'use client'

import { useState, useEffect, useCallback } from 'react'

interface UseDelayedLoadingOptions {
  delay?: number // delay in milliseconds (default: 2000)
  immediate?: boolean // whether to show loading immediately then hide after delay
}

interface UseDelayedLoadingReturn {
  isDelayedLoading: boolean
  startLoading: () => void
  stopLoading: () => void
  withDelayedLoading: <T>(promise: Promise<T>) => Promise<T>
}

/**
 * Custom hook that provides delayed loading state
 * Shows loading indicator only after specified delay (default 2 seconds)
 * Useful for blockchain transactions and other long-running operations
 */
export function useDelayedLoading(options: UseDelayedLoadingOptions = {}): UseDelayedLoadingReturn {
  const { delay = 2000, immediate = false } = options
  
  const [isDelayedLoading, setIsDelayedLoading] = useState(immediate)
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null)

  const startLoading = useCallback(() => {
    // Clear any existing timeout
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    
    // Set new timeout to show loading after delay
    const id = setTimeout(() => {
      setIsDelayedLoading(true)
    }, delay)
    
    setTimeoutId(id)
  }, [delay, timeoutId])

  const stopLoading = useCallback(() => {
    // Clear timeout if pending
    if (timeoutId) {
      clearTimeout(timeoutId)
      setTimeoutId(null)
    }
    setIsDelayedLoading(false)
  }, [timeoutId])

  // Wrapper function that handles loading state automatically
  const withDelayedLoading = useCallback(async <T,>(promise: Promise<T>): Promise<T> => {
    startLoading()
    
    try {
      const result = await promise
      return result
    } finally {
      stopLoading()
    }
  }, [startLoading, stopLoading])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [timeoutId])

  return {
    isDelayedLoading,
    startLoading,
    stopLoading,
    withDelayedLoading
  }
}

export default useDelayedLoading

