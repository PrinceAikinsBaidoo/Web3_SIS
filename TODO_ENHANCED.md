# Enhanced Credentials System - Implementation Plan

## Task Overview
Update the Web3 Student Identity System to support public/private credentials with secret key access.

## Current System Analysis

### Files to Modify:
1. `prototype/frontend/app/issuer/page.tsx` - Add all student fields + secret key input
2. `prototype/frontend/lib/encryption.ts` - Add password-derived key encryption (already has PBKDF2)
3. `prototype/frontend/app/verifier/page.tsx` - Add optional secret key to reveal private data
4. `prototype/frontend/lib/contract.ts` - Update types if needed

## Implementation Steps

### Step 1: Update Issuer Page
- [ ] Add new student fields:
  - **Public**: Full legal name, Program/Major, Enrollment status, Degree awarded
  - **Private**: GPA, Grades per course, Minor(s), Concentration, Graduation date, Transcript details
  - **Off-chain only**: Disciplinary records (no hash reference)
- [ ] Add secret key input field (student sets their password)
- [ ] Encrypt private fields using student's secret key
- [ ] Store public fields in on-chain metadata

### Step 2: Update Encryption Library
- [ ] Ensure PBKDF2 key derivation is working
- [ ] Export functions for encrypting with password
- [ ] Export functions for decrypting with password

### Step 3: Update Verifier Page
- [ ] Add optional secret key input field
- [ ] Show public data always (from on-chain metadata)
- [ ] If secret provided → decrypt IPFS data and show private fields

## Field Categorization

### Public (On-Chain Metadata - Always Visible):
- fullLegalName
- programMajor
- enrollmentStatus
- degreeAwarded

### Private (IPFS Encrypted - Requires Secret):
- gpa
- grades (per course)
- minor
- concentration
- graduationDate
- transcriptDetails

### Off-Chain Only (Encrypted IPFS - No Hash Reference):
- disciplinaryRecords (if any)

## Student Data Input Structure
```typescript
interface StudentRecord {
  // Public (on-chain)
  fullLegalName: string;
  programMajor: string;
  enrollmentStatus: 'active' | 'graduated' | 'suspended' | 'completed';
  degreeAwarded: string;
  
  // Private (IPFS encrypted with secret)
  gpa: number;
  grades: CourseGrade[];
  minor?: string;
  concentration?: string;
  graduationDate: string;
  transcriptDetails: string;
  
  // Off-chain only (encrypted, never referenced on-chain)
  disciplinaryRecords?: string;
}
```

## Verification Flow
1. Enter record hash → System queries blockchain
2. Public data displayed (from metadata)
3. Optional: Enter secret key
4. If secret valid → Decrypt IPFS → Show private data

## Testing Checklist
- [ ] Issue record with all fields + secret
- [ ] Verify public data without secret
- [ ] Verify private data with correct secret
- [ ] Verify no data shown with wrong secret
- [ ] Test disciplinary records are never on-chain

