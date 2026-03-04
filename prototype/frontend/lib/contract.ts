import { ethers } from 'ethers'

// Contract ABIs

// RecordRegistry ABI - for issuing, revoking, and verifying academic records
const RECORD_REGISTRY_ABI = [
  "function authorizeIssuer(address _issuer) external",
  "function revokeIssuer(address _issuer) external",
  "function issueRecord(bytes32 _recordHash, string calldata _metadata) external",
  "function revokeRecord(bytes32 _recordHash) external",
  "function getRecordStatus(bytes32 _recordHash) view returns (bool isValid, address issuer, uint256 timestamp, string memory metadata)",
  "function recordExists(bytes32 _recordHash) view returns (bool)",
  "function authorizedIssuers(address _issuer) view returns (bool)",
  "function isAuthorized(address _address) view returns (bool)",
  "function setInstitutionRegistry(address _registryAddress) external",
  "function institutionRegistryAddress() view returns (address)",
  "function getRecordCount(address _issuer) external view returns (uint256)",
  "function getIssuerRecords(address _issuer) external view returns (bytes32[])",
  "function records(bytes32) view returns (bytes32 recordHash, address issuer, uint256 timestamp, bool isValid, string metadata)",
  "event RecordIssued(bytes32 indexed recordHash, address indexed issuer, uint256 timestamp, string metadata)",
  "event RecordRevoked(bytes32 indexed recordHash, address indexed issuer, uint256 timestamp)",
  "event IssuerAuthorized(address indexed issuer)",
  "event IssuerRevoked(address indexed issuer)",
  "event InstitutionRegistrySet(address indexed registryAddress)"
]

// StudentIdentity ABI - for student wallet registration and identity management
const STUDENT_IDENTITY_ABI = [
  "function register(bytes32 _identityHash) external",
  "function updateIdentity(bytes32 _newIdentityHash) external",
  "function deactivate() external",
  "function reactivate() external",
  "function authorizeVerifier(address _verifier) external",
  "function revokeVerifier(address _verifier) external",
  "function isVerifierAuthorized(address _student, address _verifier) view returns (bool)",
  "function getStudentInfo(address _wallet) view returns (bytes32 identityHash, uint256 registrationTime, bool isActive)",
  "function isRegistered(address _wallet) view returns (bool)",
  "function getWalletByIdentity(bytes32 _identityHash) view returns (address)",
  "function batchAuthorizeVerifiers(address[] calldata _verifiers) external",
  "function batchRevokeVerifiers(address[] calldata _verifiers) external",
  "function students(address) view returns (address walletAddress, bytes32 identityHash, uint256 registrationTime, bool isRegistered, bool isActive)",
  "event StudentRegistered(address indexed wallet, bytes32 identityHash, uint256 timestamp)",
  "event StudentDeactivated(address indexed wallet, uint256 timestamp)",
  "event StudentReactivated(address indexed wallet, uint256 timestamp)",
  "event VerifierAuthorized(address indexed student, address indexed verifier)",
  "event VerifierRevoked(address indexed student, address indexed verifier)",
  "event IdentityUpdated(address indexed wallet, bytes32 newIdentityHash)"
]

// VerificationLog ABI - for logging and auditing verification requests
const VERIFICATION_LOG_ABI = [
  "function logVerification(bytes32 _recordHash, address _issuer, bool _result, string calldata _metadata) external",
  "function logSimpleVerification(bytes32 _recordHash, bool _result, string calldata _metadata) external",
  "function batchLogVerification(bytes32[] calldata _recordHashes, bool[] calldata _results, string[] calldata _metadataArray) external",
  "function getTotalLogs() view returns (uint256)",
  "function getRecordVerifications(bytes32 _recordHash) view returns (tuple(bytes32 recordHash, address verifier, address issuer, uint256 timestamp, bool result, string metadata)[])",
  "function getRecordVerificationCount(bytes32 _recordHash) view returns (uint256)",
  "function getVerifierLogs(address _verifier) view returns (tuple(bytes32 recordHash, address verifier, address issuer, uint256 timestamp, bool result, string metadata)[])",
  "function getVerifierLogCount(address _verifier) view returns (uint256)",
  "function recordVerified(bytes32 _recordHash) view returns (bool)",
  "function getVerificationLogs(uint256 _start, uint256 _count) view returns (tuple(bytes32 recordHash, address verifier, address issuer, uint256 timestamp, bool result, string metadata)[])",
  "function getRecentVerifications(uint256 _count) view returns (tuple(bytes32 recordHash, address verifier, address issuer, uint256 timestamp, bool result, string metadata)[])",
  "function totalVerifications() view returns (uint256)",
  "function verificationLogs(uint256) view returns (bytes32 recordHash, address verifier, address issuer, uint256 timestamp, bool result, string metadata)",
  "event VerificationLogged(bytes32 indexed recordHash, address indexed verifier, address indexed issuer, uint256 timestamp, bool result)",
  "event BatchVerificationLogged(address indexed verifier, uint256 count, uint256 timestamp)"
]

