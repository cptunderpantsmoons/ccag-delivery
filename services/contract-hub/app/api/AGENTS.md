# app/api - REST API Routes

## OVERVIEW
20 route files across 10 domains. Next.js App Router API routes with Zod validation and Drizzle queries.

## STRUCTURE
```
api/
├── contracts/        # CRUD + [id] routes
├── documents/        # CRUD + [id]/sign + [id]/audit
├── matters/          # CRUD + [id] routes
├── vendors/          # CRUD + [id] routes
├── approvals/        # CRUD + [id] routes (approve/reject)
├── ai/               # AI analysis + generate-document
├── sharepoint/       # Graph API proxy
├── settings/         # Config + integrations + test-connection
├── docassemble/      # Document assembly
└── health/           # Health check
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Validation | Zod schemas at top of route.ts files | NOT in separate files |
| Error handling | `errorResponse()` helper (duplicated 5x) | `{ error, code, status }` |
| Auth | `getCurrentUser()` from `lib/auth/current-user.ts` | Returns `{ userId, tenantId, email, name }` |

## CONVENTIONS
- Zod schemas inline in route files (not extracted)
- `errorResponse()` for consistent error shape
- POST routes check auth; GET routes skip (MVP)
- Drizzle `.select()`, `.insert()`, `.update()`, `.delete()`
- `searchParams` for filtering (status, type, search, limit, offset)

## ANTI-PATTERNS
- `eslint-disable @typescript-eslint/no-explicit-any` in contracts, matters, documents, approvals routes
- PUT routes accept raw body without validation (security gap)
- No tenant isolation on GET routes (returns all tenants' data)
- `errorResponse` helper duplicated - should extract to `lib/api-helpers.ts`
