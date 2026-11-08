# Spexgram Web

## Overview

Spexgram Web is the frontend of Spexgram, FGV's archive of photos and short videos from the spex, sorted in albums:
shows, revivals, rehearsals, parties, jubilees and tours. It has a public side: what editors have made public is shown
to anyone, without logging in, at stable addresses (`/albums/<id>`, `/items/<id>`, `/spex/<spexId>`) with Open Graph
tags. Members log in with their FGV account to see more, search by content, use the map and add their own photos to an
album. Editors create albums, upload many files at a time, caption, sort, set who sees what and review contributions
and reports; admins see Immich's status and change the settings. It talks to [Spexgram Server][1] over GraphQL, and
shows photos and videos from the media server (`spexgram-media`, in front of Immich) through signed, expiring
addresses. The product spec is in [fgv-spexgram-spec][2].

## Tech Stack

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router, Cache Components)
- **UI & Styling:** [shadcn/ui](https://ui.shadcn.com/), [Base UI](https://base-ui.com/) &
  [Tailwind CSS 4](https://tailwindcss.com/)
- **Data Fetching:** [urql](https://formidable.com/open-source/urql/) (GraphQL) with GraphQL Code Generator
- **Authentication:** [Better Auth](https://better-auth.com/) (Keycloak integration, stateless sessions; optional, the
  public side works without it)
- **Internationalization:** [next-intl](https://next-intl-docs.vercel.app/) (Swedish & English)
- **Photos:** [react-photo-album](https://react-photo-album.com/) (justified grid) and
  [yet-another-react-lightbox](https://yet-another-react-lightbox.com/) (viewer with zoom, video and slideshow)
- **Map:** [Leaflet](https://leafletjs.com/) with marker clustering and OpenStreetMap tiles, as Spexregister's
- **Uploads:** [tus-js-client](https://github.com/tus/tus-js-client), resumable, in chunks of at most 50 MB
- **Bot check:** [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/), for visitors' reports

The look (logo, favicon and colours) is FGV's, shared with Spexregister, Nyuppsättning, Spexify and Spexflix.

## Getting Started

### Prerequisites

- Node.js 26 (see `.nvmrc`)
- npm (package manager)
- Docker & Docker Compose (optional, for containerized setup)

### Development

1. **Install dependencies:**
   ```bash
   npm ci
   ```

2. **Configure environment:**
   Start fgv-infra-deploy's local stack, Spexregister's and [Spexgram Server][1]'s (its getting started guide describes
   all three), then create `.env.local` (`.env` already holds the rest):
   ```
   BETTER_AUTH_URL=http://localhost:3004
   AUTH_SECRET=<random string of at least 32 characters>
   KEYCLOAK_CLIENT_ID=fgv-spexgram
   KEYCLOAK_CLIENT_SECRET=<secret of the fgv-spexgram client>
   KEYCLOAK_ISSUER=https://auth.fgv.local.nu:8443/auth/realms/fgv
   API_GRAPHQL_ENDPOINT=https://api.spexgram.fgv.local.nu:8443/api/graphql
   API_ENDPOINT=https://api.spexgram.fgv.local.nu:8443
   MEDIA_ORIGIN=https://media.spexgram.fgv.local.nu:8443
   NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA
   SPEXREGISTER_WEB_URL=https://register.fgv.local.nu:8443
   FGV_REVIVAL_WEB_URL=http://localhost:3001
   SPEXIFY_WEB_URL=http://localhost:3002
   SPEXFLIX_WEB_URL=http://localhost:3003
   ARCHIVE_WEB_URL=http://localhost:3005
   ```
   The client secret is in `realm/fgv.json` in [fgv-keycloak][7]; search for `fgv-spexgram`.
   For visitor statistics, run fgv-infra-deploy's `local/bin/configure-umami.sh` and put the ID it prints for Spexgram
   in `.env.local` as `UMAMI_WEBSITE_ID`, with `UMAMI_URL=https://analytics.fgv.local.nu:8443`.
   `npm run dev` and `docker compose` trust the root certificate of fgv-infra-deploy's local Caddy
   (`local/.docker/caddy/data/caddy/pki/authorities/local/root.crt`), read from `../../fgv-infra-deploy`, or from
   `INFRA_DEPLOY` if it is checked out elsewhere.

   | Variable                         | Purpose                                                                   |
   |----------------------------------|---------------------------------------------------------------------------|
   | `API_GRAPHQL_ENDPOINT`           | Spexgram Server's GraphQL endpoint                                        |
   | `API_ENDPOINT`                   | Spexgram Server's origin for tus uploads and albums as zips; defaults to the GraphQL endpoint's |
   | `MEDIA_ORIGIN`                   | The media server's origin, allowed by the pages' Content Security Policy; `http://localhost:8086` when Spexgram Server runs with `bootRun` |
   | `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile's site key for visitors' reports (read at runtime despite its prefix); `1x00000000000000000000AA` is Cloudflare's test key, which always passes |
   | `API_CLIENT_IP_SECRET`           | Optional: the secret shared with Spexgram Server's `API_CLIENT_IP_SECRET`, sent with the visitor's address so that visitors' reports are limited per visitor; without it they are limited per web |
   | `SPEXFLIX_WEB_URL`               | Spexflix, where uploaders of long videos are pointed; also the application switcher |
   | `SPEXREGISTER_WEB_URL`, `FGV_REVIVAL_WEB_URL`, `SPEXIFY_WEB_URL`, `ARCHIVE_WEB_URL` | The other applications, for the application switcher in the header |
   | `SUPPORT_EMAIL`, `FEEDBACK_EMAIL`| The addresses on the support and about pages (in `.env`)                 |

3. **Generate GraphQL types:**
   If you change GraphQL queries or the schema, regenerate types from the sibling `fgv-spexgram-server` checkout:
   ```bash
   npm run gql-codegen
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3004](http://localhost:3004) with your browser to see the result. Port 3004 keeps it clear of
   the other FGV webs (Spexregister on 3000, Nyuppsättning on 3001, Spexify on 3002, Spexflix on 3003, Spexarkiv on
   3005). Without logging in you see the public side; the sample users are listed in Spexgram Server's getting started
   guide (`admin@fgv.nu`, `editor@fgv.nu`, `user@fgv.nu`, `no-access@fgv.nu`).

## Docker

The project includes a `Dockerfile` and `docker-compose.yaml` for containerized deployment, including a Caddy reverse
proxy setup for local development with HTTPS.

### Running with Docker Compose

To start the application along with the Caddy reverse proxy:

```bash
docker compose up --build
```

The application will be accessible at `https://spexgram.fgv.local.nu:9443` if your hosts file is configured. It talks to
the server's API at `api.spexgram.fgv.local.nu:8443` and to Keycloak at `auth.fgv.local.nu:8443`, both behind
fgv-infra-deploy's local Caddy. To log in, `SPEXGRAM_URL` in fgv-infra-deploy's `local/.env` must be
`https://spexgram.fgv.local.nu:9443`, since the realm only accepts redirects to that address.

### Published images

CI publishes `bloomper/fgv-spexgram-web` for `linux/amd64`:

| Trigger              | Tags                              |
|----------------------|-----------------------------------|
| push to `develop`    | `develop`, `sha-<commit>`         |
| push of tag `vX.Y.Z` | `X.Y.Z`, `latest`, `sha-<commit>` |

To release, set `version` in `package.json` to `X.Y.Z`, merge to `main`, then
`git tag vX.Y.Z && git push origin vX.Y.Z`. The publish fails if the tag doesn't match the version or if `X.Y.Z` is
already on Docker Hub.

The image contains no environment-specific values. All configuration is read at runtime: `BETTER_AUTH_URL`,
`AUTH_SECRET`, `KEYCLOAK_CLIENT_ID`, `KEYCLOAK_CLIENT_SECRET`, `KEYCLOAK_ISSUER`, `API_GRAPHQL_ENDPOINT`,
`API_ENDPOINT`, `API_CLIENT_IP_SECRET`, `MEDIA_ORIGIN`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `SPEXREGISTER_WEB_URL`,
`FGV_REVIVAL_WEB_URL`, `SPEXIFY_WEB_URL`, `SPEXFLIX_WEB_URL`, `ARCHIVE_WEB_URL`, `SUPPORT_EMAIL`, `FEEDBACK_EMAIL`,
`SUPPORTED_LOCALES`, `DEFAULT_LOCALE`, `UMAMI_URL` and `UMAMI_WEBSITE_ID`. Visitor statistics go to Umami only when both Umami variables
are set. [fgv-spexgram-deploy][8] runs it.

## Building and Deployment

### Tests

`npm run test` runs the unit tests and `npm run test:e2e` the Playwright tests, against `e2e/mock-backend.mjs`, which
stands in for Spexgram Server, the media server and Keycloak and filters what each viewer may see as the server does;
Turnstile's script is replaced in the browser. See the [contributor guidelines][5] for the checks CI runs.

### Production Build

To create an optimized production build manually:

```bash
npm run build
npm run start
```

## Contributing

Contributors to this project agree to uphold its [code of conduct][3].

You can contribute to Spexgram Web by:

- Opening a [pull request][4]. Please see the [contributor guidelines][5] for details

## License

Spexgram Web is open source software released under the [Apache 2.0 license][6].

[1]: https://github.com/bloomper/fgv-spexgram-server

[2]: https://github.com/bloomper/fgv-spexgram-spec

[3]: CODE_OF_CONDUCT.md

[4]: https://help.github.com/articles/using-pull-requests/

[5]: CONTRIBUTING.md

[6]: https://www.apache.org/licenses/LICENSE-2.0.html

[7]: https://github.com/bloomper/fgv-keycloak

[8]: https://github.com/bloomper/fgv-spexgram-deploy
