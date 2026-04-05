# GPS session management

## Goal
- Manage GPS logging as a session-based feature instead of a simple point collector.
- Support pause/resume, GPX export, per-session inspection, deletion, and summary display.
- Allow later correction for missing or degraded GPS segments.

## Related specs
- Shared navigation, settings, data model, and reusable UI pieces are defined in [specs/gps-session-foundation.md](specs/gps-session-foundation.md).

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

## Notes
- Session modeling should be introduced before feature growth continues.
