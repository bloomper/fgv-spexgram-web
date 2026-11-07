<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read
the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next`
package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at
`node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted
change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Spexgram Web — project notes

Next.js 16 App Router + React 19 frontend for Spexgram, FGV's archive of photos and short videos in albums. It is backed
by `fgv-spexgram-server`'s GraphQL API (which answers without a token too, with what is public) and its plain HTTP
endpoints for tus uploads and albums as zips; the files themselves come from the media server (nginx,
`spexgram-media`, in front of Immich) through signed addresses. Stack and setup: `README.md`. Product spec:
`fgv-spexgram-spec`. The scaffolding comes from `fgv-spexflix-web` (and through it `fgv-spexify-web` and
`fgv-revival-web`); keep them alike.

## Commands

- `npm run dev` (port 3004) / `build` / `start`
- `npm run lint`, `npm run typecheck` (covers `src/**` only)
- `npm run test` (Vitest), `npm run test:e2e` (Playwright on ports 3104/4104, `e2e/mock-backend.mjs` stands in for the server, the media
  server and Keycloak)
- `npm run gql-codegen` — regenerate `src/gql/` from the sibling `../fgv-spexgram-server` checkout. Commit the result.

**Don't run `npm run format`**: `.prettierrc` uses 2 spaces and the code base 4.

## Conventions

- `"use client"` ⇔ `*.client.ts(x)`; `import "server-only"` and `"use server"` ⇔ `*.server.ts`. Exceptions:
  `src/auth.ts`, Next.js reserved file names, and shadcn's `src/components/ui/**` and `src/hooks/use-mobile.ts`.
- Cache Components is on. `(app)/layout.tsx` keeps `export const instant = false`. The root layout's metadata stays
  static; pages set their own titles, robots and Open Graph tags (`src/lib/gram/metadata.server.ts`).
- Cache Components keeps visited pages alive, so a client component that copies a server prop into state uses
  `useServerState` (`src/hooks/use-server-state.client.ts`), never `useState(prop)`. Never revalidate or refresh a page
  that may be playing a video: each render signs new media addresses and the video starts over.
- Locale is a cookie (`sv` default); messages in `messages/{sv,en}.json`. The theme is dark by default. Swedish says
  "film/filmer" for videos, never "video", and "bild/bilder" for photos ("bilder och filmer" for items).
- Auth: Better Auth + Keycloak, stateless. `getSessionContext()` in `src/utils/auth.server.ts` is the single entry
  point; roles come from `resource_access["fgv-spexgram"].roles`: `USER` (access), `EDITOR`, `ADMIN`. The tokens stay
  on the server: `disabledPaths` in `src/auth.ts` turns off Better Auth's `/get-access-token`, `/refresh-token` and
  `/account-info` routes (they answer 404); `auth.api.getAccessToken` on the server is not affected.
- GraphQL calls carry `X-Client-IP` (`src/lib/http/client-ip.ts`: Cloudflare's `cf-connecting-ip`, else the proxy's
  `X-Forwarded-For`), which the server uses only to limit visitors' reports per address.
- Only `NEXT_PUBLIC_TURNSTILE_SITE_KEY` has the prefix (the deploy repo names it so), and it too is read on the server
  at request time (`getViewer()`) and passed as a prop, never inlined at build time.
