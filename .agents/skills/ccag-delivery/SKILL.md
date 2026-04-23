```markdown
# ccag-delivery Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches the core development conventions and workflows used in the `ccag-delivery` TypeScript codebase. You'll learn about file naming, import/export styles, commit message patterns, and how to structure and run tests. This guide ensures consistency and efficiency for contributors.

## Coding Conventions

### File Naming
- Use **camelCase** for all file names.
  - Example: `orderService.ts`, `userRepository.ts`

### Import Style
- Use **relative imports** for referencing other modules.
  - Example:
    ```typescript
    import { getOrder } from './orderService';
    ```

### Export Style
- Use **named exports** for all exported functions, classes, or constants.
  - Example:
    ```typescript
    // orderService.ts
    export function getOrder(id: string) { ... }
    export const ORDER_STATUS = { ... };
    ```

### Commit Message Patterns
- Follow **Conventional Commits**.
- Use the `build` prefix for build-related changes.
  - Example:
    ```
    build: update TypeScript to v4.9.0 for improved type safety
    ```
- Keep commit messages concise (average ~76 characters).

## Workflows

### Code Commit Workflow
**Trigger:** When committing code changes  
**Command:** `/commit`

1. Stage your changes:  
   ```
   git add .
   ```
2. Write a commit message following the conventional commit format, e.g.:
   ```
   git commit -m "build: update dependency versions"
   ```
3. Push your changes:
   ```
   git push
   ```

### Testing Workflow
**Trigger:** When writing or updating code to ensure correctness  
**Command:** `/test`

1. Identify or create a test file matching the pattern `*.test.*` (e.g., `orderService.test.ts`).
2. Write tests for your code changes.
3. Run the tests using your preferred test runner (framework not specified; consult project documentation or package.json for details).
   ```
   # Example (if using Jest)
   npx jest
   ```
4. Ensure all tests pass before committing.

## Testing Patterns

- Test files follow the pattern: `*.test.*` (e.g., `userRepository.test.ts`).
- The testing framework is not explicitly defined; check project dependencies for specifics.
- Place tests alongside implementation files or in a dedicated `tests` directory.
- Example test file:
  ```typescript
  // orderService.test.ts
  import { getOrder } from './orderService';

  describe('getOrder', () => {
    it('returns the correct order for a given id', () => {
      // test implementation
    });
  });
  ```

## Commands

| Command    | Purpose                                   |
|------------|-------------------------------------------|
| /commit    | Commit code following conventional format |
| /test      | Run all tests in the codebase             |
```
