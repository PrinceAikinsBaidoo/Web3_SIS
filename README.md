# Hybrid Blockchain System for Secure Storage and Verification of Academic Records

A prototype **hybrid** architecture for academic credentials: **on-chain** integrity (who issued what, when, revocation) with **off-chain** encrypted payloads (IPFS / Pinata) and optional **student-held secrets** for private fields.

---

## Current status

| Area | Status | Notes |
|------|--------|--------|
| Smart contracts | Complete | `InstitutionRegistry`, `RecordRegistry`, `StudentIdentity`, `VerificationLog` |
| Frontend | Complete | Next.js 14 (App Router), five main flows |
| IPFS | Complete | Pinata; demo mode without keys |
| Encryption | Complete | AES-256-GCM + PBKDF2 for private payloads |
| Wallet | Complete | MetaMask; reads follow the connected chain |
| Local dev workflow | Documented | Deploy **must** target the live Hardhat node (see below) |

Contract addresses after each deploy are written to [`prototype/contract-addresses.json`](prototype/contract-addresses.json). The dev server can load them via [`prototype/frontend/app/api/contract-addresses/route.ts`](prototype/frontend/app/api/contract-addresses/route.ts) so the UI stays aligned with the latest deploy without rebuilding.

---

## Architecture (short)

1. **Institution registry** — Institutions register and manage authorized issuing wallets.
2. **Record registry** — Issues and revokes records by hash; **linked** to the institution registry so any institution-authorized wallet can issue (not only the deployer).
3. **Student identity & verification log** — Supporting flows for identity and audit logging.
4. **Application layer** — Next.js UI, encryption, IPFS upload, MetaMask.

---

## Project layout

```
Web3_SIS/
├── prototype/
│   ├── contracts/              # Solidity sources
│   ├── scripts/
│   │   ├── deploy.js           # Deploy all contracts + link RecordRegistry → InstitutionRegistry
│   │   ├── link-contracts.js   # Optional linking / demo setup on existing deploy
│   │   └── setup-issuer.js     # Optional Hardhat-side demo (specific test wallet)
│   ├── frontend/
│   │   ├── app/
│   │   │   ├── api/contract-addresses/  # Serves contract-addresses.json to the browser
│   │   │   ├── institution/
│   │   │   ├── issuer/
│   │   │   ├── verifier/
│   │   │   └── records/
│   │   ├── lib/                # contract.ts, encryption.ts, ipfs.ts, formatAddress.ts
│   │   └── context/WalletContext.tsx
│   └── contract-addresses.json # Updated by npm run deploy
├── IMPLEMENTATION_TODO.md
└── README.md
```

---

## Prerequisites