- **The Content Security Policy is set in `src/proxy.ts`** (`src/utils/csp.ts`), not `next.config.ts`, because it
  names the media hostname (`MEDIA_ORIGIN`). It also allows Turnstile's script and frame
  (`https://challenges.cloudflare.com`) and any https image (the map's OpenStreetMap tiles).

## The public side

Login is **not** required at the root. The `(app)` layout works with and without a session: visitors get *Logga in*
(`LoginButton`, back to the page they were on through `/api/auth/login?returnTo=`), members their menu, and the sidebar
shows the pages each role opens. Nothing a visitor sees calls Keycloak: without a session cookie Better Auth does not
reach it, and GraphQL is called without a token.

- **Who is looking**: `getViewer()` (`src/lib/gram/viewer.server.ts`) says `loggedIn`, `member` (has `USER`), `editor`,
  `admin`, and how a report is made. Someone logged in without `USER` is a visitor to the server: they see the public
  side with a notice from the layout (`NoAccess.notice`), never a redirect to `/no-access`.
- **Not found and not allowed look the same** to visitors. `album(id)`, `item(id)` and `spexAlbums` return null/empty
  for both; the pages then render `LoginPrompt` (`src/components/login-prompt.client.tsx`) for visitors (with
  `noAccess` for someone logged in without `USER`) and `notFound()` for members.
- **Members' pages** (map, smart search, contributions, suggestions, own reports) are guarded with
  `withPolicyPage(Policies.app.requireAccess, …)`; `manage/*` with `Policies.editor.requireEditor` and `admin/*` with
  `Policies.admin.requireAdmin`. `withPolicyPage` returns the login prompt for visitors, the no-access prompt for
  someone without `USER`, and the forbidden page for a member who lacks the role.
- **Indexing**: the root metadata is static; pages showing something public set `robots: index` and Open Graph tags
  with the preview address as image (`publicMetadata`), everything else `noindex` without Open Graph
  (`privateMetadata`). `src/app/robots.ts` keeps crawlers out of `/manage`, `/admin`, `/api` and the members' pages.
- **Stable addresses**: `/albums/<id>`, `/items/<id>`, `/spex/<spexId>` (an original's id lists its revivals too).
  An item's page shows its album only when the viewer may see it (`Item.album` is null otherwise), so a public item in
  a members' album is shown to visitors on its own.

## How Spexgram works in the web

- **Media**: `Item.media` holds signed addresses on the media server (thumbnail ~250 px, preview ~1440 px, video,
  original only when `limits.canDownloadOriginals`), valid at least four hours. Never `next/image`. `ItemImage`
  (`src/components/gram/item-image.client.tsx`) shows placeholders for `PROCESSING` and `FAILED` items and when an image
  cannot load (e.g. Immich is down). Text alternatives come from `altText()` (`src/utils/gram.ts`): the caption, else the
  album's title and the date.
- **Renewal**: `Gallery` asks `renewItemsAction` for new addresses (in chunks of 200, through `itemMedia(ids)`, which
  returns what the viewer may see; `publicItems` is for other applications and answers as for a visitor) when the page is looked at again or the viewer opens and an address runs out within
  15 minutes; `ItemView` renews once when its photo or video fails to load. Neither renders the page again.
- **The grid** (`Gallery`, `src/components/gram/gallery.client.tsx`) is react-photo-album's justified `RowsPhotoAlbum`;
  an album loads 60 items per page as the viewer scrolls (`albumItemsAction`, IntersectionObserver). Contributions
  waiting for review are marked on the owner's view.
- **The viewer** (`ItemViewer`, `src/components/gram/viewer.client.tsx`) is yet-another-react-lightbox with zoom,
  slideshow, full screen, captions, a counter and video (a plain `<video>` on Immich's browser version). Its toolbar
  downloads the preview (`downloadFile` fetches it through CORS and saves it under `downloadName()`), the original when
  allowed, reports (closes the lightbox and opens `ReportDialog`) and opens the item's page.
- **Reports**: `ReportDialog` asks for a reason and a message; visitors also give an email address and pass Cloudflare
  Turnstile (`Turnstile`, explicit rendering, the token goes to `reportCreate`, which the server verifies).
- **Uploads** (`src/components/upload/uploads.client.tsx`): `UploadsProvider` in the layout holds every upload, so they
  keep running while the user goes to other pages; the header's `UploadIndicator` shows them all, `UploadList` an
  album's. Two files at a time go through tus (`/api/uploads/[[...path]]`, metadata `filename` and `lastModified`), each
  then to `addUploadsAction`: `itemsAdd` for editors on `/manage/albums/[id]`, `contributionsAdd` for members on
  `/albums/[id]/contribute`. The result per file is CREATED, DUPLICATE (with a link to the existing item and the album's title when
  the uploader may see them, else only "already in the archive") or REJECTED (Immich's message). Files over `limits.maxUploadBytes` are refused before they are sent;
  `SpexflixHint` points long videos to Spexflix. Only the album's own page is refreshed when an upload lands, and
  `Gallery` merges the new render into what it shows (`mergeShown`): items keep their addresses while they last and the
  viewer stays on its item, so a video playing there goes on.
- **Editing** (`/manage/albums/[id]`, 200 items a page with `?page=`; `?item=` opens an item, also one on another page):
  drop zone, `ItemsManager` (check boxes; caption, photographer, visibility, move,
  trash for the selection; an item's fields, position and *make cover* in `ItemEditor`), `VisibilityControl` (the
  confirmation says how many items visitors will see: `publicAfter()`), `AlbumForm` with the shared `SpexPicker`, the
  trash and `RecordHistory`. Making items public in bulk is confirmed with their count.
- **Review** (`/manage/contributions`): contributions per album (accept, accept and edit, reject with a message), with
  the photographer (the contributor's name by default) shown and editable, and album suggestions.
- **Open reports win over bulk changes**: `albumSetVisibility` and `itemsUpdate` leave items an open *I am in it*
  report hides as they are and answer how many they `skipped`; the editor is told in a toast. **Reports** (`/manage/reports`): remove, corrected or keep, with a message to the reporter.
  **Unsorted** (`/manage/unsorted`): grouped by day; move the selection to an album or a new one
  (`albumFromItemsAction`). **Trash**: restore; admins delete for good, an album with or without its items.
- **Admin**: settings (start page texts for members and visitors, contact address, limits, originals for members,
  positions), album kinds, Immich status (queues, disk, failed items with a job to run again), maintenance jobs; the
  change log (`/manage/audit`) shows everyone's changes to admins.
- **The map** (`/map`) is Spexregister's Leaflet map with clustering (`src/components/map/`); a marker or a cluster opens
  its items in the viewer.
- **Dialogs**: never `window.confirm`, `window.prompt` or `window.alert`. Use `useDialogs()` (`confirm`, `prompt`,
  `choose`). The e2e fixture `noNativeDialogs` fails any test that opens a native dialog.

## Look

The look is FGV's, the same as Spexregister's, Nyuppsättning's, Spexify's and Spexflix's: `Logo`, `LogoText` and
`LogoHome` in `src/components/`, `src/app/favicon.ico`, and the colours in `src/app/globals.css`. Don't give the
application a logo or colours of its own; the name "Spexgram" is shown as text (the header's title). `src/app/icon.svg`
(the FGV logo) is only for the installable app's manifest.

## Consent and visitor statistics

The cookie banner is c15t (`src/components/consent-manager.client.tsx`) in offline mode with only the `necessary`
category. Umami, self-hosted in `fgv-infra-deploy`, is reached server-side at `UMAMI_URL`: `src/app/stats/` serves the
tracker as `/stats/script.js` and forwards `/stats/api/send`. `src/components/umami.tsx` renders nothing unless
`UMAMI_URL` and `UMAMI_WEBSITE_ID` are both set, and drops query strings. Visitors are counted like everyone else.

Custom events go through `track()` (`src/utils/umami.ts`); event data is enum values, counts and booleans only.
Events: `item-download` (`original`), `item-report` (`reason`, `visitor`), `item-upload` and `contribution-upload`
(`outcome`), `contribution-withdraw`, `contribution-review` (`accepted`, `count`), `album-suggest`, `album-create`
(`spex`), `album-visibility` (`visibility`, `items`), `items-caption`, `items-credit`, `items-visibility`, `items-move`,
`items-trash` (`count`), `unsorted-sort` (`count`, `created`), `language-change` and `theme-change`.

## Application switcher

As in the other webs (`src/components/app-switcher.client.tsx`, `src/utils/applications.ts`, identical copies); only the
id passed in `applications.server.ts` (`"spexgram"`) differs. Visitors see the plain title.

## Testing

- E2E specs per area: `public` (visitors), `viewing` (members), `editing`, `contributions` (and reports), `shell`,
  `admin`, `mobile` (360, 390 and 768 px: no sideways scrolling, header and viewer controls in sight) and `language`. The mock backend keeps state per test (reset automatically), filters by
  viewer like the server, implements tus and serves a small PNG as every photo; the `mock` fixture has
  `failNext(operation, classification)`, `process()` (Immich finishes processing), `fill(albumId, count)` (more items),
  `settings(…)` and `state()`.
- `mockTurnstile(page)` stands in for Turnstile's script; `acceptCookies(page)` dismisses the notice for visitors, who
  never log in; `ids` names the sample albums and items.
- Call `hydrated(page, selector)` before `setInputFiles`. Pages stream: an element can be in the DOM twice for a moment
  (a hidden copy), so prefer role locators, which skip hidden elements, over test ids.
- Buttons that are links (`Button` with `render={<Link/>}`) have the role `button`; plain links (the login links) `link`.
