# Hybrid Blockchain System for Secure Storage and Verification of Academic Records

A working prototype demonstrating a three-tiered hybrid blockchain architecture for secure academic credential storage and verification with public/private credential support.

## 📋 Overview

This prototype implements the core functionality of the hybrid blockchain system:

- **On-Chain Integrity Layer**: Solidity smart contracts for storing record hashes
- **Off-Chain Encrypted Storage**: IPFS with AES-256-GCM encryption + password-based key derivation
- **Application Interface**: Next.js frontend with public/private credential verification

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                        │
│                  (Next.js Frontend)                          │
│  • Institution Registration                                  │
│  • Issuer Dashboard (issue records)                         │
│  • Verifier Dashboard (verify with optional secret key)     │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                 On-Chain Integrity Layer                      │
│              (RecordRegistry Smart Contract)                 │
│  • Issue records (store keccak256 hash)                     │
│  • Revoke records                                           │
│  • Verify records                                           │
│  • Access control (authorized issuers)                       │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                Off-Chain Storage Layer                        │
│                    (IPFS + Encryption)                       │
│  • AES-256-GCM encryption                                   │
│  • PBKDF2 key derivation from student password              │
│  • IPFS content addressing                                   │
└─────────────────────────────────────────────────────────────┘
```

## 🔑 Key Feature: Public/Private Credentials

This system implements a **dual-layer credential system**:

### Public Data (On-Chain)
Visible to everyone without any secret key:
- Full Legal Name
- Program/Major
- Enrollment Status
- Degree Awarded

### Private Data (Encrypted IPFS)
Requires student's secret key to decrypt:
- GPA
- Course Grades (per course)
- Minor
- Concentration
- Graduation Date
- Transcript Details

### Off-Chain Only Data
Encrypted but **never stored on blockchain** (GDPR compliant):
- Disciplinary Records

### How It Works

1. **Issuer** creates a record with:
   - Public fields → stored on-chain in metadata
   - Private fields → encrypted with student's secret key, stored in IPFS
   - Sensitive fields → encrypted, stored in IPFS, never referenced on-chain

2. **Verifier** enters record hash:
   - Without secret key → sees only public data
   - With secret key → decrypts and sees private data too

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- MetaMask wallet

### Installation

```bash
# Install backend dependencies
cd prototype
npm install

# Install frontend dependencies
cd frontend
npm install
```

### Running the Prototype

1. **Start a local blockchain:**

```bash
cd prototype
npm run node
```

2. **In a new terminal, deploy the smart contracts:**

```bash
npm run deploy
```

3. **Start the frontend:**

```bash
cd frontend
npm run dev
```

4. **Open browser** to http://localhost:3000

## 📁 Project Structure

```
prototype/
├── contracts/
│   ├── RecordRegistry.sol       # Core record management
│   ├── InstitutionRegistry.sol # University registration
│   ├── StudentIdentity.sol    # Student wallet management
│   └── VerificationLog.sol   # Audit logging
├── scripts/
│   ├── deploy.js              # Contract deployment
│   ├── demo-workflow.js      # CLI workflow demo
│   └── link-contracts.js     # Link contracts together
├── frontend/
│   ├── app/
│   │   ├── page.tsx          # Landing page
│   │   ├── institution/     # Institution registration
│   │   ├── issuer/          # Issue credentials
│   │   ├── verifier/        # Verify credentials
│   │   └── records/         # Manage records
│   ├── lib/
│   │   ├── contract.ts      # Ethers.js contract calls
│   │   ├── encryption.ts    # AES-256-GCM + PBKDF2
│   │   └── ipfs.ts         # IPFS via Pinata
│   └── context/
│       └── WalletContext.tsx # MetaMask connection
├── data/
│   └── sample-record.json    # Sample data
├── hardhat.config.js         # Hardhat config
└── package.json              # Dependencies
```

## 🔬 How It Works

### 1. Issue Academic Record

1. University registers as authorized issuer
2. Fill in student details:
   - **Public fields** (name, degree, program) → stored on-chain
   - **Private fields** (GPA, grades) → encrypted with student's secret key
   - **Sensitive** (disciplinary) → encrypted, never on-chain
3. Student receives their secret key from the institution

### 2. Verify Academic Record (Without Secret)

1. Enter record hash
2. System shows public data:
   - Full Legal Name
   - Program/Major
   - Enrollment Status
   - Degree Awarded
3. Record is verified as valid/invalid

### 3. Verify Academic Record (With Secret)

1. Enter record hash
2. Enter student's secret key
3. System decrypts private data:
   - GPA
   - Course Grades
   - Minor/Concentration
   - Graduation Date
   - Transcript Details

### 4. Revoke Academic Record

1. Issuer calls `revokeRecord(hash)` on smart contract
2. Record status changes to invalid
3. Any verification after this returns invalid

## ⛽ Gas Costs

| Function | Gas Estimate |
|----------|-------------|
| issueRecord | ~150,000 gas |
| revokeRecord | ~50,000 gas |
| getRecordStatus | ~30,000 gas (view call) |

## 🔐 Security Features

- **Tamper Evidence**: Any modification to the off-chain file changes the hash
- **Access Control**: Only authorized universities can issue records
- **Revocation**: Original issuer can revoke records
- **Student Sovereignty**: Student controls their secret key
- **Dual-Layer Privacy**: Public vs private credential separation
- **Secret Key Protection**: PBKDF2 (100,000 iterations) for key derivation
- **GDPR Compliance**: Off-chain only data can be deleted without affecting blockchain
- **AES-256-GCM**: Industry-standard encryption

## 📝 Testing on Public Testnets

To deploy to Sepolia testnet:

1. Create `.env` file:
```env
SEPOLIA_PRIVATE_KEY=your_private_key
RPC_URL=https://rpc.sepolia.org
```

2. Get Sepolia ETH from a faucet

3. Deploy:
```bash
npx hardhat run scripts/deploy.js --network sepolia
```

4. Update frontend contract addresses in `frontend/lib/contract.ts`

## 🛠️ Technologies

| Component | Technology |
|-----------|------------|
| Blockchain | Ethereum |
| Smart Contracts | Solidity 0.8.19 |
| Development | Hardhat |
| Frontend | Next.js 14 |
| Web3 | Ethers.js v5 |
| Encryption | AES-256-GCM + PBKDF2 |
| Storage | IPFS (Pinata) |
| Styling | Tailwind CSS |
| Wallet | MetaMask |

## 📚 Documentation

- [Full Project Documentation](../PROJECT_DOCUMENTATION.md)
- [RecordRegistry Smart Contract](contracts/RecordRegistry.sol)
- [InstitutionRegistry Smart Contract](contracts/InstitutionRegistry.sol)
- [StudentIdentity Smart Contract](contracts/StudentIdentity.sol)
- [VerificationLog Smart Contract](contracts/VerificationLog.sol)
- [Workflow Demo Script](scripts/demo-workflow.js)

## 🔄 Updated Features (v2.0)

- ✅ Public/Private credential separation
- ✅ Student secret key for private data access
- ✅ Course grade tracking with semester details
- ✅ Off-chain only data (disciplinary records)
- ✅ Enhanced issuer dashboard with all student fields
- ✅ Dual-mode verifier (with/without secret key)

## 📄 License

MIT

