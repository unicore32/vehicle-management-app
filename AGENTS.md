# Project Guidelines

## Scope
These instructions apply to all AI coding agents working in this repository.
If a tool-specific rule file exists, it should defer to this file.

## Source of Truth
- Use this file as the canonical instruction set.
- Do not create parallel rule systems that duplicate or contradict this file.

## Stack
- Expo + React Native + TypeScript
- TanStack Query for async state orchestration
- expo-sqlite for persistence
- Biome for lint/format
- Jest for tests

## Required Commands
Run these commands before finalizing substantial code changes:
- `pnpm run lint`
- `pnpm run typecheck`
- `pnpm run test`

Useful commands:
- `pnpm run lint:fix`
- `pnpm run format`
- `pnpm run android`

## Code Style
- Keep TypeScript strict. Avoid `any`; use explicit types or `unknown` with narrowing.
- Use Biome as formatter/linter authority for style.
- Keep changes minimal and task-focused. Avoid unrelated refactors.
- Prefer small, composable functions over large multi-purpose blocks.

## Architecture Conventions
- `app/`: route screens and screen composition only.
- `components/`: reusable UI components.
- `hooks/`: UI-facing orchestration and query wiring.
- `services/`: platform/SDK integration (Expo APIs, OS-facing behavior).
- `tasks/`: background task definitions.
- `lib/`: persistence, domain logic, and pure utility logic.
- `lib/database/`: schema/bootstrap/migration-related persistence setup.

## Data and Domain Rules
- Do not place SQL access directly in screen components.
- Keep calculation logic (stats, cost, mileage, aggregations) outside UI components.
- When schema changes are introduced, treat migrations as first-class work.

## Testing Rules
- Add or update tests when behavior changes.
- Prioritize tests for:
  - domain logic in `lib/`
  - hooks with behavior branching
  - persistence boundary behavior
- Avoid brittle snapshot-heavy tests for logic validation.

## Safety Rules
- Never run destructive git commands unless explicitly requested.
- Do not revert user changes outside the task scope.
- Do not edit build artifacts or generated directories unless required.

## PR/Change Hygiene
- Keep diffs reviewable and coherent.
- Mention any follow-up work if something is intentionally left out.
- If a task cannot be completed, state what is blocked and why.
