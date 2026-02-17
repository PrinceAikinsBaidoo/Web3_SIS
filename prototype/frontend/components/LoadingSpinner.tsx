'use client'

import React from 'react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  color?: 'primary' | 'white' | 'gray'
  text?: string
  fullScreen?: boolean
}

export function LoadingSpinner({ 
  size = 'md', 
  color = 'primary',
  text,
  fullScreen = false
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  }

  const colorClasses = {
    primary: 'border-primary-600 border-t-transparent',
    white: 'border-white border-t-transparent',
    gray: 'border-gray-600 border-t-transparent'
  }

  const spinner = (
    <div className="flex flex-col items-center justify-center gap-3">
      <div 
        className={`${sizeClasses[size]} ${colorClasses[color]} border-2 rounded-full animate-spin`}
        role="status"
        aria-label="Loading"
      />
      {text && (
        <p className={`text-sm font-medium ${
          color === 'white' ? 'text-white' : 'text-gray-600'
        }`}>
          {text}
        </p>
      )}
    </div>
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
        <div className="bg-white rounded-xl p-8 shadow-xl">
          {spinner}
        </div>
      </div>
    )
  }

  return spinner
}

/**
 * DelayedLoading component that only shows after a specified delay
 * Useful for showing loading only for long-running operations
 */
interface DelayedLoadingProps {
  isLoading: boolean
  delay?: number
  size?: 'sm' | 'md' | 'lg'
  color?: 'primary' | 'white' | 'gray'
  text?: string
  fullScreen?: boolean
}

export function DelayedLoading({
  isLoading,
  delay = 2000,
  size = 'md',
  color = 'primary',
  text,
  fullScreen = false
}: DelayedLoadingProps) {
  const [showSpinner, setShowSpinner] = React.useState(false)

  React.useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        setShowSpinner(true)
      }, delay)
      
      return () => clearTimeout(timer)
    } else {
      setShowSpinner(false)
    }
  }, [isLoading, delay])

  if (!showSpinner) return null

  return (
    <LoadingSpinner 
      size={size} 
      color={color} 
      text={text}
      fullScreen={fullScreen}
    />
  )
}

export default LoadingSpinner

