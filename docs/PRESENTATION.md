# Web3_SIS — Presentation Guide

## 1. Opening (non-technical, 2–3 minutes)

### Hook

Academic credentials unlock education and careers, but “prove this degree is real” often depends on PDFs, email, or ringing a registrar. That is slow, error-prone, and hard to audit when something goes wrong.

### What this project is (one sentence)

**Web3_SIS** is a **prototype** that lets an **institution** issue a credential in a way that is **difficult to forge** and **easy to check**, while keeping **sensitive student data off the public chain** unless the student allows it.

### Who cares (stakeholders)

| Stakeholder | What they gain |
|-------------|----------------|
| **Institution** | A repeatable way to anchor issuance and support audits. |
| **Student** | Control over how much detail is revealed (e.g. via a secret). |
| **Verifier** (employer, embassy, school) | Faster integrity check without trusting a single private server forever. |

### What “success” looks like in the demo

1. An institution registers and (in demo mode) self-accredits.  
2. The same wallet **issues** a credential with public + private fields.  
3. A verifier checks the **record hash** on-chain and optionally unlocks **private** data with the student’s secret.

### Why mention blockchain at all (non-hype)

The goal is not “crypto for its own sake.” The chain provides a **tamper-evident, shared anchor** for *who attested to what and when*, so verification does not depend on one university’s database alone. **Trust in the truth of the underlying facts** still rests with the issuer; the system makes **misrepresenting issuance** harder and **verification** more repeatable.

**Bridge sentence for the next section:**  
“So far I have described the **user story** and outcomes. Next I will walk through **what we built**: what lives on-chain, what stays off-chain, and how we protect private data.”

---

## 2. Architecture (technical, 4–6 minutes)

### Three layers (simple diagram in words)

1. **Rules and identity (institutions)** — Who may act as an issuer; which wallets belong to which institution.  
2. **Integrity layer (records)** — A **hash** of the credential payload and public metadata anchored on-chain; revocation and timestamps.  
3. **Confidentiality layer (off-chain)** — Encrypted payload stored via **IPFS** (Pinata in this prototype); the chain holds references, not raw transcripts in the clear.

### On-chain vs off-chain (examiner-friendly)

| On-chain | Off-chain |
|--------|-----------|
| Institution registration, authorized wallets, record hash, issuance time, validity, public metadata string | Encrypted private fields, large documents, IPFS CID |

### Smart contracts (names and roles)

| Contract | Role |
|----------|------|
| **InstitutionRegistry** | Institutions register; authorized wallets can issue on behalf of the institution. |
| **RecordRegistry** | `issueRecord` / `revokeRecord`; **linked** to `InstitutionRegistry` so authorized institution wallets are recognized as issuers. |
| **StudentIdentity** | Student wallet and verifier authorization (prototype support). |
| **VerificationLog** | Audit-style logging of verification activity. |

### Cryptography and storage (high level)

- **AES-256-GCM** with **PBKDF2** for encrypting private fields before upload.  
- **IPFS** (Pinata when configured; demo mode without keys).  
- **Record hash** ties the on-chain anchor to the off-chain content the institution committed to.

### Local demonstration stack

- **Hardhat** node on `http://127.0.0.1:8545`, chain ID **31337**.  
- **`npm run deploy`** uses **`--network localhost`** so contracts are on the **same** node MetaMask uses.  
- **Next.js 14** frontend, **ethers.js v5**, **MetaMask**.

---

## 3. Live demo script (5–8 minutes)

**Before you start:** Terminal A: `npm run node` (in `prototype/`). Terminal B: `npm run deploy`. Terminal C: `npm run dev` (in `prototype/frontend/`). MetaMask: custom network, RPC `http://127.0.0.1:8545`, chain **31337**. Use a funded test account (e.g. Hardhat default accounts).

| Step | Action | What to say (short) |
|------|--------|---------------------|
| 1 | Open `http://localhost:3000` | “This is the application shell; everything runs locally for the prototype.” |
| 2 | Connect MetaMask | “The wallet is the institution’s and issuer’s identity in this demo.” |
| 3 | **Institution** → register → self-accredit | “The institution anchors itself on-chain; self-accredit is demo-only.” |
| 4 | **Issuer** → fill public + private fields → set secret → issue | “Public summary goes in on-chain metadata; sensitive fields are encrypted and referenced via IPFS.” |
| 5 | Copy **record hash** from success UI | “This hash is what verifiers use as the handle to the anchored record.” |
| 6 | **Verifier** → paste hash → verify | “Anyone can check integrity and issuer without the secret.” |
| 7 | Optional: enter **secret** | “With the student’s agreement, the verifier can align private details off-chain.” |

If something fails, fall back to: “In production we would add monitoring, testnet rehearsal, and formal accreditation workflows; here we focus on the integrity and confidentiality split.”

---

## 4. Suggested slide deck (titles only)

You can map one slide per line or merge related lines.

1. Title — Hybrid academic records: integrity on-chain, confidentiality off-chain  
2. Problem — Centralized verification and trust boundaries  
3. Goal — Issuer, student, verifier outcomes  
4. Non-technical story — Register → issue → verify  
5. **Pivot** — “Under the hood” overview  
6. Architecture diagram — Three layers (rules / integrity / confidentiality)  
7. On-chain vs off-chain table  
8. Smart contracts — Four contracts, one sentence each  
9. Cryptography — Hash, AES-GCM, IPFS reference  
10. Demo environment — Hardhat + MetaMask + Next.js  
11. Live demo (screenshots if video not allowed)  
12. Limitations and future work — governance, VC/DID, testnet, evaluation (see README “Future features”)  
13. Q&A

---

## 5. Anticipated questions (short answers)

**Q: Do you still trust the university?**  
A: Yes. The chain attests to **issuance and integrity**, not to moral truth. It reduces reliance on a single opaque database for **verification**, not on the issuer’s honesty.

**Q: What if the private key is lost?**  
A: Same class of problem as passwords today. Production systems need **recovery policies**, custodial options, or **DIDs**—listed as future work.

**Q: GDPR / right to be forgotten vs immutability?**  
A: The design keeps **personal data** largely off-chain; revocation and policy layers are part of future compliance work. Immutability applies mainly to **anchors and audit events**, not necessarily to raw PII in the clear.

**Q: Why not put everything on-chain?**  
A: Cost, size, and **privacy**. Public chains are a poor place for full transcripts and national IDs.

**Q: Gas and scale?**  
A: Prototype on local chain; a thesis chapter can compare gas per `issueRecord` and discuss **L2s** or batched issuance as future work.

**Q: How is this different from Blockcerts?**  
A: Same family of ideas (anchor + verify); this prototype emphasizes **institution registry**, **multi-wallet issuance**, **encrypted IPFS payload**, and a concrete **Next.js + Hardhat** stack for demonstration.

---

## 6. Limitations (say explicitly — builds credibility)

- **Demo accreditation** is not a real accreditation authority.  
- **Access control** on contracts is simplified for a student prototype.  
- **No formal penetration test** or production key management.  
- **IPFS pinning** depends on Pinata or similar operational choices.  
- **Evaluation metrics** (latency, gas, comparison to SQL registries) are roadmap items for the thesis evaluation chapter.

---

## 7. References in this repository

| Resource | Use |
|----------|-----|
| [README.md](../README.md) | Setup, troubleshooting, future features list |
| [IMPLEMENTATION_TODO.md](../IMPLEMENTATION_TODO.md) | Engineering checklist |
| `prototype/contracts/` | Source of truth for behavior |
| `prototype/frontend/` | UI flows matching the demo script |

---

*Document version: 1.0 — April 2026*
