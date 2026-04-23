# app/dashboard - UI Pages

## OVERVIEW
6 main pages: contracts, documents, matters, vendors, approvals, settings. Plus dynamic routes for documents/[id].

## STRUCTURE
```
dashboard/
├── layout.tsx          # Sidebar + main content wrapper, Clerk auth
├── contracts/page.tsx
├── documents/
│   ├── page.tsx
│   └── [id]/
│       ├── page.tsx    # Document detail
│       ├── edit/page.tsx
│       └── sign/page.tsx
├── matters/page.tsx
├── vendors/page.tsx
├── approvals/page.tsx
├── settings/page.tsx
├── templates/page.tsx
└── ai/page.tsx
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Layout | `layout.tsx` | Clerk currentUser, Sidebar component |
| Data fetching | Each page.tsx | `useEffect` + `lib/api.ts` |
| Sidebar | `components/layout/sidebar.tsx` | Navigation, responsive |

## CONVENTIONS
- Server component layout, client component pages
- `useEffect` for data fetching (not server actions)
- Tailwind v4 classes, `@tailwindcss/postcss`
- Radix UI primitives for dialogs, dropdowns, toasts
- `lucide-react` icons

## ANTI-PATTERNS
- `eslint-disable react-hooks/set-state-in-effect` on all 6 pages
- No loading states (skeleton/shimmer missing on most pages)
- No error boundaries
