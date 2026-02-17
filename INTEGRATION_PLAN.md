# Full Integration Plan: InstitutionRegistry → RecordRegistry

## Problem Analysis
- RecordRegistry only allows pre-authorized addresses to issue records
- InstitutionRegistry exists but isn't connected to RecordRegistry
- No way for new institutions to get authorized automatically

## Solution Architecture
```
┌─────────────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│  Institution       │     │  InstitutionRegistry │     │   RecordRegistry    │
│  registers         │────▶│  - Register          │────▶│   - Check if        │
│  (with domain,     │     │  - Self-accredit    │     │     institution    │
│   accreditation)   │     │  - Add wallets      │     │     authorized      │
└─────────────────────┘     └──────────────────────┘     └─────────────────────┘
```

## Implementation Steps

### Step 1: Update RecordRegistry.sol
- [ ] Add import for InstitutionRegistry interface
- [ ] Add state variable for InstitutionRegistry address
- [ ] Add function to set InstitutionRegistry address (owner only)
- [ ] Add modifier or function to check if address is authorized via institution
- [ ] Modify issueRecord to allow institution-based authorization

### Step 2: Update contract.ts (Frontend)
- [ ] Add InstitutionRegistry contract functions
- [ ] Add check for institution-based authorization
- [ ] Update isAuthorizedIssuer to check both direct + institution

### Step 3: Update Frontend Pages
- [ ] Add institution registration flow
- [ ] Add wallet management for institutions
- [ ] Update issuer dashboard to show authorization status

### Step 4: Test Complete Workflow
- [ ] Register institution
- [ ] Add authorized wallet
- [ ] Issue record with authorized wallet
- [ ] Verify record

## Files to Modify
1. prototype/contracts/RecordRegistry.sol
2. prototype/frontend/lib/contract.ts
3. prototype/frontend/app/issuer/page.tsx
4. Create new: prototype/frontend/app/institution/page.tsx (registration flow)

## Edge Cases to Handle
- Institution not registered
- Institution not accredited
- Wallet not added to institution
- Contract owner hasn't set InstitutionRegistry address
- Multiple wallets per institution

