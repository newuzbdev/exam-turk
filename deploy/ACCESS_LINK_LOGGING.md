# Share entry logging

`nginx.conf` is included in the image's `http` context. Its `access_safe` format
records method, normalized URI, protocol, status and byte count. It excludes
query strings and raw Referer. Existing SPA fallback and media headers remain.
The document's referrer meta and Nginx Referrer-Policy both use `no-referrer`.
The browser captures a share entry before rendering auth or OAuth providers,
then replaces the address with a safe route. Redeem sends the token only in
the authenticated request body; access IDs are scoped to the authenticated user.

Before enabling this feature, apply equivalent query-free/redacted logging to
every external reverse proxy, ingress, CDN, WAF, APM and analytics integration.
The first entry request reaches those systems before browser scrubbing. Exclude
raw Referer, full request URLs/queries and share redeem request bodies from logs,
traces and error reports. Check error logs as well as access logs. Do not record
the original entry URL in page-view telemetry. Browser referrer policy alone
cannot sanitize upstream request logs.

The local offline Nginx syntax and synthetic access-log canary fixture verifies
the bundled configuration. It does not change or prove external production
configuration. Migration, rollout flag enablement, authoritative server gate
behavior and external logging acceptance remain deployment prerequisites.