// InstitutionRegistry ABI - for managing university/issuer registration
const INSTITUTION_REGISTRY_ABI = [
  "function registerInstitution(string calldata _name, string calldata _domain, string calldata _accreditationId, string calldata _metadata) external",
  "function updateInstitution(string calldata _name, string calldata _domain, string calldata _metadata) external",
  "function updateAccreditation(address _institutionAddress, bool _isAccredited) external",
  "function selfAccredit(string calldata _accreditationId) external",
  "function addAuthorizedWallet(address _wallet) external",
  "function removeAuthorizedWallet(address _wallet) external",
  "function isWalletAuthorized(address _institution, address _wallet) view returns (bool)",
  "function getInstitutionInfo(address _address) view returns (string memory name, string memory domain, bool isAccredited, uint256 authorizedWalletCount)",
  "function getAuthorizedWallets(address _address) view returns (address[])",
  "function getInstitutionByDomain(string calldata _domain) view returns (address)",
  "function getInstitutionCount() view returns (uint256)",
  "function getInstitutions(uint256 _start, uint256 _count) view returns (address[])",
  "function isRegistered(address _address) view returns (bool)",
  "function isAccredited(address _address) view returns (bool)",
  "function institutions(address) view returns (string name, string domain, string accreditationId, uint256 registrationTime, bool isRegistered, bool isAccredited, string metadata)",
  "function registeredInstitutions(uint256) view returns (address)",
  "event InstitutionRegistered(address indexed institutionAddress, string name, string domain, uint256 timestamp)",
  "event InstitutionUpdated(address indexed institutionAddress, string name, uint256 timestamp)",
  "event AccreditationUpdated(address indexed institutionAddress, bool isAccredited, uint256 timestamp)",
  "event WalletAdded(address indexed institutionAddress, address indexed wallet, uint256 timestamp)",
  "event WalletRemoved(address indexed institutionAddress, address indexed wallet, uint256 timestamp)",
  "event InstitutionDeactivated(address indexed institutionAddress, uint256 timestamp)",
  "event InstitutionReactivated(address indexed institutionAddress, uint256 timestamp)"
]

// Contract addresses from environment (with fallback defaults)
const CONTRACT_ADDRESSES = {
  recordRegistry: process.env.NEXT_PUBLIC_RECORD_REGISTRY_ADDRESS || '0x7FbC5257a73b51Fd01859cd50C7A1eAA5E476EA1',
  studentIdentity: process.env.NEXT_PUBLIC_STUDENT_IDENTITY_ADDRESS || '0x1ADE0d732e29f82041a6FB04F7C420fa06f3Ce3a',
  verificationLog: process.env.NEXT_PUBLIC_VERIFICATION_LOG_ADDRESS || '0x09dDF1069F2b01Ab6217DC5710ea47D5de6883D5',
  institutionRegistry: process.env.NEXT_PUBLIC_INSTITUTION_REGISTRY_ADDRESS || '0xcd454b704FED5744893874D70DE1A3F3C0858407'
}

const DEFAULT_RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com'

// Types
export interface Record {
  recordHash: string
  issuer: string
  timestamp: number
  isValid: boolean
  metadata: string
}

export interface RecordWithMetadata extends Record {
  parsedMetadata: {
    studentId?: string
    degree?: string
    cid?: string
    [key: string]: any
  }
}

