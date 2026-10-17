# Stale module recovery implementation plan

> Execute the authorized fix natively in this session, with tests before implementation and a final review.

**Goal:** Open student tabs continue across releases; failed route loads show a Turkish recovery screen instead of React Router's technical error.

**Architecture:** Retain public Vite assets from earlier frontend images for seven days in each new image, separately for the canonical and legacy origins. Store age/current-build metadata with those assets so repeated releases do not extend old assets forever. Give each top-level route a static error boundary, with manual reload only.

**Tech stack:** Existing React 19, React Router, Vite, Node DOM tests, Python deployment receiver, Docker.

**Spec:** User approved preserving old release files and a clear refresh option after a missing dashboard chunk was verified (old 404, current 200).

## Global constraints

- Start from live frontend `90827d6451b4dd2b6989349de92926f328cd87b0`; preserve unrelated local edits.
- No new dependencies, database changes, AI calls, account/session/draft clearing, or automatic page reloads.
- Retain only regular public asset files; never old HTML, runtime secrets, symlinks or private learner files.
- Preserve protected server configs, backend/admin and unrelated containers.
- Deploy only the reviewed source and the narrowly scoped receiver hook; keep rollback copies.

## Review focus

- An older tab must fetch the previous dashboard module and its dependencies after the release.
- Repeated releases must not renew expired retained files indefinitely.
- A failed exam navigation must never trigger an automatic reload or falsely promise answers are saved.
- Offline/Safari/general errors need readable copy without stack traces or asset URLs.
- Colliding names, symlinks, unexpected metadata and oversized retained payloads fail safely before rollout.

## Tasks

1. Write and run failing DOM tests for module/generic error rendering, manual retry, draft/session preservation, and router coverage.
2. Add a static `RouteErrorPage` and a small error classification helper; apply it at every root route. Use semantic main/heading/button, focus the heading, preserve current URL on explicit refresh.
3. Write failing Python tests for seven-day retention across releases, current-file priority, collision/symlink/metadata guards and origin-separated Docker integration.
4. Add `deploy/retain-frontend-assets.py`; layer retained assets and age metadata onto the newly built frontend image. Hook the live receiver only for frontend releases. Seed the first retained image from the recent images for the same origin.
5. Run targeted tests, the source checkout's full Node tests, deployment guards, lint and build. Test an actual missing login module on a local preview and retry after recovery, plus a mobile viewport.
6. Review the patch, capture runtime/protected-config hashes, back up and update the active receiver, publish the reviewed frontend via the existing GitHub workflow.
7. Verify old and new public asset URLs, retained metadata/age, current dashboard navigation and readable recovery UI; record proof and update project state.
