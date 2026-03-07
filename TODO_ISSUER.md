# Issuer Page Enhancement TODO

## Task: Add IPFS hash to outputs and enhance student details

### Steps:
1. [x] Analyze codebase and understand current implementation
2. [x] Create implementation plan
3. [x] Update issuer/page.tsx with:
   - [x] Add publicly viewable fields (credential ID, credential type, graduation year, etc.)
   - [x] Add private/secret fields (student ID, DOB, GPA, grades, etc.)
   - [x] Integrate IPFS upload using actual credentials
   - [x] Display IPFS hash in output
4. [x] Test the implementation (requires running the app)

## Implementation Complete!

### Public Fields Added (stored on-chain):
- Credential ID / Certificate Serial Number
- Credential Type (degree, diploma, transcript, badge, certificate, achievement)
- Full Legal Name (already existed)
- Program/Major (already existed)
- Graduation Year
- Issue Date (auto-filled, can be changed)
- Enrollment Status
- Degree Awarded
- Validity status (auto-set to valid)
- Blockchain transaction reference (auto-generated)

### Private Fields Added (stored in IPFS, require secret key):
- Student ID / Index Number
- Date of Birth
- Email
- Phone Number
- GPA / CGPA
- Class Rank
- Course Grades (multiple entries with course code, name, credits, grade, semester)
- Internal Remarks

### IPFS Integration:
- Uses `uploadToIPFS` function from `@/lib/ipfs`
- Reads credentials from environment variables:
  - `NEXT_PUBLIC_PINATA_API_KEY`
  - `NEXT_PUBLIC_PINATA_SECRET_KEY`
- Displays IPFS CID in success message
- Provides clickable link to IPFS gateway

