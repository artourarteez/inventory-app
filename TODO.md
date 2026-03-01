# Refactor Alert & Notification Handling — TODO

## Steps

- [x] Create TODO.md
- [ ] 1. Edit `src/lib/uiText.ts` — Add success, error, and empty state text keys
- [ ] 2. Edit `src/pages/Dashboard.tsx` — Add loading/error states, descriptive empty state
- [ ] 3. Edit `src/pages/MasterItems.tsx` — Replace alert() with inline error/success banners, add loading state
- [ ] 4. Edit `src/pages/Transactions.tsx` — Remove redundant alert() calls, replace API error alert() with inline banner, add success/loading states
- [ ] 5. Edit `src/pages/Reports.tsx` — Replace alert() for PDF errors with inline banners, improve steel usage empty state logic