export interface Student {
  walletAddress: string
  identityHash: string
  registrationTime: number
  isRegistered: boolean
  isActive: boolean
}

export interface VerificationEntry {
  recordHash: string
  verifier: string
  issuer: string
  timestamp: number
  result: boolean
  metadata: string
}

export interface Institution {
  name: string
  domain: string
  accreditationId: string
  registrationTime: number
  isRegistered: boolean
  isAccredited: boolean
  metadata: string
}

class ContractService {
  private rpcUrl: string

  constructor() {
    this.rpcUrl = DEFAULT_RPC_URL
  }

  // Get provider (read-only)
  getProvider(): ethers.providers.JsonRpcProvider {
    return new ethers.providers.JsonRpcProvider(this.rpcUrl)
  }

  // ==================== RECORD REGISTRY ====================

  // Get RecordRegistry contract instance (read-only)
  getRecordRegistry(provider?: ethers.providers.JsonRpcProvider): ethers.Contract {
    const prov = provider || this.getProvider()
    return new ethers.Contract(CONTRACT_ADDRESSES.recordRegistry, RECORD_REGISTRY_ABI, prov)
  }

  // Get RecordRegistry with signer (for write operations)
  getRecordRegistryWithSigner(signer: ethers.Signer): ethers.Contract {
    return new ethers.Contract(CONTRACT_ADDRESSES.recordRegistry, RECORD_REGISTRY_ABI, signer)
  }

  // ==================== STUDENT IDENTITY ====================

  // Get StudentIdentity contract instance (read-only)
  getStudentIdentity(provider?: ethers.providers.JsonRpcProvider): ethers.Contract {
    const prov = provider || this.getProvider()
    return new ethers.Contract(CONTRACT_ADDRESSES.studentIdentity, STUDENT_IDENTITY_ABI, prov)
  }

  // Get StudentIdentity with signer
  getStudentIdentityWithSigner(signer: ethers.Signer): ethers.Contract {
    return new ethers.Contract(CONTRACT_ADDRESSES.studentIdentity, STUDENT_IDENTITY_ABI, signer)
  }

  // ==================== VERIFICATION LOG ====================

  // Get VerificationLog contract instance (read-only)
  getVerificationLog(provider?: ethers.providers.JsonRpcProvider): ethers.Contract {
    const prov = provider || this.getProvider()
    return new ethers.Contract(CONTRACT_ADDRESSES.verificationLog, VERIFICATION_LOG_ABI, prov)
  }

  // Get VerificationLog with signer
  getVerificationLogWithSigner(signer: ethers.Signer): ethers.Contract {
    return new ethers.Contract(CONTRACT_ADDRESSES.verificationLog, VERIFICATION_LOG_ABI, signer)
  }

  // ==================== INSTITUTION REGISTRY ====================

  // Get InstitutionRegistry contract instance (read-only)
  getInstitutionRegistry(provider?: ethers.providers.JsonRpcProvider): ethers.Contract {
    const prov = provider || this.getProvider()
    return new ethers.Contract(CONTRACT_ADDRESSES.institutionRegistry, INSTITUTION_REGISTRY_ABI, prov)
  }

  // Get InstitutionRegistry with signer
  getInstitutionRegistryWithSigner(signer: ethers.Signer): ethers.Contract {
    return new ethers.Contract(CONTRACT_ADDRESSES.institutionRegistry, INSTITUTION_REGISTRY_ABI, signer)
  }

  // ==================== WALLET CONNECTION ====================

  // Connect to wallet and get signer
  async connectWallet(): Promise<{ signer: ethers.Signer; address: string } | null> {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('MetaMask not installed')
    }

    await window.ethereum.request({ method: 'eth_requestAccounts' })
    const provider = new ethers.providers.Web3Provider(window.ethereum as any)
    const signer = provider.getSigner()
    const address = await signer.getAddress()

