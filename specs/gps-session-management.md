# GPS session management

## Goal
- Manage GPS logging as a session-based feature instead of a simple point collector.
- Support pause/resume, GPX export, per-session inspection, deletion, and summary display.
- Allow later correction for missing or degraded GPS segments.

## Scope
### Included
- Start / pause / resume / stop of GPS logging
- Session list and session detail views
- Per-session summary
- GPX export
- Deletion of one session at a time
- Missing-segment correction support
- Background GPS logging
- Background recording notification
- Automatic pause after prolonged stop / idling
- Manual deletion of sessions and exported files

### Out of scope
- Cloud sync
- Multi-device sharing
- Public store distribution UX
- Advanced route editing beyond basic correction

## Terms
- **Session**: one drive / trip / logging period.
- **Track point**: one recorded GPS sample.
- **Missing segment**: a time range where GPS could not be recorded reliably.

## Behavior
### Logging state
- `idle`: not recording
- `recording`: actively collecting GPS points
- `paused`: session exists, but point collection is temporarily stopped
- `background`: recording continues while the app is backgrounded

### Location sampling interval
- GPS recording should use a configurable sampling interval.
- The setting is entered as a numeric value in seconds.
- Default value: 2 seconds.
- The configured interval is applied when recording starts or resumes.

### Pause / resume
- Pause keeps the session open.
- Resume continues the same session.
- Pause time is excluded from moving time.
- The UI must clearly show that the session is paused.

### Background recording
- GPS logging should continue while the app is in the background, if permissions allow it.
- When the app enters the background during an active session, show a push/local notification that recording is still running.
- The notification should clearly indicate that background logging is active.
- Background recording should reuse the same session and point data model.
- If background location permission is denied, background logging should stop while the app is backgrounded.
- If notification permission is denied, recording should continue and only the notification presentation should be skipped.

### Per-session display
Each session should show at least:
- start time
- end time
- duration
- distance
- average speed
- max speed
- point count
- route preview map

### GPX export
- Export should work per session.
- Output should be a `.gpx` file containing ordered track points.
- File name should be timestamp-based, for example `trip-2026-04-05-0830.gpx`.
- Export should preserve raw timestamps as much as possible.

### Route preview playback
- The session detail preview map should support zoom in and zoom out.
- The preview should start more zoomed in by default so the route is easier to inspect at a glance.
- The preview should support a time slider for scrubbing through the route.
- When the slider moves, the displayed trajectory should update to match the selected timestamp.
- The preview should support incremental playback from start to end.
- Initial playback state should start at the latest recorded point so the default map view shows the end of the route.
- Gaps in GPS data should remain visible or otherwise distinguishable in the preview.

### Deletion
- Deletion should be performed per session.
- Deleting a session must also delete its track points and related missing-segment records.
- A confirmation dialog is required before deletion.
- Exported GPX files may remain after session deletion if they were already shared or saved elsewhere.

### Summary
#### Session summary
- duration
- distance
- average speed
- max speed
- point count
- start / end time

Summary calculation policy:
- Total distance should be calculated from consecutive valid track points using their ordered coordinates.
- Average speed should be based on moving time, not total wall-clock duration.
- Wall-clock duration may include idle stop time, but paused time should be excluded from moving time.
- If the session has gaps, summary values should use the recorded/corrected route as the source of truth.

#### Overall summary
- total sessions
- total distance
- total moving time
- average speed
- max speed
- monthly session count

### Missing GPS correction
- When points are missing, the session should preserve a missing-segment record.
- A session detail view should support correction later.
- First implementation can use simple interpolation between surrounding points.
- Manual correction can be added later if needed.
- If GPS acquisition fails temporarily, the session should keep the missing segment and allow later correction.
- A gap is detected when the timestamp difference between consecutive GPS points exceeds the configured threshold.
- The gap detection threshold is configurable from settings (default: 10 seconds, range: 5–300 seconds).
- Detected gaps are stored in `session_gaps` with `reason: 'gps_timeout'`.
- Interpolation generates intermediate points at 10-second intervals using linear interpolation of coordinates, altitude, and speed.
- Interpolated points are inserted into `session_points`; original points are never modified.
- After correction, `correction_mode` is updated to `'interpolated'`.

