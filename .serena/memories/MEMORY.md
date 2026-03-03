# Shiori Project Memory

## Architecture
- Clean Architecture + DDD: domain → application → presentation/infrastructure
- TanStack Router with file-based routing; `routeTree.gen.ts` is **auto-generated but must be manually updated** when adding new routes in Docker workflow
- Run tests via: `docker compose run --rm app npm run test`
- TypeScript check: `docker compose run --rm app npx tsc --noEmit` (pre-existing errors in infrastructure crypto/storage files are expected)

## Key Files
- Domain entities: `src/domain/entities/Shiori.ts`
- Validation: `src/domain/services/ShioriValidationService.ts` (`validateShioriData`, `DomainValidationError`)
- JSON parser: `src/infrastructure/parsing/jsonParser.ts` (`parseJsonText`)
- Route tree: `src/routeTree.gen.ts` (must be manually updated when adding routes)

## SessionStorage Keys
- `shiori:edit-draft` — itinerary being edited (written by builder/shared view, read by /edit)
- `shiori:builder-draft` — JSON returning from /edit to /builder

## Implemented Features (as of 2026-02-18)
- `/edit` route: form edit + JSON edit modes, AI edit panel, preview, sticky summary bar
- `editShiori.ts`: pure immutable update functions for Shiori state
- `generateEditPrompt.ts`: AI edit prompt generator embedding current JSON
- Editor components: ReorderControls, ItemEditor, DayEditor, EditPageHeader, EditModeTab, JsonEditPanel, AiEditPanel, EditSummaryBar