    return { signer, address }
  }

  // ==================== RECORD REGISTRY FUNCTIONS ====================

  // Check if address is authorized issuer (uses new isAuthorized function)
  async isAuthorizedIssuer(address: string): Promise<boolean> {
    const contract = this.getRecordRegistry()
    try {
      return await contract.isAuthorized(address)
    } catch {
      // Fallback to old method if new function doesn't exist
      return await contract.authorizedIssuers(address)
    }
  }

  // Set InstitutionRegistry address (owner only)
  async setInstitutionRegistry(signer: ethers.Signer, registryAddress: string): Promise<ethers.ContractTransaction> {
    const contract = this.getRecordRegistryWithSigner(signer)
    return await contract.setInstitutionRegistry(registryAddress)
  }

  // Get InstitutionRegistry address
  async getInstitutionRegistryAddress(): Promise<string> {
    const contract = this.getRecordRegistry()
    return await contract.institutionRegistryAddress()
  }

  // Issue a new record
  async issueRecord(
    signer: ethers.Signer,
    recordHash: string,
    metadata: string
  ): Promise<ethers.ContractTransaction> {
    const contract = this.getRecordRegistryWithSigner(signer)
    return await contract.issueRecord(recordHash, metadata)
  }

  // Revoke a record
  async revokeRecord(signer: ethers.Signer, recordHash: string): Promise<ethers.ContractTransaction> {
    const contract = this.getRecordRegistryWithSigner(signer)
    return await contract.revokeRecord(recordHash)
  }

  // Get record status
  async getRecordStatus(recordHash: string): Promise<RecordWithMetadata | null> {
    const contract = this.getRecordRegistry()
    const exists = await contract.recordExists(recordHash)
    
    if (!exists) {
      return null
    }

    const [isValid, issuer, timestamp, metadata] = await contract.getRecordStatus(recordHash)
    
    let parsedMetadata = {}
    try {
      parsedMetadata = JSON.parse(metadata)
    } catch {
      parsedMetadata = { raw: metadata }
    }

    return {
      recordHash,
      issuer,
      timestamp: timestamp.toNumber(),
      isValid,
      metadata,
      parsedMetadata
    }
  }

  // Get all records for an issuer
  async getIssuerRecords(issuerAddress: string): Promise<RecordWithMetadata[]> {
    const contract = this.getRecordRegistry()
    const recordHashes = await contract.getIssuerRecords(issuerAddress)
    
    const records: RecordWithMetadata[] = []
    for (const hash of recordHashes) {
      const record = await this.getRecordStatus(hash)
      if (record) {
        records.push(record)
      }
    }
    
    return records
  }

  // Verify a record
  async verifyRecord(recordHash: string): Promise<{ valid: boolean; record?: RecordWithMetadata }> {
    const record = await this.getRecordStatus(recordHash)
    
    if (!record) {
      return { valid: false }
    }
    
    return {
      valid: record.isValid,
      record
    }
  }

  // Authorize a new issuer
  async authorizeIssuer(signer: ethers.Signer, newIssuer: string): Promise<ethers.ContractTransaction> {
    const contract = this.getRecordRegistryWithSigner(signer)
    return await contract.authorizeIssuer(newIssuer)
  }

  // ==================== STUDENT IDENTITY FUNCTIONS ====================

  // Register a new student
  async registerStudent(signer: ethers.Signer, identityHash: string): Promise<ethers.ContractTransaction> {
    const contract = this.getStudentIdentityWithSigner(signer)
    return await contract.register(identityHash)
  }

  // Check if wallet is registered
  async isStudentRegistered(address: string): Promise<boolean> {
    const contract = this.getStudentIdentity()
    return await contract.isRegistered(address)
  }

  // Get student info
  async getStudentInfo(address: string): Promise<Student | null> {
    const contract = this.getStudentIdentity()
    const isRegistered = await contract.isRegistered(address)
    
    if (!isRegistered) {
      return null
    }

    const [identityHash, registrationTime, isActive] = await contract.getStudentInfo(address)
    
    return {
      walletAddress: address,
      identityHash,
      registrationTime: registrationTime.toNumber(),
      isRegistered: true,
      isActive
    }
  }

  // Authorize a verifier
  async authorizeVerifier(signer: ethers.Signer, verifier: string): Promise<ethers.ContractTransaction> {
    const contract = this.getStudentIdentityWithSigner(signer)
    return await contract.authorizeVerifier(verifier)
  }

  // Revoke verifier access
  async revokeVerifier(signer: ethers.Signer, verifier: string): Promise<ethers.ContractTransaction> {
    const contract = this.getStudentIdentityWithSigner(signer)
    return await contract.revokeVerifier(verifier)
  }

  // Check if verifier is authorized
  async isVerifierAuthorized(student: string, verifier: string): Promise<boolean> {
    const contract = this.getStudentIdentity()
    return await contract.isVerifierAuthorized(student, verifier)
  }

  // ==================== VERIFICATION LOG FUNCTIONS ====================

  // Log a verification
  async logVerification(
    signer: ethers.Signer,
    recordHash: string,
    issuer: string,
    result: boolean,
    metadata: string
  ): Promise<ethers.ContractTransaction> {
    const contract = this.getVerificationLogWithSigner(signer)
    return await contract.logVerification(recordHash, issuer, result, metadata)
  }

  // Get verification count
  async getVerificationCount(): Promise<number> {
    const contract = this.getVerificationLog()
    const count = await contract.totalVerifications()
    return count.toNumber()
  }

  // Get recent verifications
  async getRecentVerifications(count: number): Promise<VerificationEntry[]> {
    const contract = this.getVerificationLog()
    const entries = await contract.getRecentVerifications(count)
    
    return entries.map((entry: any) => ({
      recordHash: entry.recordHash,
      verifier: entry.verifier,
      issuer: entry.issuer,
      timestamp: entry.timestamp.toNumber(),
      result: entry.result,
      metadata: entry.metadata
    }))
  }

  // ==================== INSTITUTION REGISTRY FUNCTIONS ====================

  // Register an institution
  async registerInstitution(
    signer: ethers.Signer,
    name: string,
    domain: string,
    accreditationId: string,
    metadata: string
  ): Promise<ethers.ContractTransaction> {
    const contract = this.getInstitutionRegistryWithSigner(signer)
    return await contract.registerInstitution(name, domain, accreditationId, metadata)
  }

  // Check if institution is registered
  async isInstitutionRegistered(address: string): Promise<boolean> {
    const contract = this.getInstitutionRegistry()
    return await contract.isRegistered(address)
  }

  // Check if institution is accredited
  async isInstitutionAccredited(address: string): Promise<boolean> {
    const contract = this.getInstitutionRegistry()
    return await contract.isAccredited(address)
  }

  // Get institution info
  async getInstitutionInfo(address: string): Promise<Institution | null> {
    const contract = this.getInstitutionRegistry()
    const isRegistered = await contract.isRegistered(address)
    
    if (!isRegistered) {
      return null
    }

    const [name, domain, isAccredited, walletCount] = await contract.getInstitutionInfo(address)
    
    return {
      name,
      domain,
      accreditationId: '',
      registrationTime: 0,
      isRegistered: true,
      isAccredited,
      metadata: ''
    }
  }

  // Self-accredit institution (for demo)
  async selfAccredit(signer: ethers.Signer, accreditationId: string): Promise<ethers.ContractTransaction> {
    const contract = this.getInstitutionRegistryWithSigner(signer)
    return await contract.selfAccredit(accreditationId)
  }

  // Add authorized wallet
  async addAuthorizedWallet(signer: ethers.Signer, wallet: string): Promise<ethers.ContractTransaction> {
    const contract = this.getInstitutionRegistryWithSigner(signer)
    return await contract.addAuthorizedWallet(wallet)
  }

  // Check if wallet is authorized for an institution
  async isWalletAuthorized(institution: string, wallet: string): Promise<boolean> {
    const contract = this.getInstitutionRegistry()
    return await contract.isWalletAuthorized(institution, wallet)
  }

  // Get authorized wallets for an institution
  async getAuthorizedWallets(address: string): Promise<string[]> {
    const contract = this.getInstitutionRegistry()
    return await contract.getAuthorizedWallets(address)
  }

  // ==================== UTILITY FUNCTIONS ====================

  // Compute keccak256 hash (Ethereum's hash function)
  computeHash(data: string): string {
    return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(data))
  }

  // Get contract addresses
  getContractAddresses() {
    return CONTRACT_ADDRESSES
  }
}

// Export singleton instance
export const contractService = new ContractService()

// Export types
export type { ContractService }

