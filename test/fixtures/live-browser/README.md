# Isolated Live browser acceptance fixture

Run from the staged workspace root with existing dependencies:

```sh
node frontend/test/fixtures/live-browser/server.mjs
```

Only `127.0.0.1:54394` is opened. The fixture bundles the actual student presence
hook, dedicated Axios transport, route/store readers, admin Live table, detail and
query hooks. It substitutes same-origin HTTP/auth/data. It never loads either app
entry point, an external SDK, Nest AppModule, Redis, database, AI, payments or media.
Self-only CSP blocks external requests. The synthetic recording toggle is a state
indicator, not a microphone test. Expected injected 503 responses appear in the
browser console. Close this listener after acceptance; do not touch other ports.

Use the installed Playwright CLI, without installing dependencies. Open
`/student?user=student-a`, another same-user tab, `/student?user=student-b`, and
`/admin`. Preparation/Start/Finish buttons change the real hook's route context and
use actual producer stores. Section evidence and admin HTTP counts are simulated;
real SQL semantics are covered independently by the guarded backend runner.
`/admin/students/student-a` uses the actual detail component with 61 synthetic
history rows. `/fixture/control` accepts `failPresence` / `failAdmin` booleans;
`/fixture/state` returns only synthetic reports, closes and observed HTTP requests.
Admin's localStorage token is visibly synthetic and only partitions the real client
cache; this fixture does not prove real JWT/role authorization.

Virtual-time checks require `page.clock.install()` **before reload**, then reload
so new timers are intercepted. Advance visible student by30s, hidden by60s; route
changes by5s; visible admin by20s. Visibility changes can be simulated with a
configurable `document.visibilityState` plus `visibilitychange`. Before admin
freshness checks, align browser time with fixture `live.observedAt`; wait for the
freshness effect. Hide admin, advance60s, assert no requests and no live badges.
These checks test event handling, not OS background timer throttling.

Acceptance results and exact recorded commands are in backend verification
`2026-10-05-admin-live-activity.md` and the controller's Task5 evidence directory.
Screenshots are synthetic-only and live under workspace `output/playwright/`.
