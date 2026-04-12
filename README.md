# vehicle-management-app

![CI](https://github.com/unicore32/vehicle-management-app/actions/workflows/ci.yml/badge.svg)

Personal-use GPS logger and vehicle management app (in active development).

## TL;DR
- Purpose: record trip location history in background and expand into vehicle management.
- Current state: GPS logging, SQLite persistence, route map, tests, and CI are in place.
- Map behavior: Home shows the live current location and exposes a focus-current-location button only after the map is panned away from center; session detail keeps attribution in the top-left and zoom controls in the top-right.
- Quality gate: run `pnpm run check` before pushing.

## Quick Start
```bash
pnpm install
pnpm run android
```

## Daily Commands
```bash
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm run check
pnpm run format
```

## Constraints
- Development build is required for native features like background task + MapLibre.
- Expo Go is not the target runtime for this app.
- Background logging requires foreground/background location permissions.
- Local Node 24 is acceptable; CI is pinned to Node 22.

## Architecture
- `app/`: route screens and composition.
- `components/`: reusable UI components.
- `hooks/`: UI orchestration and query wiring.
- `services/`: Expo/OS integration logic.
- `tasks/`: background task definitions.
- `lib/`: persistence and domain logic.
- `lib/database/`: schema/bootstrap/migration-related setup.

## Data Snapshot
- Database: `gps_logger.db` via `expo-sqlite`.
- Main table: `locations`.
- Core fields: `latitude`, `longitude`, `altitude`, `accuracy`, `speed`, `timestamp`, `created_at`.

## Versioning (Development Stage)
- App version (`app.json`): `0.1.0`.
- EAS version source: `remote`.
- `preview` and `production` builds use `autoIncrement` for build numbers.

## Current State (for LLM Handoff)
- CI workflow: `.github/workflows/ci.yml`.
- CI checks: `lint`, `typecheck`, `test`.
- Latest verified local check: `pnpm run check` passed.
- Agent rules source of truth: `AGENTS.md`.

## Next TODO
- [ ] Add vehicle-centric domain model (vehicle/trip/fuel/maintenance).
- [ ] Add export feature (CSV/GPX).
