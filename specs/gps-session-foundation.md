# GPS session foundation

## Goal
- Define the shared data model, navigation structure, settings, and reusable UI pieces used by GPS session features.

## Scope
### Included
- Shared session data model
- App navigation layout
- Settings surface shared by recording and review flows
- Shared UI components used across GPS screens
- Debug logging behavior

### Out of scope
- Recording lifecycle rules
- Gap detection and correction rules
- GPX export details
- Per-session summary logic

## Data model
### sessions
- `id`
- `started_at`
- `ended_at`
- `status` (`idle` / `recording` / `paused` / `finished`)
- `is_background_active`
- `paused_reason`
- `distance_m`
- `moving_time_s`
- `avg_speed`
- `max_speed`
- `point_count`
- `note`
- `created_at`
- `updated_at`

### session_points
- `id`
- `session_id`
- `latitude`
- `longitude`
- `altitude`
- `accuracy`
- `speed`
- `timestamp`
- `created_at`

### session_gaps
- `id`
- `session_id`
- `gap_started_at`
- `gap_ended_at`
- `reason`
- `correction_mode`

### playback_state
- `session_id`
- `current_timestamp`
- `playback_position`
- `is_playing`
- `zoom_level`

### app_state
- `session_id`
- `last_foreground_at`
- `last_motion_at`
- `is_background_notified`
- `auto_pause_threshold_s`

## UI
### Navigation
- No bottom tab bar.
- The app uses stack navigation:
  - Root: Home screen (`app/index.tsx`)
  - Session list: accessible from the Home screen via a button
  - Session detail: pushed from the session list (`app/session/[id].tsx`)
  - Settings: accessible from the Home screen via a button
- The explore / placeholder tab has been removed.

### Settings
- Configuration screen for behavior that should not be hardcoded.
- Includes a numeric GPS recording interval field, defaulting to 2 seconds.
- Includes GPS precision settings.
- Includes the auto-pause threshold and related stop-detection behavior.
- Includes the gap detection threshold (default: 10 seconds, range: 5–300 seconds).
- Includes background recording behavior and notification preferences.
- Includes export behavior such as GPX filename rules or share flow.
- Includes debug info for development use.
- Includes an on/off switch for persistent debug log storage.
- Includes export and full-delete actions for stored debug logs.
- Retention settings can stay out of scope for now if not needed.
- This screen should answer the question: "how should the app behave by default?"

## Component split
### Home
- `RecordingControlCard`
	- start / pause / resume / stop actions
	- current state label
- Live stats row (inline in Home screen, not a separate card)
	- elapsed time, current speed (km/h), distance (km or m)
	- visible only when session is active (recording or paused)
- `BackgroundStatusBanner`
	- background recording state
	- notification-related hints
- `ErrorBanner`
	- permission / GPS / pause-resume failures
- top-right navigation buttons
	- session list / settings shortcuts

### Session list
- `SessionListItem`
	- date
	- duration
	- distance
	- status
- `SessionListEmptyState`
	- no-recording message
- `SessionListHeader`
	- overall summary preview

### Session detail
- `SessionDetailHeader`
	- session date, status, summary
- `RoutePreviewMap`
	- zoom controls
	- route playback / scrubbing
	- gap visibility
- `RoutePlaybackSlider`
	- time slider and playback position
- `SessionDetailStats`
	- distance, time, speed, point count
- `SessionDetailActions`
	- export, delete, correction entry
- `GapCorrectionPanel`
	- missing-segment list and correction entry points

### Settings
- `AutoPauseSettings`
	- threshold and stop detection related controls
- `BackgroundBehaviorSettings`
	- background notification and logging rules
- `ExportSettings`
	- GPX naming and share behavior
- `DebugSettings`
	- development-only details

### Shared pieces
- `ConfirmDialog`
- `StatusChip`
- `MetricRow`
- `EmptyState`
- `ErrorState`
- `LoadingState`

### Debug logging
- Debug output should continue to appear in the development console.
- When persistent debug logging is enabled, logs should be stored with timestamp and message content.
- Log export should share a plain-text file.
- A full delete action should remove all stored debug logs.

## Notes
- Keep the implementation compatible with current SQLite-first architecture.
- Session modeling should be introduced before feature growth continues.