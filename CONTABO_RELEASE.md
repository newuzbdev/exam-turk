# TurkishMock — frontend release

This repository contains the source used by the live Contabo release on 11 October 2026.
Frontend/admin include the v31 branding updates; backend includes v29 history totals.

- Repository: https://github.com/newuzbdev/exam-turk
- Node.js: 22. Install dependencies from package-lock.json; build with npm run build.
- GitHub Actions checks pull requests and release branches. A checked push to main/master
  publishes this application to Contabo using a command-restricted deployment key.
- The server builds the source into a new Docker image, preserves the other services,
  checks health, and restores the previous application image if verification fails.
- Database migrations require a separate reviewed step. Automatic releases reject
  changes to the Prisma schema or migration files until the live source baseline is updated.
- Runtime credentials, PayMe keys, callback URL, database, uploaded recordings and
  reverse proxy configuration stay on the server. They are not stored in this repository.
- The old CapRover push workflows have been retired. Existing CapRover secrets are not changed.

The working development folders can contain newer unapproved changes. Treat this branch
as the deployed source baseline, rather than replacing it with an entire local working folder.

Public search routing uses `deploy/public-seo-locations.conf`, copied into the image
at `/etc/nginx/snippets/public-seo-locations.conf`. Both image and live bound Nginx
configs must include it in their server block. The one-time bound-config update must
be reviewed separately; an image push never overwrites the server's protected config.
Only the public home is included in `public/sitemap.xml`. App/login/legal pages keep
their existing proxy-level search exclusions. Search rankings and recrawl timing are
controlled by Google; a successful release or live test does not mean indexing is done.
