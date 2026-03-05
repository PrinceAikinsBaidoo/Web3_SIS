# TODO: Replace GPA with CWA (over 100)

## Plan

### 1. prototype/frontend/app/issuer/page.tsx
- [x] Change input label from "GPA (0.0 - 4.0)" to "CWA (0 - 100)"
- [x] Change input validation: max="4" → max="100", update placeholder
- [x] Fix private data object: gpa: parseFloat(gpa) → cwa: parseFloat(cwa)
- [x] Fix clearForm: setGpa('') → setCwa('')
- [x] Update status messages referencing GPA to CWA

### 2. prototype/frontend/app/verifier/page.tsx
- [x] Change "grades, GPA" to "grades, CWA" in helper text

### 3. prototype/scripts/demo-workflow.js
- [x] Change gpa: '3.85' to cwa: '85' in sample record

## Completed
All GPA references have been successfully replaced with CWA (over 100) across the codebase.

