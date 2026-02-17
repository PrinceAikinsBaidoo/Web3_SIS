# Academic Records Registry - Frontend

Next.js frontend for the Hybrid Blockchain Academic Records System.

## Features

- **Issuer Dashboard**: University staff can issue new academic records to the blockchain
- **Verify Records**: Anyone can verify the authenticity of academic records
- **View Records**: View all records issued by your institution
- **MetaMask Integration**: Connect wallet for authentication and signing transactions

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

4. Deploy the smart contract (in a new terminal):
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
│   ├── issuer/            # Issuer dashboard
│   ├── verifier/          # Record verification
│   └── records/           # View all records
├── components/            # React components
├── lib/                   # Utility functions (contract service)
├── types/                 # TypeScript type definitions
└── public/                # Static assets
```

## Smart Contract

The frontend connects to the `RecordRegistry` smart contract deployed on the Hardhat local network. 

- Contract Address: `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`
- Network: Localhost (Chain ID: 31337)

## Usage

### Issuing a Record

1. Connect your wallet (must be an authorized issuer)
2. Navigate to "Issuer Dashboard"
3. Fill in the student details
4. Click "Issue Record"
5. Confirm the transaction in MetaMask

### Verifying a Record

1. Navigate to "Verify Records"
2. Enter the record hash (or plain text to auto-hash)
3. Click "Verify"
4. View the verification result

### Revoking a Record

1. Navigate to "All Records"
2. Connect your wallet
3. Click "Revoke" on any valid record
4. Confirm the transaction in MetaMask

## Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Blockchain**: Ethers.js v5
- **Wallet**: MetaMask
- **Language**: TypeScript

## License

MIT

