# lib/services - AI & Integration Layer

## OVERVIEW
AI integration (OpenRouter/OpenCode), SharePoint (MSAL/Graph API), DocAssemble, template library. All external service calls.

## WHERE TO LOOK
| File | Purpose |
|------|---------|
| `opencode-ai.ts` | Contract review, extraction, analysis prompts. OpenRouter model routing. |
| `sharepoint.ts` | MSAL auth, Graph API CRUD, file upload/download, metadata. |
| `ai.ts` | AI provider abstraction, model selection logic. |
| `docassemble.ts` | Document assembly integration. |
| `template-library.ts` | Prompt template management. |

## CONVENTIONS
- OpenRouter API for all LLM calls (multi-provider access)
- Tiered models: extraction (cheap), review (balanced), analysis (quality)
- MSAL confidential client for SharePoint (not delegated auth)
- Structured output via JSON schema when available

## ANTI-PATTERNS
- Don't hardcode model IDs - use `config/models.ts` constants
- Don't catch all errors - let API errors propagate with status codes
- `eslint-disable @typescript-eslint/no-explicit-any` on L296, L303, L545 (technical debt)
