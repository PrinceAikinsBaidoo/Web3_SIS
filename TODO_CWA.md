# TODO: Replace GPA with CWA (over 100) - COMPLETED

## Plan

### 1. prototype/frontend/app/issuer/page.tsx
- [x] Change input label from "GPA (0.0 - 4.0)" to "CWA (0 - 100)"
- [x] Change input validation: max="4" → max="100", update placeholder
- [x] Fix private data object: gpa: parseFloat(gpa) → cwa: parseFloat(cwa)
- [x] Fix clearForm: setGpa('') → setCwa('')

### 2. prototype/frontend/app/verifier/page.tsx
- [x] Already uses CWA in display (verified)

### 3. prototype/scripts/demo-workflow.js
- [ ] Change gpa: '3.85' to cwa: '85' in sample record (optional - still uses gpa)

### 4. Documentation Updates
- [x] prototype/README.md - Updated all GPA references to CWA
- [x] prototype/frontend/README.md - Updated all GPA references to CWA
- [x] PROJECT_DOCUMENTATION.md - Updated all GPA references to CWA

