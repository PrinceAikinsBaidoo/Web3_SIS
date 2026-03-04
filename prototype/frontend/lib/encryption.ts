// Encryption utilities for academic records
// Uses Web Crypto API with AES-GCM encryption

/**
 * Generate a random encryption key
 * @returns AES-GCM key as CryptoKey
 */
export async function generateEncryptionKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256
    },
    true,
    ['encrypt', 'decrypt']
  )
}

/**
 * Generate a random IV (Initialization Vector)
 * @returns 12-byte random IV
 */
export function generateIV(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(12))
}

/**
 * Convert Uint8Array to base64 string
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = ''
  const len = bytes.byteLength
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/**
 * Convert base64 string to Uint8Array
 */
function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64)
  const len = binary.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

/**
 * Export key to base64 string for storage
 * @param key - CryptoKey to export
 * @returns Base64 encoded key
 */
export async function exportKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('raw', key)
  const exportedArray = new Uint8Array(exported)
  return uint8ArrayToBase64(exportedArray)
}

/**
 * Import key from base64 string
 * @param keyString - Base64 encoded key
 * @returns CryptoKey
 */
export async function importKey(keyString: string): Promise<CryptoKey> {
  const binary = atob(keyString)
  const len = binary.length
  // Create ArrayBuffer directly
  const keyBuffer = new ArrayBuffer(len)
  const keyView = new Uint8Array(keyBuffer)
  for (let i = 0; i < len; i++) {
    keyView[i] = binary.charCodeAt(i)
  }
  
  return crypto.subtle.importKey(
    'raw',
    keyBuffer as unknown as BufferSource,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )
}

/**
 * Encrypt data using AES-GCM
 * @param data - Data to encrypt (will be JSON stringified)
 * @param key - AES-GCM key
 * @param iv - Initialization vector (12 bytes)
 * @returns Encrypted data as base64 string
 */
export async function encryptData(
  data: unknown,
  key: CryptoKey,
  iv: Uint8Array
): Promise<string> {
  const jsonString = JSON.stringify(data)
  const encoder = new TextEncoder()
  const encodedData = encoder.encode(jsonString)

  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as unknown as BufferSource
    },
    key,
    encodedData as unknown as BufferSource
  )

  // Combine IV and encrypted data
  const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength)
  combined.set(iv, 0)
  const encBytes = new Uint8Array(encryptedBuffer)
  combined.set(encBytes, iv.length)

  return uint8ArrayToBase64(combined)
}

/**
 * Decrypt data using AES-GCM
 * @param encryptedBase64 - Base64 encoded encrypted data (IV + ciphertext)
 * @param key - AES-GCM key
 * @returns Decrypted data as object
 */
export async function decryptData<T = unknown>(
  encryptedBase64: string,
  key: CryptoKey
): Promise<T> {
  const combined = base64ToUint8Array(encryptedBase64)
  
  // Extract IV (first 12 bytes) and ciphertext
  const iv = combined.slice(0, 12)
  const ciphertext = combined.slice(12)

  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv as unknown as BufferSource
    },
    key,
    ciphertext.buffer as unknown as BufferSource
  )

  const decoder = new TextDecoder()
  const jsonString = decoder.decode(decryptedBuffer)
  return JSON.parse(jsonString) as T
}

/**
 * Derive encryption key from a password or seed
 * Uses PBKDF2 for key derivation
 * @param password - Password or seed string
 * @param salt - Salt for key derivation
 * @returns Derived AES-GCM key
 */
export async function deriveKeyFromPassword(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const passwordBuffer = encoder.encode(password).buffer as ArrayBuffer
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveKey']
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: 100000,
      hash: 'SHA-256'
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )
}

/**
 * Encrypt record with metadata (for IPFS storage)
 */
export interface EncryptedRecord {
  encryptedData: string  // Base64 encoded encrypted data
  iv: string            // Base64 encoded IV
  key: string           // Base64 encoded encryption key
}

export interface SecretEncryptedRecord {
  encryptedData: string
  iv: string
  salt: string
}

/**
 * Create encrypted record for IPFS storage
 * @param recordData - Original record data
 * @returns EncryptedRecord object
 */
export async function createEncryptedRecord(
  recordData: unknown
): Promise<EncryptedRecord> {
  const key = await generateEncryptionKey()
  const iv = generateIV()
  
  const encryptedData = await encryptData(recordData, key, iv)
  const exportedKey = await exportKey(key)
  
  return {
    encryptedData,
    iv: uint8ArrayToBase64(iv),
    key: exportedKey
  }
}

export async function createEncryptedRecordWithSecret(
  recordData: unknown,
  secret: string
): Promise<SecretEncryptedRecord> {
  const iv = generateIV()
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key = await deriveKeyFromPassword(secret, salt)
  const encryptedData = await encryptData(recordData, key, iv)

  return {
    encryptedData,
    iv: uint8ArrayToBase64(iv),
    salt: uint8ArrayToBase64(salt)
  }
}

/**
 * Decrypt record from IPFS
 * @param encryptedRecord - EncryptedRecord from IPFS
 * @returns Decrypted record data
 */
export async function decryptEncryptedRecord<T = unknown>(
  encryptedRecord: EncryptedRecord
): Promise<T> {
  const key = await importKey(encryptedRecord.key)
  
  return decryptData<T>(encryptedRecord.encryptedData, key)
}

export async function decryptEncryptedRecordWithSecret<T = unknown>(
  encryptedRecord: SecretEncryptedRecord,
  secret: string
): Promise<T> {
  const saltBytes = base64ToUint8Array(encryptedRecord.salt)
  const key = await deriveKeyFromPassword(secret, saltBytes)
  return decryptData<T>(encryptedRecord.encryptedData, key)
}

export default {
  generateEncryptionKey,
  generateIV,
  exportKey,
  importKey,
  encryptData,
  decryptData,
  deriveKeyFromPassword,
  createEncryptedRecord,
  decryptEncryptedRecord,
  createEncryptedRecordWithSecret,
  decryptEncryptedRecordWithSecret
}

