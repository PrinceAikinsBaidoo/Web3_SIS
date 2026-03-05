# Academic Records Registry - Frontend

Next.js frontend for the Hybrid Blockchain Academic Records System with public/private credential support.

## Features

- **Issuer Dashboard**: University staff can issue new academic records with public/private data
- **Public/Private Credentials**: Dual-layer system with student secret key for private data
- **Verify Records**: Anyone can verify credentials (public data visible, private data requires secret)
- **View Records**: View all records issued by your institution
- **MetaMask Integration**: Connect wallet for authentication and signing transactions

## 🔑 Key Feature: Public/Private Credentials

### Public Data (Visible to Everyone)
- Full Legal Name
- Program/Major
- Enrollment Status
- Degree Awarded

### Private Data (Requires Secret Key)
- CWA
- Course Grades
- Minor/Concentration
- Graduation Date
- Transcript Details

### How Verification Works

**Without secret key:**
1. Enter record hash
2. See public information only

**With secret key:**
1. Enter record hash
2. Enter student's secret key
3. See all data (public + private)

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- MetaMask browser extension
- Hardhat blockchain network running locally

### Installation

1. Navigate to the frontend directory:
```bash
cd prototype/frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the blockchain (from the prototype root):
```bash
cd ..
npm run node
```

4. Deploy the smart contracts (in a new terminal):
```bash
npm run deploy
```

5. Start the Next.js development server:
```bash
cd frontend
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Connecting to Local Blockchain

1. Open MetaMask
2. Click "Add Network" 
3. Add the following:
   - Network Name: Localhost 8545
   - New RPC URL: http://127.0.0.1:8545
   - Chain ID: 31337
   - Currency Symbol: ETH

4. Import a test account:
   - Copy an account private key from Hardhat (shown when running `npm run node`)
   - In MetaMask: Account Menu → Import Account → Paste private key

## Project Structure

```
frontend/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Home page
│   ├── issuer/            # Issue credentials (public + private)
│   ├── verifier/          # Verify credentials (with/without secret)
│   ├── records/           # View all records
│   └── institution/       # Register institution
├── components/            # React components
│   ├── Navbar.tsx        # Navigation bar
│   └── LoadingSpinner.tsx # Loading states
├── lib/                   # Utility functions
│   ├── contract.ts       # Ethers.js contract service
│   ├── encryption.ts     # AES-256-GCM + PBKDF2 encryption
│   └── ipfs.ts          # IPFS upload/download
├── context/               # React context
│   └── WalletContext.tsx # Wallet connection state
├── hooks/                 # Custom React hooks
│   └── useDelayedLoading.ts
└── types/                 # TypeScript definitions
```

## Smart Contracts

The frontend connects to multiple smart contracts:

| Contract | Purpose |
|----------|---------|
| RecordRegistry | Core record management |
| InstitutionRegistry | University registration |
| StudentIdentity | Student wallet management |
| VerificationLog | Audit logging |

**Localhost Addresses:**
```
RecordRegistry: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
InstitutionRegistry: 0x5FbDB2315678afecb367f032d93F642f64180aa3
```

## Usage

### Registering an Institution

1. Connect your wallet
2. Navigate to "Institution"
3. Fill in institution details
4. Click "Register Institution"
5. Optionally self-accredit (demo mode)

### Issuing a Record (with Public/Private Data)

1. Connect your wallet (must be an authorized issuer)
2. Navigate to "Issuer Dashboard"
3. Fill **PUBLIC** fields (name, program, degree) - visible to everyone
4. Fill **PRIVATE** fields (CWA, grades) - requires secret key
5. Set student's **SECRET KEY** (minimum 6 characters)
6. Click "Issue Record"
7. Confirm the transaction in MetaMask

**Important:** Share the secret key with the student - they'll need it to share their private data with employers!

### Verifying a Record (Basic)

1. Navigate to "Verify Records"
2. Enter the record hash
3. Click "Verify"
4. View public information:
   - Full Legal Name ✓
   - Program/Major ✓
   - Enrollment Status ✓
   - Degree Awarded ✓

### Verifying a Record (Full)

1. Navigate to "Verify Records"
2. Enter the record hash
3. Click "Verify"
4. Click "Have a secret key?" to expand
5. Enter the student's secret key
6. Click "Decrypt"
7. View ALL data including private fields

### Revoking a Record

1. Navigate to "All Records"
2. Connect your wallet
3. Click "Revoke" on any valid record
4. Confirm the transaction in MetaMask

## Technology Stack

| Component | Technology |
|-----------|------------|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS |
| Blockchain | Ethers.js v5 |
| Wallet | MetaMask |
| Encryption | AES-256-GCM + PBKDF2 |
| IPFS | Pinata API |
| Language | TypeScript |

## Security Features

- **AES-256-GCM**: Industry-standard encryption
- **PBKDF2**: 100,000 iterations for key derivation
- **Student-Controlled Keys**: Only student can access private data
- **Dual-Layer**: Public vs private credential separation
- **GDPR Compliant**: Off-chain only data can be deleted

## License

MIT

