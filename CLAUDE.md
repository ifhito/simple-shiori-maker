# Shiori Agent Guide

## Architecture rules
1. Follow `Clean Architecture + DDD` for all new code.
2. Follow `TDD` by default: write or update a failing test first, implement minimally to pass, then refactor safely.
3. Keep dependency direction one-way: `presentation -> application -> domain`. Infrastructure may depend on domain/application abstractions, but domain must not depend on infrastructure.
4. Put UI concerns only in `presentation` (routes, screens, navigation, hooks, UI state). Do not place API calls, crypto logic, or parsing logic in UI components.
5. Put use-case orchestration in `application` (prompt generation, structured JSON validation, share-link creation flow, DTO mapping).
6. Put business rules and invariants in `domain` (entities, value objects, repository interfaces, domain services).
7. Put external integrations in `infrastructure` (server route handlers, crypto adapters, localStorage adapters, hosting/runtime integration). Always implement repository interfaces here.
8. Preserve MVP flow boundaries: `Prompt Generation -> External LLM -> Paste structured JSON -> Encrypt via API -> Share URL -> Unlock and View`.
9. Keep feature-first organization inside each layer when the codebase grows, but do not break layer boundaries.
10. Prefer additive changes over cross-layer shortcuts. If a shortcut is needed, document why in PR/commit notes.
11. Use Docker-based Node workflows for project commands (`docker compose ...`) instead of host-node assumptions. If Docker is unavailable, document the local fallback in README.
12. Mobile-first is mandatory. Any UI change must preserve smartphone usability as a first-class requirement.

## Known mistakes
1. Mistake: Calling encryption/decryption APIs directly from deeply nested UI components without application-level orchestration.
   Next-time fix: Route all flow control through application use cases and keep components thin.
2. Mistake: Accepting malformed LLM JSON silently.
   Next-time fix: Hard-fail parsing with explicit field-level errors and keep retry/edit path.
3. Mistake: Failing to validate `key` before decrypt flow.
   Next-time fix: Validate early, show clear recovery path, never attempt decrypt without a key.
4. Mistake: Storing plaintext password or decrypted itinerary in persistent storage.
   Next-time fix: Store only passhash metadata in localStorage; keep decrypted data in memory only.
5. Mistake: Treating shared links as public content by default.
   Next-time fix: Keep password-protected flow as default and require explicit product decision for any public mode.
6. Mistake: Adding direct in-app paid LLM API calls during prototyping.
   Next-time fix: Keep MVP design: generate prompt in-app, use external provider manually, paste results back.
7. Mistake: Mixing planning/reference docs with runtime app logic.
   Next-time fix: Keep plan docs (`PLAN.md`, notes) as references only; production logic belongs under app source.

## Constraints

### Security constraints
1. Never store plaintext passwords anywhere (client, server logs, or persistent storage).
2. Store only passhash metadata in localStorage (`shiori:passhash:<key>`), never raw itinerary plaintext.
3. Treat external LLM output as untrusted input; validate and sanitize structured fields before encryption and rendering.
4. Never commit secrets (API keys, tokens, runtime credentials). Use environment variables only.
5. Keep encryption operations server-side API owned (`/api/encrypt`, `/api/decrypt`) in MVP SSR/API architecture.

### Performance constraints
1. Keep create/share flow responsive on mobile networks; avoid blocking UI and preserve in-progress user input on failures.
2. Keep decrypt path bounded and fail fast on invalid payload format.
3. Avoid unnecessary round-trips: one request for encrypt, one request for decrypt.
4. Ensure mobile layout works without horizontal scrolling at `320px+` widths.

### Cost constraints
1. Do not call paid LLM APIs from the app in MVP; external provider usage is user-driven.
2. Avoid introducing paid infrastructure (DB/KV/queues) before MVP validation unless explicitly approved.
3. Minimize server compute work per request and avoid redundant crypto operations.
