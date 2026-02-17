# Implementation Plan: Loading Animation + IPFS System

## Step 1: Loading Animation for Long-Running Processes (COMPLETED)
- [x] 1.1 Create custom hook `useDelayedLoading.ts` - triggers loading state after 2 seconds
- [x] 1.2 Create `LoadingSpinner` component with smooth animation
- [x] 1.3 Apply to institution/page.tsx
- [x] 1.4 Apply to issuer/page.tsx
- [x] 1.5 Apply to records/page.tsx
- [x] 1.6 Apply to verifier/page.tsx

## Step 2: IPFS System Implementation (COMPLETED)
- [x] 2.1 Create `lib/ipfs.ts` with IPFS configuration
- [x] 2.2 Implement `uploadToIPFS(data)` function
- [x] 2.3 Implement `getFromIPFS(cid)` function
- [x] 2.4 Update issuer/page.tsx to use real IPFS upload
- [x] 2.5 Update contract.ts to handle IPFS metadata (via metadata field in contract)

## Testing
- [ ] Test loading animation appears after 2 seconds
- [ ] Test IPFS upload returns valid CID
- [ ] Verify complete workflow: issue record → IPFS storage → verification