### Automatic pause on long stop
- If the device stays stopped for a configured period, recording should auto-pause.
- The pause decision should be based on both movement and time.
- The stop threshold should be configurable from settings.
- The first version can use a sensible default value, but the user should be able to change it later.
- Auto-pause should not end the session.
- The UI should show why the session paused, if possible.
- A fixed default threshold should be defined in the implementation, but the exact value should be user-adjustable later.

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
- The app uses a stack-based navigation:
  - Root: Home screen (`app/index.tsx`)
  - Session list: accessible from the Home screen via a button (Phase 3)
  - Session detail: pushed from the session list (`app/session/[id].tsx`)
  - Settings: accessible from the Home screen via a button (Phase 3)
- The explore / placeholder tab has been removed.

### Home
- The map fills the entire screen as a background layer.
- Before recording starts, the map should show the device's current location as a single marker, similar to the route end marker.
- A floating bottom panel (semi-transparent, rounded top) overlays the lower portion of the map.
- The bottom panel contains:
  - Live stats row when a session is active: elapsed time, current speed, distance traveled.
  - Recording control buttons: start / pause / resume / stop depending on state.
- A small control area in the top-right corner provides session list and settings navigation.
- Error and background-recording banners appear at the top of the screen.
- On Android, the system/navigation bar should stay dark in fullscreen map mode.
- Live stats shown while recording or paused: elapsed time, current speed (km/h), distance (km or m).
- Distance is computed live from all recorded points using haversine; the final accurate value is recalculated at stop time.
- If an error occurs, the error message is visible without hiding the main controls.
- This screen should answer the question: "is recording running right now?"

### Session list
- Secondary browsing screen for past sessions.
- Lists sessions in reverse chronological order.
- Each row should show date, duration, distance, and current status.
- Tapping a row opens the session detail screen.
- Empty state should explain that no sessions have been recorded yet.
- This screen should answer the question: "what did I record before?"

### Session detail
- Fullscreen review screen for one session.
- The map fills the entire screen behind the controls.
- The map should support pinch zoom or explicit zoom in / zoom out controls.
- The bottom sheet starts collapsed and shows only 走行日時 and 距離.
- The collapsed summary should show the start datetime on the left, 距離 larger on the right, and a smaller 走行終了 line underneath.
- Swiping up on the sheet handle or summary area expands it to reveal playback controls and the rest of the session details.
- Swiping down on the sheet handle or summary area collapses it back to the summary state.
- Playback, stats, gap correction, and actions are mounted from the initial render so they can appear progressively as the sheet expands.
- A time slider should scrub through the route and update the displayed path.
- Playback controls should let the user play / pause / drag through the route.
- Playback panel, session stats, missing-segment markers, and export/delete actions are shown only after expansion.
- The only formatted 走行日時 display should be the top summary area.
- Export/delete actions should stay pinned in the bottom-sheet footer so they are always reachable.
- The map camera should shift upward as the sheet expands so the visible trajectory is not hidden behind the bottom sheet.
- If there are not enough points for playback, keep the panel visible and show an empty state instead of hiding it.
- The initial map focus should be on the latest visible playback point, not the start of the session.
- Includes GPX export and deletion actions.
- Includes a correction entry point for fixing missing or bad GPS segments later.
- This screen should answer the question: "what happened during this specific drive?"

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
- Session modeling should be introduced before feature growth continues.
- Pause/resume and GPX export should be implemented on top of session data, not raw points only.
- The first version can focus on simple interpolation for correction.
- Keep the implementation compatible with current SQLite-first architecture.
- Preview playback should reuse the same session/point data as export and summary.
- Background recording should keep the same session alive even when the app is not visible.
- Auto-pause should be treated as a UI/behavior rule, not as session deletion.
- Auto-pause threshold should be configurable rather than hardcoded.
- If location permission is denied, recording should not start.
- If pause/resume fails, show an error and keep the existing session/log state intact.
- If the app crashes during an active session, restore into a paused session on the next launch and let the user correct later.
- Background notification content should be minimal and route back to the recording/session screen.
- GPS acquisition failures should be tolerated as missing segments and corrected later rather than blocking the whole session.
- Development-stage migration may break old data if needed; preserveability is optional for now.