| Tool | Notes |
|------|--------|
| [Node.js](https://nodejs.org/) | 18+ |
| npm | Bundled with Node |
| [Git](https://git-scm.com/) | Any recent version |
| [MetaMask](https://metamask.io/) | For local or testnet |

---

## Run from scratch

### 1. Install dependencies

```bash
cd prototype
npm install
cd frontend
npm install
```

### 2. Environment (optional)

Create `prototype/frontend/.env.local` if you use Pinata or custom RPC / addresses:

- `NEXT_PUBLIC_RPC_URL` — default `http://127.0.0.1:8545`
- `NEXT_PUBLIC_RECORD_REGISTRY` or `NEXT_PUBLIC_RECORD_REGISTRY_ADDRESS` (and the same pattern for the other three contracts)
- Pinata keys for real IPFS uploads (otherwise demo CIDs)

Without Pinata, issuance still works using the demo IPFS path.

### 3. Start the local chain

**Terminal A:**

```bash
cd prototype
npm run node
```

Leave this running. Hardhat listens on **http://127.0.0.1:8545** (chain ID **31337**).

### 4. Deploy to that node (important)

**Terminal B:**

```bash
cd prototype
npm run deploy
```

`npm run deploy` runs `hardhat run scripts/deploy.js --network localhost`, so contracts are deployed **onto the JSON-RPC node** from step 3. If you deploy without `--network localhost` while using `hardhat node`, contracts would not appear where MetaMask points.

Deploy output also **links** `RecordRegistry` to `InstitutionRegistry` so institution-authorized wallets can call `issueRecord`.

### 5. Start the frontend

**Terminal C:**

```bash
cd prototype/frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 6. MetaMask

Add a custom network (or use MetaMask’s Localhost entry) with:

- **RPC URL:** `http://127.0.0.1:8545` (prefer `127.0.0.1` over `localhost` on Windows if anything behaves oddly)
- **Chain ID:** `31337`
- **Currency symbol:** ETH

Import a test private key from the Hardhat node console output if you need a funded non-deployer account.

### 7. Optional Hardhat scripts

```bash
cd prototype
npx hardhat run scripts/link-contracts.js --network localhost
npx hardhat run scripts/setup-issuer.js --network localhost
```

Useful for extra demo setup; fresh flows normally use the UI after deploy.

---

## Using the application

1. **Connect wallet** — Navbar “Connect Wallet”.
2. **Institution** (`/institution`) — Register the institution (your connected wallet becomes the institution owner and is included in authorized wallets). Self-accredit when prompted for the demo.
3. **Issuer** (`/issuer`) — Fill public and private fields, set a student secret, issue; copy the record hash when done.
4. **Verifier** (`/verifier`) — Verify by hash; optional secret for private fields.
5. **All Records** (`/records`) — Revoke credentials. Use **Revoke + unpin (erasure)** to remove the encrypted IPFS object from Pinata (availability removal), then revoke on-chain; use **Revoke on-chain only** if you only need to invalidate the credential without touching Pinata.

---

## Right to erasure (GDPR-oriented, realistic scope)

Blockchain state is **append-only**: you cannot erase that a transaction occurred, but you can **invalidate** the credential (`revokeRecord`) and stop hosting off-chain data.

This prototype supports **two steps**:

1. **Availability removal** — `POST /api/ipfs/unpin` (Next.js **server route**) calls Pinata’s **unpin** API so your pinning service drops the CID. The **All Records** page exposes **Revoke + unpin (erasure)** (unpin first, then on-chain revoke).
2. **On-chain invalidation** — Revocation marks the record **not valid** for verifiers.

**Cryptographic erasure** (making ciphertext unreadable even if a copy exists) is **not** fully automated here: private payloads are encrypted with a **student secret**; operational policy should ensure secrets are rotated or destroyed when required. A future upgrade is **per-record DEKs** with dual-wrap (institution + student).

### Pinata credentials for unpin

Prefer **server-only** variables in `prototype/frontend/.env.local` (read by the API route, not bundled to the browser):

- `PINATA_JWT`, or  
- `PINATA_API_KEY` + `PINATA_SECRET_API_KEY`

For local development only, the route also falls back to `NEXT_PUBLIC_PINATA_API_KEY` / `NEXT_PUBLIC_PINATA_SECRET_KEY` if those are set (upload still uses them today). For production, move all Pinata secrets to server-only names and keep uploads behind a server API as well.

**Note:** Unpinning does not guarantee global deletion if someone else pinned the same CID; thesis language should say **availability removal** from your infrastructure.

---

## Troubleshooting

| Symptom | What to check |
|---------|----------------|
| “No bytecode” / registry errors | `npm run node` running; `npm run deploy` from `prototype` with **localhost** network; MetaMask RPC and chain ID **31337**. |
| “Caller is not an authorized issuer” | Redeploy with current `deploy.js` (registry link). Re-register institution with the wallet you issue from. |
| Port `8545` in use | Stop the old `node` / Hardhat process or pick another port in Hardhat config (and match MetaMask). |
| Institution name missing on issuer | Owner vs authorized-wallet resolution and case-normalized address checks (see `contract.ts` / issuer page). |
| IPFS errors | Expected without Pinata; use keys for real uploads. |
| Unpin skipped / no erasure | Configure `PINATA_JWT` or `PINATA_API_KEY` + `PINATA_SECRET_API_KEY` in `.env.local` and restart `npm run dev`. Demo CIDs are never pinned, so unpin is skipped. |

---

## Scripts reference

```bash
# prototype/
npm run node      # Local chain
npm run deploy    # Deploy + link to localhost:8545
npm test          # Hardhat tests (default in-process network)

# prototype/frontend/
npm run dev       # Dev server
npm run build     # Production build
npm run start     # Run production build
```

---

## Recent improvements (engineering)

- Deploy targets **localhost** so MetaMask and Hardhat share the same state.
- **RecordRegistry** calls **`setInstitutionRegistry`** after deploy so institution-authorized wallets can issue.
- Frontend **hydrates** addresses from `contract-addresses.json` via API; supports **`NEXT_PUBLIC_*`** and **`NEXT_PUBLIC_*_ADDRESS`** env names.
- Read path prefers the **connected wallet’s provider** (and explicit binding) to avoid split-brain RPC issues.
- **Bytecode probe** (wallet RPC vs HTTP) to surface MetaMask RPC mismatches.
- Institution registration checks and navbar **address formatting**; **`suppressHydrationWarning`** on `<body>` for extension-injected attributes.
- **IPFS unpin API** and **Revoke + unpin** on `/records` for GDPR-style availability removal (with honest limits documented above).

---

## Future features

Roadmap items for research, production, and thesis follow-up (not implemented in this prototype unless noted):

### Security and governance

- **Hardened access control** on Solidity (e.g. Ownable / roles) for `setInstitutionRegistry`, accreditation updates, and issuer administration instead of demo-open patterns.
- **External accreditation oracle** or multi-party approval before an institution is treated as accredited in production.
- **Key management** beyond static student secrets: recovery, rotation, hardware-bound keys, or integration with **W3C Verifiable Credentials** / **DIDs**.

### Product and interoperability

- **Standard credential formats** (e.g. VC-JWT, Open Badges 3.0) and **cross-chain** or **L2** deployment for cost and throughput.
- **Employer / third-party verifier** APIs with rate limits, signed attestations, and privacy-preserving disclosure (selective reveal, ZK-style proofs where appropriate).
- **Student-controlled portal** to link wallets, consent to verification, and manage authorized verifiers (`StudentIdentity` flows in the UI).

### Operations and quality

- **CI pipeline** (compile, test, lint frontend), **Sepolia** (or other testnet) smoke deploy, and versioned **release notes** for contract addresses.
- **Gas profiling** and contract size optimization; **events indexing** (subgraph or indexer) for explorer-grade history.
- **E2E tests** for issue → IPFS → verify; monitoring and **structured logging** in the frontend for demo and field trials.

### Research evaluation (thesis-aligned)

- **Quantitative evaluation**: latency vs registrar systems, gas per issuance, availability under node failure scenarios.
- **Qualitative / threat modeling**: insider abuse, key compromise, registry compromise; comparison with **Blockcerts**-style and purely centralized designs.
- **Policy and compliance** framing: GDPR / retention, right to erasure vs immutability, institutional liability.

Contributions toward any of the above can be tracked in [`IMPLEMENTATION_TODO.md`](IMPLEMENTATION_TODO.md) or your own project board.

---

## License

MIT

---

*Last updated: April 2026*
