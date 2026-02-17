# Hybrid Blockchain System for Secure Storage and Verification of Academic Records

A working prototype demonstrating a three-tiered hybrid blockchain architecture for secure academic credential storage and verification.

## 📋 Overview

This prototype implements the core functionality of the hybrid blockchain system:

- **On-Chain Integrity Layer**: Solidity smart contract for storing record hashes
- **Off-Chain Encrypted Storage**: Simulated IPFS storage with AES-256-GCM encryption
- **Application Interface**: Node.js scripts demonstrating the workflow

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                        │
│                  (Node.js Demo Scripts)                     │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                 On-Chain Integrity Layer                     │
│              (RecordRegistry Smart Contract)                │
│  • Issue records (store keccak256 hash)
│  • Revoke records                                           │
│  • Verify records                                           │
│  • Access control (authorized issuers)                      │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                Off-Chain Storage Layer                       │
│                    (IPFS + Encryption)                       │
│  • AES-256-GCM encryption                                   │
│  • IPFS content addressing                                  │
│  • Student-controlled decryption keys                        │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 16+
- npm or yarn

### Installation

```bash
cd prototype
npm install
```

### Running the Prototype

1. **Start a local blockchain:**

```bash
npm run node
```

2. **In a new terminal, deploy the smart contract:**

```bash
npm run deploy
```

3. **Run the workflow demonstration:**

```bash
npm run demo
```

## 📁 Project Structure

```
prototype/
├── contracts/
│   └── RecordRegistry.sol    # Smart contract
├── scripts/
│   ├── deploy.js             # Deployment script
│   └── demo-workflow.js      # Complete workflow demo
├── data/
│   └── sample-record.json    # Sample academic record
├── hardhat.config.js         # Hardhat configuration
├── package.json              # Dependencies
└── README.md                 # This file
```

## 🔬 How It Works

### 1. Issue Academic Record

1. University encrypts student record (AES-256-GCM)
2. Upload encrypted record to IPFS → get CID
3. Compute keccak256 hash of encrypted data
4. Call `issueRecord(hash, metadata)` on smart contract

### 2. Verify Academic Record

1. Employer receives encrypted record + CID
2. Download from IPFS
3. Compute keccak256 hash
4. Call `getRecordStatus(hash)` on smart contract
5. Check if record is valid and not revoked

### 3. Revoke Academic Record

1. University calls `revokeRecord(hash)` on smart contract
2. Record status changes to invalid
3. Any verification after this returns invalid

## ⛽ Gas Costs

The prototype uses these functions:

| Function | Gas Estimate |
|----------|-------------|
| issueRecord | ~100,000 gas |
| revokeRecord | ~50,000 gas |
| getRecordStatus | ~30,000 gas (view call) |

## 🔐 Security Features

- **Tamper Evidence**: Any modification to the off-chain file changes the hash
- **Access Control**: Only authorized universities can issue records
- **Revocation**: Original issuer can revoke records
- **Student Sovereignty**: Student controls decryption keys
- **GDPR Compliance**: Off-chain deletion makes on-chain hash meaningless

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

## 📚 Documentation

- [RecordRegistry Smart Contract](contracts/RecordRegistry.sol)
- [Workflow Demo Script](scripts/demo-workflow.js)
- [Product Requirements](product%20requirements%20chat.md)

## 🛠️ Technologies

- **Ethereum** - Blockchain platform
- **Solidity** - Smart contract language
- **Hardhat** - Development environment
- **Node.js** - Runtime for off-chain scripts
- **Ethers.js** - Blockchain interaction library
- **AES-256-GCM** - Symmetric encryption

## 📄 License

MIT

