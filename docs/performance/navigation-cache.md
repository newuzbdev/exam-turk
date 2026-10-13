# Navigation data cache — 12 October 2026

Returning to noncritical pages displays the current account's previously loaded
data immediately, with stale data refreshed in the background. The policy uses
the existing TanStack Query client; no new dependency or disk persistence.

- Practice catalogs (Reading, Listening, Writing, Speaking), Mock catalog,
  workbook list and public banner/recent-result data use `usePageDataQuery`.
- Keys include account identity, domain and ordering/selection where applicable.
  Catalogs are fresh for 60 seconds; unused data is collected after 10 minutes.
- AuthContext cancels/removes page-data queries belonging to a previous account.
  Logout and late-response races are covered by offline behavior tests.
- Dashboard/report history refreshes on return and retains pending-evaluation
  polling. Reading completion indicators refresh separately from catalog loading.
- Profile initially displays authenticated name/avatar, refreshes in the
  background and does not wait for report history to display profile details.
  Quick returns reuse the fresh profile instead of forcing another signed
  avatar URL. Account photos render directly as native images rather than a
  separate preload followed by another no-store image request.
  Accepted edits cancel older profile reads. Onboarding saves update only the
  initiating account's still-existing Query, including logout/relogin races.
- Failed background list requests retain existing practice, lesson and report
  rows. An initial request without cached data still shows loading/error states.
- Existing billing, purchases, access, checkout, active exam, submission and
  protected result-detail checks retain their current server verification.
  Cached cards never grant access or spend/restore an entitlement.
- A full page reload or closing the tab removes this memory cache; this is not
  an offline mode. Static image/audio caching remains independent.

Practice category panels retain only previously visited panels (at most four)
while the practice page remains open. Unselected panels are hidden and their
catalog/completion queries are disabled; their access-decision targets are
empty. Returning still gets fresh authorization decisions. Account changes
remount the panels, and leaving the page releases all retained DOM. This does
not preserve exam/session pages or grant access from cached cards.

13 October follow-up: 187 offline frontend tests and the production build
passed. Regression checks cover the first profile refresh versus a quick
return, native avatar load/error behavior, and retaining actual card nodes
without fetching unvisited categories. A local browser fixture with delayed
image/list responses verifies the approved four-skill membership copy,
category switching and visible cards during background refresh. The inactive
membership copy covers all four skills, and Subscribe uses the brand red.

Validation: 22 new navigation/cache behavior tests, all 164 frontend tests and
the TypeScript/Vite production build passed. Browser verification used actual
page components with synthetic read-only APIs, including a five-second delayed
refresh. No real student exam, payment or AI evaluation was started.

Six pre-existing test failures were corrected in test fixtures only: catalog
and purchases now receive route-specific API responses, shared-test state is
cleaned even when setup fails, and gift/membership expectations match the
approved separate gift card and membership title. Paid/gifted balances and end
dates are asserted separately; paid membership data must remain unchanged.
