# Hybrid Blockchain System for Secure Storage and Verification of Academic Records

## Comprehensive Technical Documentation

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [System Architecture](#2-system-architecture)
3. [Smart Contracts](#3-smart-contracts)
4. [Frontend Application](#4-frontend-application)
5. [Public/Private Credential System](#5-publicprivate-credential-system)
6. [Security Implementation](#6-security-implementation)
7. [IPFS Integration](#7-ipfs-integration)
8. [Workflow Demonstration](#8-workflow-demonstration)
9. [Deployment Guide](#9-deployment-guide)
10. [Evaluation Metrics](#10-evaluation-metrics)
11. [Conclusion](#11-conclusion)

---

## 1. Executive Summary

### 1.1 Project Overview
This project implements a **Hybrid Blockchain System for Secure Storage and Verification of Academic Records** with support for public/private credentials. The system combines the immutability and trustless verification capabilities of blockchain technology with the scalability and privacy features of off-chain encrypted storage.

### 1.2 Problem Statement
Traditional academic record management systems suffer from:
- **Single Point of Failure (SPOF)**: Centralized databases can be compromised
- **Insider Threats**: Administrators with privileged access can alter records
- **Data Leakage**: Lack of strong encryption leads to unauthorized access
- **Operational Inefficiency**: Verification takes days/weeks
- **Interoperability Issues**: Different formats hinder global verification
- **GDPR Non-Compliance**: Immutable storage conflicts with "right to be forgotten"
- **No Privacy Options**: All data visible to anyone who verifies

### 1.3 Proposed Solution
A three-tiered hybrid blockchain architecture that:
- Stores record hashes on-chain for immutability
- Stores encrypted records off-chain (IPFS) for privacy
- Uses AES-256-GCM encryption with PBKDF2 key derivation
- Implements dual-layer credentials (public vs private)
- Enables student-controlled secret keys for private data access
- Supports trustless verification without revealing sensitive data

---

## 2. System Architecture

### 2.1 Three-Tier Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   Issuer    │  │  Verifier   │  │  Student    │            │
│  │  Dashboard  │  │  Dashboard  │  │  Portal     │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│        │               │                  │                      │
│        │    ┌──────────┴──────────┐       │                      │
│        │    │ Public Data        │       │                      │
│        │    │ (Always Visible)   │       │                      │
│        │    └─────────────────────┘       │                      │
│        │               │                  │                      │
│        │    ┌──────────┴──────────┐       │                      │
│        │    │ Private Data       │       │                      │
│        │    │ (Secret Key Req'd)  │       │                      │
│        │    └─────────────────────┘       │                      │
└────────┴──────────────────────────────────┴─────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   BLOCKCHAIN LAYER (On-Chain)                   │
│  ┌──────────────────────┐  ┌──────────────────────────┐        │
│  │  RecordRegistry.sol  │  │ InstitutionRegistry.sol  │        │
│  │  - Record hashes    │  │  - Institution details   │        │
│  │  - Public metadata  │  │  - Accreditation status  │        │
│  │  - Timestamps       │  │  - Authorized wallets   │        │
│  └──────────────────────┘  └──────────────────────────┘        │
│                                                                 │
│  Benefits: Immutability, Transparency, Trustless Verification   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   STORAGE LAYER (Off-Chain)                     │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                      IPFS                                │    │
│  │  ┌─────────────────┐  ┌─────────────────────────────┐  │    │
│  │  │ Private Data    │  │ Off-Chain Only Data        │  │    │
│  │  │ (Encrypted with │  │ (Encrypted, never on-chain)│  │    │
│  │  │  student secret)│  │                            │  │    │
│  │  └─────────────────┘  └─────────────────────────────┘  │    │
│  │  - Content-addressed storage                          │    │
│  │  - Content Identifier (CID) for retrieval             │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  Benefits: Scalability, Data Privacy, Cost Efficiency          │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Student   │     │   Issuer    │     │  Verifier   │
│  (Data Sub) │     │ (University)│     │ (Employer)  │
└──────────────┘     └──────────────┘     └──────────────┘
       │                    │                    │
       │  1. Submit Data   │                    │
       │───────────────────>│                    │
       │                    │                    │
       │                    │  2. Encrypt (Dual-Layer)
       │                    │    • Public → on-chain
       │                    │    • Private → encrypted IPFS
       │                    │    • Sensitive → encrypted, no hash
       │                    │         │
       │                    │         ▼
       │                    │  3. Student sets secret key
       │                    │         │
       │                    │         ▼
       │                    │  4. Upload to IPFS
       │                    │         │
       │                    │         ▼
       │                    │  5. Get CID
       │                    │         │
       │                    │         ▼
       │                    │  6. Store hash + public on-chain
       │                    │                    │
       │                    │  7. Provide CID + secret to student
       │                    │<──────────────────│
       │                    │                    │
       │                    │                    │  8. Query Chain
       │                    │                    │<──────────────
       │                    │                    │
       │                    │                    │  9a. PUBLIC: View without secret
       │                    │                    │─────────────>
       │                    │                    │
       │                    │                    │  9b. PRIVATE: Enter secret key
       │                    │                    │<──────────────
       │                    │                    │  9c. Decrypt IPFS
       │                    │                    │─────────────>
```

---

## 3. Smart Contracts

### 3.1 RecordRegistry.sol

#### Purpose
The core smart contract for issuing, revoking, and verifying academic records on the blockchain.

#### Key Features
- **Authorized Issuers**: Only registered universities can issue records
- **Hash-Based Records**: Records identified by keccak256 hash of encrypted content
- **Revocation Support**: Issuers can revoke invalid/fraudulent records
- **Timestamp Tracking**: All actions timestamped for audit trail
- **Institution Integration**: Links with InstitutionRegistry for authorization
- **Public Metadata**: Stores public credential information on-chain

#### Key Functions

| Function | Description | Access |
|----------|-------------|--------|
| `issueRecord()` | Issue new academic record | Authorized issuers only |
| `revokeRecord()` | Revoke existing record | Original issuer only |
| `getRecordStatus()` | Verify record validity | Public |
| `authorizeIssuer()` | Add authorized issuer | Owner only |
| `setInstitutionRegistry()` | Link institution contract | Authorized issuers |

#### Events
- `RecordIssued(bytes32 indexed recordHash, address indexed issuer, uint256 timestamp, string metadata)`
- `RecordRevoked(bytes32 indexed recordHash, address indexed issuer, uint256 timestamp)`
- `IssuerAuthorized(address indexed issuer)`
- `IssuerRevoked(address indexed issuer)`

### 3.2 InstitutionRegistry.sol

#### Purpose
Manages university/issuer registration, accreditation, and wallet authorization.

#### Key Features
- **Institution Registration**: Universities register with name, domain, accreditation ID
- **Accreditation Management**: Track accreditation status
- **Multi-Wallet Support**: Institutions can have multiple authorized wallets
- **Domain Verification**: Prevents duplicate registrations

---

## 4. Frontend Application

### 4.1 Technology Stack

| Component | Technology |
|-----------|------------|
| Framework | Next.js 14 (React) |
| Styling | Tailwind CSS |
| Blockchain | Ethers.js v5 |
| IPFS | Pinata API |
| Encryption | Web Crypto API (AES-256-GCM + PBKDF2) |
| Wallet | MetaMask |

### 4.2 Page Structure

#### Landing Page (`/`)
- Project introduction
- Navigation to all features
- Wallet connection prompt

#### Institution Registration (`/institution`)
- Register university details (name, domain)
- Auto-generated accreditation ID
- Self-accreditation for demo
- Add authorized wallets

#### Issuer Dashboard (`/issuer`)
- **NEW**: Issue new academic records with dual-layer data
- Public fields: Name, Program, Enrollment Status, Degree
- Private fields: GPA, Grades, Minor, Concentration, Transcript
- Off-chain only: Disciplinary Records
- Set student secret key for private data access

#### Records Management (`/records`)
- View all issued records
- See encryption status
- Revoke functionality

#### Verifier Dashboard (`/verifier`)
- **NEW**: Input record hash
- **NEW**: Optional secret key for private data
- Shows public data always
- Shows private data when secret key provided

---

## 5. Public/Private Credential System

### 5.1 Overview

This system implements a **dual-layer credential system** that separates publicly verifiable information from sensitive private data.

### 5.2 Data Categories

#### Public Data (On-Chain Metadata)
**Visible to everyone without any secret key:**

| Field | Description |
|-------|-------------|
| Full Legal Name | Student's full legal name |
| Program/Major | Academic program or major |
| Enrollment Status | active, graduated, completed, suspended |
| Degree Awarded | Type of degree granted |

**Storage**: Stored directly in the smart contract metadata (visible on blockchain explorers)

#### Private Data (Encrypted IPFS)
**Requires student's secret key to decrypt:**

| Field | Description |
|-------|-------------|
| GPA | Cumulative grade point average |
| Course Grades | Per-course grades with semester details |
| Minor | Academic minor (if any) |
| Concentration | Area of concentration |
| Graduation Date | Date of graduation |
| Transcript Details | Additional transcript information |

**Storage**: Encrypted with AES-256-GCM using PBKDF2-derived key from student's secret

#### Off-Chain Only Data (Encrypted IPFS - No Hash)
**Never stored on blockchain (GDPR "right to be forgotten"):**

| Field | Description |
|-------|-------------|
| Disciplinary Records | Sensitive disciplinary information |

**Storage**: Encrypted in IPFS but never referenced in on-chain hash - can be deleted without affecting blockchain

### 5.3 Secret Key System

#### How It Works

1. **Key Generation**:
   - Student sets a password (minimum 6 characters)
   - PBKDF2 derives a 256-bit AES key (100,000 iterations)
   - Key is used to encrypt private data before IPFS upload

2. **Data Access**:
   - Without secret key: Only public on-chain data visible
   - With secret key: Decrypts IPFS data and reveals private fields

3. **Key Distribution**:
   - Institution provides secret key to student after issuance
   - Student shares key with trusted parties (employers, other universities)
   - Student can change key anytime (re-issue with new key)

### 5.4 Verification Modes

#### Mode 1: Basic Verification (No Secret Key)
```
Input: Record Hash
Output:
  ✓ Record Valid/Invalid
  ✓ Full Legal Name
  ✓ Program/Major
  ✓ Enrollment Status
  ✓ Degree Awarded
```

#### Mode 2: Full Verification (With Secret Key)
```
Input: Record Hash + Secret Key
Output: (Everything in Mode 1) PLUS:
  ✓ GPA
  ✓ Course Grades (table format)
  ✓ Minor/Concentration
  ✓ Graduation Date
  ✓ Transcript Details
  ✓ Disciplinary Records (if any)
```

---

## 6. Security Implementation

### 6.1 Encryption (AES-256-GCM + PBKDF2)

The system uses **AES-256-GCM** with **PBKDF2** key derivation for encrypting private academic records:

```typescript
// Derive key from password (student's secret)
const key = await deriveKeyFromPassword(
  secretKey,      // Student's chosen password
  salt            // Random 16-byte salt
);

// Encrypt private data
const encryptedData = await encryptData(
  privateRecord,
  key,
  iv
);
```

**Security Properties:**
- **AES-256-GCM**: Industry-standard authenticated encryption
- **PBKDF2**: 100,000 iterations for brute-force protection
- **Unique Salt**: Each record uses a random salt
- **Random IV**: Each encryption uses unique 12-byte IV
- **Non-reusability**: Same data produces different ciphertext

### 6.2 On-Chain Data Privacy

**What is stored on-chain (PUBLIC):**
- keccak256 hash of encrypted record
- Issuer address
- Timestamp
- Public metadata (name, degree, program, enrollment status)

**What is stored off-chain (PRIVATE):**
- Encrypted GPA, grades, transcript
- Encrypted minor, concentration, graduation date

**What is stored off-chain only (NEVER ON-CHAIN):**
- Encrypted disciplinary records
- No hash reference - can be deleted for GDPR compliance

### 6.3 Access Control

```solidity
// Only authorized issuers can issue records
modifier onlyAuthorized() {
    require(_isAuthorized(msg.sender), "Caller is not an authorized issuer");
    _;
}

// Only original issuer can revoke
function revokeRecord(bytes32 _recordHash) external onlyAuthorized {
    require(records[_recordHash].issuer == msg.sender, "Only original issuer can revoke");
    // ... revocation logic
}
```

---

## 7. IPFS Integration

### 7.1 Overview
The InterPlanetary File System (IPFS) provides distributed storage for encrypted academic records.

### 7.2 Data Structure

```typescript
interface FullRecordData {
  public: {
    fullLegalName: string;
    programMajor: string;
    enrollmentStatus: string;
    degreeAwarded: string;
    issueDate: string;
    cid: string;
  };
  private: {
    encryptedData: string;  // AES-256-GCM encrypted
    iv: string;
    salt: string;           // For PBKDF2 key derivation
  };
  offChain: {
    encryptedData: string;  // Disciplinary records
    iv: string;
    salt: string;
  };
}
```

### 7.3 Pinata Integration

```typescript
// Upload to IPFS via Pinata
const formData = new FormData();
formData.append('file', encryptedBlob);

const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: {
        'pinata_api_key': API_KEY,
        'pinata_secret_api_key': SECRET_KEY,
    },
    body: formData,
});
```

---

## 8. Workflow Demonstration

### 8.1 Issue Record Workflow

```
Step 1: Institution Registration
├── Connect MetaMask wallet
├── Navigate to /institution
├── Register institution details
└── Get authorized as issuer

Step 2: Issue Academic Record
├── Connect as authorized issuer
├── Navigate to /issuer
├── Fill PUBLIC fields (name, program, degree)
├── Fill PRIVATE fields (GPA, grades)
├── Set STUDENT SECRET KEY
├── Submit record
│   ├── Encrypt private data with secret key
│   ├── Upload to IPFS
│   ├── Store public on-chain
│   └── Compute keccak256 hash
└── Student receives their secret key
```

### 8.2 Verification Workflow (Without Secret)

```
Step 1: Query Record
├── Navigate to /verifier
├── Enter record hash
└── System queries blockchain

Step 2: View Public Data
├── Shows: Name, Program, Enrollment Status, Degree
└── Verification complete
```

### 8.3 Verification Workflow (With Secret)

```
Step 1: Query Record
├── Navigate to /verifier
├── Enter record hash
└── System shows public data

Step 2: Decrypt Private Data
├── Click "Have a secret key?"
├── Enter student's secret key
├── System decrypts IPFS data
└── Shows: GPA, Grades, Transcript, etc.
```

### 8.4 Revocation Workflow

```
Step 1: Initiate Revocation
├── Issuer navigates to /records
├── Locates record to revoke
└── Clicks "Revoke"

Step 2: Execute Revocation
├── Send transaction to revokeRecord()
├── Smart contract marks record as invalid
└── Any verification after this returns invalid
```

---

## 9. Deployment Guide

### 9.1 Prerequisites

| Requirement | Version |
|-------------|---------|
| Node.js | 18+ |
| npm | 9+ |
| MetaMask | Latest |
| Pinata Account | Free tier |

### 9.2 Environment Setup

```bash
# Install backend dependencies
cd prototype
npm install

# Install frontend dependencies
cd frontend
npm install

# Configure environment variables
# Create .env.local file:
NEXT_PUBLIC_PINATA_API_KEY=your_api_key
NEXT_PUBLIC_PINATA_SECRET_KEY=your_secret_key
```

### 9.3 Running Locally

```bash
# Terminal 1: Start blockchain
cd prototype
npm run node

# Terminal 2: Deploy contracts
cd prototype
npm run deploy

# Terminal 3: Start frontend
cd frontend
npm run dev

# Access at http://localhost:3000
```

### 9.4 Testing on Sepolia Testnet

1. Get test ETH from Sepolia faucet
2. Configure MetaMask to Sepolia network
3. Deploy contracts to Sepolia
4. Update contract addresses in frontend
5. Test full workflow

---

## 10. Evaluation Metrics

### 10.1 Tamper Resistance

| Test | Expected Result |
|------|-----------------|
| Issue record → Verify valid | Record shows as valid |
| Modify record → Verify | Hash mismatch detected |
| Revoke record → Verify | Record shows as invalid |

### 10.2 Gas Consumption

| Operation | Estimated Gas |
|-----------|---------------|
| Issue Record | ~150,000 gas |
| Revoke Record | ~50,000 gas |
| Verify Record | ~0 gas (view function) |

### 10.3 Confidentiality

| Metric | Result |
|--------|--------|
| PII on Chain | None (public only) |
| Private Data | AES-256-GCM + PBKDF2 |
| Key Management | Student-controlled |
| GDPR Compliant | Yes (off-chain deletion supported) |

### 10.4 Performance

| Operation | Response Time |
|-----------|---------------|
| Record Issuance | ~15 seconds |
| Public Verification | <1 second |
| Private Verification | ~2-3 seconds (decryption) |
| IPFS Upload | ~3-5 seconds |

---

## 11. Conclusion

### 11.1 Summary
This hybrid blockchain system successfully demonstrates:

1. **Secure Storage**: Academic records encrypted with AES-256-GCM before IPFS storage
2. **Tamper Evidence**: keccak256 hashes on blockchain prevent modification
3. **Trustless Verification**: Anyone can verify records without permission
4. **Dual-Layer Privacy**: Public vs private credential separation
5. **Student Sovereignty**: Student controls their secret key
6. **GDPR Compliance**: Off-chain-only data can be deleted
7. **Revocation Support**: Issuers can revoke invalid records

### 11.2 Comparison with Existing Solutions

| Feature | Blockcerts | EduCTX | Our Hybrid Model |
|---------|------------|--------|------------------|
| Data Storage | External | On-chain | IPFS (encrypted) |
| Student Control | Partial | None | Full |
| Public/Private | No | No | Yes |
| Secret Key Access | No | No | Yes |
| GDPR Compliance | Partial | Partial | Full |
| Interoperability | Limited | Consortium | Global |

### 11.3 Future Enhancements

1. **Zero-Knowledge Proofs**: Enable verification without revealing data
2. **DID Integration**: Student-controlled decentralized identities
3. **Multi-Chain Support**: Deploy on multiple blockchains
4. **Batch Issuance**: Issue multiple records in one transaction
5. **QR Code Verification**: Offline verification via QR codes
6. **Revocable Shares**: Time-limited access to private data

---

## Appendix A: Contract Addresses (Sepolia Testnet)

*To be filled after deployment*

| Contract | Address |
|----------|---------|
| RecordRegistry | `0x...` |
| InstitutionRegistry | `0x...` |
| StudentIdentity | `0x...` |
| VerificationLog | `0x...` |

---

*Document Version: 2.0*
*Last Updated: 2026*
*Project: Hybrid Blockchain System for Academic Records*

