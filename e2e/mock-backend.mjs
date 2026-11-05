// A stand-in for Spexgram Server and Keycloak in E2E tests: GraphQL for viewing (with and without a token), contributing,
// reporting, editing and administration, tus uploads, albums as zips, the media server and a mini-Keycloak (discovery,
// authorize, token, JWKS, userinfo, logout). It filters what each viewer may see as the server does (unpublished,
// members, public; a public item is public on its own). All data is fictitious.

import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { exportJWK, generateKeyPair, SignJWT } from "jose";

const PORT = Number(process.env.MOCK_PORT || 4101);
const ISSUER = `http://localhost:${PORT}/realms/fgv`;
const MEDIA = `http://localhost:${PORT}`;
const CLIENT_ID = "fgv-spexgram";
const KID = "e2e-key";
const TOKEN_TTL = 3600;
const TURNSTILE_TOKEN = "mock-turnstile-token";

const PERSONAS = {
  admin: { sub: "p-admin", name: "Sara Admin", email: "sara.admin@example.org", roles: ["USER", "EDITOR", "ADMIN"] },
  editor: { sub: "p-editor", name: "Erik Redaktör", email: "erik@example.org", roles: ["USER", "EDITOR"] },
  viewer: { sub: "p-viewer", name: "Tina Tittare", email: "tina@example.org", roles: ["USER"] },
  noaccess: { sub: "p-noaccess", name: "Nils Nekad", email: "nils@example.org", roles: [] },
};
const bySub = Object.fromEntries(Object.values(PERSONAS).map(persona => [persona.sub, persona]));
let currentPersona = "admin";

class GraphQLError extends Error {
  constructor(classification, message) {
    super(message);
    this.classification = classification;
  }
}

/** The UUID the server would give the entity numbered n here. */
const uuidOf = n => `00000000-0000-7000-8000-${String(n).padStart(12, "0")}`;

// A 4×3 PNG, the only image the mock media server has
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAQAAAADCAIAAAA7ljmRAAAAEklEQVR4nGP4z8AARwyEOQAA/5EL9bP8WbIAAAAASUVORK5CYII=", "base64");

const SPEX = [
  { id: uuidOf(1), title: "Nobel", year: 1975, revival: false, parentId: null, familyId: uuidOf(1), categoryId: uuidOf(1), categoryName: "Chalmersspexet" },
  { id: uuidOf(2), title: "Nobel", year: 2026, revival: true, parentId: uuidOf(1), familyId: uuidOf(1), categoryId: uuidOf(1), categoryName: "Chalmersspexet" },
  { id: uuidOf(3), title: "Statyerna", year: 1990, revival: false, parentId: null, familyId: uuidOf(3), categoryId: uuidOf(1), categoryName: "Chalmersspexet" },
];
const CATEGORIES = [{ id: uuidOf(1), name: "Chalmersspexet" }];
const RANK = { UNPUBLISHED: 0, MEMBERS: 1, PUBLIC: 2 };

function album(n, title, extra = {}) {
  return {
    id: uuidOf(n), title, kindId: uuidOf(901), spexIds: [uuidOf(1)], dateFrom: "1975-02-14", dateTo: null,
    place: "Chalmers kårhus", description: null, visibility: "MEMBERS", coverItemId: null, suggestedBy: null,
    trashedAt: null, createdAt: "2026-10-01T10:00:00Z", lastModifiedAt: null, ...extra,
  };
}

function item(n, albumN, extra = {}) {
  return {
    id: uuidOf(n), albumId: albumN ? uuidOf(albumN) : null, type: "PHOTO", status: "READY", failure: null,
    takenAt: "1975-02-14T20:00:00", caption: null, photographer: "Foto: Anna Andersson", latitude: null, longitude: null,
    width: 1600, height: 1200, durationMs: null, visibility: "MEMBERS", contributionStatus: null, owner: "p-editor",
    originalFileName: `IMG_${n}.jpg`, fileSize: 2_000_000, trashedAt: null, createdAt: "2026-10-01T10:00:00Z", ...extra,
  };
}

let state;

function resetState() {
  state = {
    nextId: 1000,
    kinds: [
      { id: uuidOf(901), nameSv: "Föreställning", nameEn: "Show", position: 1 },
      { id: uuidOf(902), nameSv: "Repetition", nameEn: "Rehearsal", position: 2 },
      { id: uuidOf(903), nameSv: "Fest", nameEn: "Party", position: 3 },
    ],
    albums: [
      album(10, "Nobel 1975 – premiären", { visibility: "PUBLIC", description: "Premiären i kårhuset.", coverItemId: uuidOf(101) }),
      album(20, "Sittning efter premiären", { kindId: uuidOf(903), dateFrom: "1975-02-15" }),
      album(30, "Opublicerat album", { visibility: "UNPUBLISHED", spexIds: [uuidOf(3)], dateFrom: "1990-03-01" }),
      album(40, "Repetitioner våren 1975", { kindId: uuidOf(902), dateFrom: "1975-01-10", dateTo: "1975-02-10" }),
    ],
    items: [
      item(101, 10, { visibility: "PUBLIC", caption: "Finalen med hela ensemblen" }),
      item(102, 10, { visibility: "PUBLIC", caption: "Kärleksduetten", takenAt: "1975-02-14T20:30:00" }),
      item(103, 10, { visibility: "MEMBERS", caption: "Bakom scenen", takenAt: "1975-02-14T21:00:00" }),
      item(104, 10, { visibility: "PUBLIC", type: "VIDEO", caption: "Ouvertyren", durationMs: 30000, width: 1280, height: 720, takenAt: "1975-02-14T19:00:00", originalFileName: "ouvertyr.mp4" }),
      item(201, 20, { caption: "Sittningen börjar", takenAt: "1975-02-15T19:00:00", latitude: 57.6896, longitude: 11.9744 }),
      item(202, 20, { visibility: "PUBLIC", caption: "Gruppbild på trappan", takenAt: "1975-02-15T19:30:00" }),
      item(203, 20, { caption: "Talet", takenAt: "1975-02-15T21:00:00", latitude: 57.6897, longitude: 11.9745 }),
      item(301, 30, { caption: "Hemligt", takenAt: "1990-03-01T12:00:00" }),
      item(401, 40, { caption: null, takenAt: "1975-01-20T18:00:00", visibility: "UNPUBLISHED", contributionStatus: "WAITING", owner: "p-viewer", photographer: "Tina Tittare", originalFileName: "mitt-foto.jpg" }),
      item(402, 40, { status: "PROCESSING", takenAt: "1975-01-21T18:00:00" }),
      item(403, 40, { status: "FAILED", failure: "TOO_LONG", type: "VIDEO", takenAt: "1975-01-22T18:00:00", originalFileName: "hela-forestallningen.mp4" }),
      item(501, null, { takenAt: "2026-10-30T20:00:00", originalFileName: "scan-1.jpg", owner: "p-admin" }),
      item(502, null, { takenAt: "2026-10-30T20:10:00", originalFileName: "scan-2.jpg", owner: "p-admin" }),
    ],
    suggestions: [{
      id: uuidOf(700), title: "Vårbalen 1975", albumId: null, suggestedBy: "p-viewer", status: "OPEN", message: null,
      createdAt: "2026-10-20T10:00:00Z", handledAt: null,
    }],
    reports: [{
      id: uuidOf(800), itemId: uuidOf(101), reason: "WRONG_CAPTION_OR_ALBUM", message: "Fel år", status: "OPEN",
      reporter: null, email: "besokare@example.org", outcome: null, outcomeMessage: null, createdAt: "2026-10-25T10:00:00Z", handledAt: null,
    }],
    settings: {
      welcomeSv: null, welcomeEn: null, publicWelcomeSv: null, publicWelcomeEn: null, contactEmail: "spexgram@example.org",
      maxUploadGb: 4, maxVideoMinutes: 10, contributionMaxItems: 500, contributionMaxGb: 20, userDownloadsOriginals: false,
      showPositions: true,
    },
    maintenanceJobs: ["SPEX_REFRESH", "UNSORTED_SCAN", "PROCESSING_POLL", "ITEM_CHECK", "UPLOAD_CLEANUP", "RETENTION", "CONTRIBUTION_MAIL"]
      .map(job => ({ job, schedule: "0 0 3 * * *", running: false, lastStartedAt: null, lastFinishedAt: null, lastSucceeded: null })),
    audit: [],
    uploads: new Map(),
    failNext: new Map(),
    immichUp: true,
    smartSearches: [],
  };
}

resetState();

const isMember = persona => Boolean(persona?.roles.includes("USER"));
const isEditor = persona => isMember(persona) && (persona.roles.includes("EDITOR") || persona.roles.includes("ADMIN"));
const isAdmin = persona => isMember(persona) && persona.roles.includes("ADMIN");
const forbidden = () => new GraphQLError("FORBIDDEN", "Du har inte behörighet att göra det.");
const requireMember = persona => {
  if (!persona) {
    throw new GraphQLError("UNAUTHORIZED", "Du är inte inloggad.");
  }
  if (!isMember(persona)) {
    throw forbidden();
  }
};
const requireEditor = persona => {
  requireMember(persona);
  if (!isEditor(persona)) {
    throw forbidden();
  }
};
const requireAdmin = persona => {
  requireMember(persona);
  if (!isAdmin(persona)) {
    throw forbidden();
  }
};
const notFound = () => new GraphQLError("NOT_FOUND", "Det finns inte, eller så har du inte tillgång till det.");

const albumById = id => state.albums.find(candidate => candidate.id === id);
const hiddenByReport = itemId => state.reports.some(r => r.itemId === itemId && r.status === "OPEN" && r.hiddenFrom);
const itemById = id => state.items.find(candidate => candidate.id === id);

function canSeeAlbum(persona, a) {
  if (!a) {
    return false;
  }
  if (isEditor(persona)) {
    return true;
  }
  if (a.trashedAt) {
    return false;
  }
  if (a.suggestedBy && persona && a.suggestedBy === persona.sub) {
    return true;
  }
  return isMember(persona) ? a.visibility !== "UNPUBLISHED" : a.visibility === "PUBLIC";
}

function effective(i) {
  const a = albumById(i.albumId);

  if (!a) {
    return "UNPUBLISHED";
  }
  if (i.visibility === "PUBLIC" && a.visibility !== "UNPUBLISHED") {
    return "PUBLIC";
  }
  return RANK[i.visibility] < RANK[a.visibility] ? i.visibility : a.visibility;
}

function canSeeItem(persona, i) {
  if (!i || (i.trashedAt && !isEditor(persona))) {
    return false;
  }
  if (isEditor(persona)) {
    return true;
  }
  if (!i.albumId || albumById(i.albumId)?.trashedAt) {
    return false;
  }
  if (i.contributionStatus === "WAITING") {
    return Boolean(persona && i.owner === persona.sub);
  }
  if (i.status !== "READY") {
    return false;
  }
  return isMember(persona) ? effective(i) !== "UNPUBLISHED" : effective(i) === "PUBLIC";
}

const expires = () => new Date(Date.now() + 4 * 3600_000).toISOString();
const mediaOf = (persona, i) => i.failure === "TOO_LONG" ? null : {
  thumbnailUrl: `${MEDIA}/a/${i.id}/thumbnail/1/sig`,
  previewUrl: `${MEDIA}/a/${i.id}/preview/1/sig`,
  videoUrl: i.type === "VIDEO" ? `${MEDIA}/a/${i.id}/video/1/sig` : null,
  originalUrl: canDownloadOriginals(persona) ? `${MEDIA}/a/${i.id}/original/1/sig` : null,
  expiresAt: expires(),
};
const canDownloadOriginals = persona => isEditor(persona) || (isMember(persona) && state.settings.userDownloadsOriginals);

function itemOut(persona, i) {
  const a = albumById(i.albumId);
  const positions = isEditor(persona) || (isMember(persona) && state.settings.showPositions);

  return {
    ...i,
    album: a && canSeeAlbum(persona, a) ? { id: a.id, title: a.title, visibility: a.visibility } : null,
    effectiveVisibility: effective(i),
    mine: Boolean(persona && i.owner === persona.sub),
    uploadedBy: isEditor(persona) ? (bySub[i.owner]?.name ?? i.owner) : null,
    latitude: positions ? i.latitude : null,
    longitude: positions ? i.longitude : null,
    failure: isEditor(persona) ? i.failure : null,
    originalFileName: isEditor(persona) || (persona && i.owner === persona.sub) ? i.originalFileName : null,
    fileSize: isEditor(persona) ? i.fileSize : null,
    media: mediaOf(persona, i),
  };
}

const sortedKinds = () => [...state.kinds].sort((a, b) => a.position - b.position);
const kindOut = kindId => ({
  ...state.kinds.find(kind => kind.id === kindId),
  isDefault: sortedKinds()[0]?.id === kindId,
  albumCount: state.albums.filter(a => a.kindId === kindId).length,
});
const albumItems = (persona, a) => state.items.filter(i => i.albumId === a.id && canSeeItem(persona, i) && !i.trashedAt)
  .sort((x, y) => (x.takenAt ?? "").localeCompare(y.takenAt ?? ""));

function albumOut(persona, a) {
  const visible = albumItems(persona, a);
  const cover = visible.find(i => i.id === a.coverItemId && i.status === "READY") ?? visible.find(i => i.status === "READY");
  const own = state.items.filter(i => i.albumId === a.id && !i.trashedAt && i.contributionStatus !== "WAITING");

  return {
    ...a,
    kind: kindOut(a.kindId),
    spex: a.spexIds.map(id => SPEX.find(spex => spex.id === id)).filter(Boolean),
    cover: cover ? itemOut(persona, cover) : null,
    itemCount: visible.filter(i => i.status === "READY").length,
    items: { items: visible.map(i => itemOut(persona, i)), totalCount: visible.length, page: 0, size: 100 },
    visibilityCounts: ["UNPUBLISHED", "MEMBERS", "PUBLIC"].map(visibility => ({ visibility, count: own.filter(i => i.visibility === visibility).length })),
    suggested: Boolean(a.suggestedBy && state.suggestions.some(s => s.albumId === a.id && s.status === "OPEN")),
  };
}

function pageOfItems(persona, a, page, size) {
  const visible = albumItems(persona, a);

  return { items: visible.slice(page * size, page * size + size).map(i => itemOut(persona, i)), totalCount: visible.length, page, size };
}

const visibleAlbums = persona => state.albums.filter(a => !a.trashedAt && canSeeAlbum(persona, a))
  .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

function filterAlbums(persona, filter = {}) {
  return visibleAlbums(persona).filter(a => {
    const spex = a.spexIds.map(id => SPEX.find(s => s.id === id)).filter(Boolean);

    return (!filter.categoryId || spex.some(s => s.categoryId === filter.categoryId))
      && (!filter.year || spex.some(s => s.year === filter.year) || a.dateFrom?.startsWith(String(filter.year)))
      && (!filter.spexId || spex.some(s => s.id === filter.spexId || s.parentId === filter.spexId))
      && (!filter.kindId || a.kindId === filter.kindId)
      && (!filter.visibility || a.visibility === filter.visibility);
  });
}

function browseExtras(persona) {
  const albums = visibleAlbums(persona);
  const spexIds = [...new Set(albums.flatMap(a => a.spexIds))];

  return {
    categories: CATEGORIES.map(category => ({ ...category, albumCount: albums.length })),
    years: [...new Set(albums.map(a => Number(a.dateFrom?.slice(0, 4))).filter(Boolean))].sort((a, b) => b - a),
    albumKinds: sortedKinds().map(kind => kindOut(kind.id)),
    spexWithAlbums: spexIds.map(id => ({ ...SPEX.find(s => s.id === id), albumCount: albums.filter(a => a.spexIds.includes(id)).length })),
  };
}

function audit(persona, action, entityType, entityId, summary) {
  state.audit.unshift({
    id: uuidOf(state.nextId++), at: new Date().toISOString(), actorId: persona.sub, actorName: persona.name, action,
    entityType, entityId, summary,
  });
}

function uploadResult(persona, uploadId, a, contribution) {
  const upload = state.uploads.get(uploadId);

  if (!upload || upload.offset < upload.length) {
    throw new GraphQLError("BAD_REQUEST", "Uppladdningen är inte klar.");
  }
  state.uploads.delete(uploadId);
  if (/\.txt$/i.test(upload.name)) {
    return { uploadId, fileName: upload.name, outcome: "REJECTED", message: "Filtypen stöds inte", item: null, existingItem: null, existingAlbumTitle: null };
  }
  if (/dubblett/i.test(upload.name)) {
    const existing = itemById(uuidOf(101));

    // Only what the uploader may see is named
    return {
      uploadId, fileName: upload.name, outcome: "DUPLICATE", message: null, item: null,
      existingItem: canSeeItem(persona, existing) ? itemOut(persona, existing) : null,
      existingAlbumTitle: canSeeAlbum(persona, albumById(existing.albumId)) ? albumById(existing.albumId).title : null,
    };
  }

  const created = item(state.nextId++, null, {
    albumId: a.id, status: "PROCESSING", caption: null, owner: persona.sub, originalFileName: upload.name,
    visibility: contribution ? "UNPUBLISHED" : "MEMBERS", contributionStatus: contribution ? "WAITING" : null,
    photographer: contribution ? persona.name : null, createdAt: new Date().toISOString(),
    type: /\.(mp4|mov)$/i.test(upload.name) ? "VIDEO" : "PHOTO",
  });

  state.items.push(created);
  audit(persona, "UPLOAD", "ITEM", created.id, `Laddade upp ${upload.name} till albumet ${a.title}`);
  return { uploadId, fileName: upload.name, outcome: "CREATED", message: null, item: itemOut(persona, created), existingItem: null, existingAlbumTitle: null };
}

function editableItems(persona, ids) {
  requireEditor(persona);
  return ids.map(id => {
    const found = itemById(id);

    if (!found) {
      throw notFound();
    }
    return found;
  });
}

function albumInput(input, existing) {
  const spexIds = input.spexIds ?? [];
  const main = SPEX.find(s => s.id === spexIds[0]);
  const kindId = input.kindId ?? existing?.kindId ?? sortedKinds()[0].id;

  if (!input.title && !main) {
    throw new GraphQLError("BAD_REQUEST", "Ett album utan spex behöver en titel.");
  }
  return {
    spexIds, kindId,
    title: input.title || `${main.title} ${main.year} – ${state.kinds.find(kind => kind.id === kindId).nameSv.toLowerCase()}`,
    dateFrom: input.dateFrom ?? null, dateTo: input.dateTo ?? null, place: input.place ?? null, description: input.description ?? null,
  };
}

const resolvers = {
  Me: persona => ({
    me: persona ? { username: persona.email, displayName: persona.name, email: persona.email, roles: persona.roles } : null,
    limits: limitsOut(persona),
  }),
  Home: persona => ({
    startPage: {
      welcome: isMember(persona) ? state.settings.welcomeSv : state.settings.publicWelcomeSv,
      contactEmail: state.settings.contactEmail,
    },
    recentAlbums: visibleAlbums(persona).map(a => albumOut(persona, a)),
    thisDayInHistory: [],
    ...browseExtras(persona),
  }),
  Browse: (persona, { filter, page = 0, size = 50 }) => {
    const albums = filterAlbums(persona, filter ?? {});

    return {
      albums: { albums: albums.slice(page * size, page * size + size).map(a => albumOut(persona, a)), totalCount: albums.length, page, size },
      ...browseExtras(persona),
    };
  },
  Album: (persona, { id, size = 60 }) => {
    const a = albumById(id);

    return {
      album: canSeeAlbum(persona, a) ? { ...albumOut(persona, a), items: pageOfItems(persona, a, 0, size) } : null,
      limits: limitsOut(persona),
    };
  },
  AlbumMeta: (persona, { id }) => ({ album: canSeeAlbum(persona, albumById(id)) ? albumOut(persona, albumById(id)) : null }),
  AlbumItems: (persona, { id, page = 0, size = 60 }) => {
    const a = albumById(id);

    if (!canSeeAlbum(persona, a)) {
      throw notFound();
    }
    return { album: { id: a.id, items: pageOfItems(persona, a, page, size) } };
  },
  Item: (persona, { id }) => {
    const found = itemById(id);

    return { item: canSeeItem(persona, found) ? itemOut(persona, found) : null, limits: limitsOut(persona) };
  },
  ItemMedia: (persona, { ids }) => ({ itemMedia: ids.map(itemById).filter(i => canSeeItem(persona, i)).map(i => itemOut(persona, i)) }),
  SpexAlbums: (persona, { spexId }) => ({
    spexAlbums: visibleAlbums(persona).filter(a => a.spexIds.some(id => id === spexId || SPEX.find(s => s.id === id)?.parentId === spexId))
      .map(a => albumOut(persona, a)),
  }),
  Search: (persona, { q }) => {
    const term = q.toLowerCase();
    const matches = text => (text ?? "").toLowerCase().includes(term);

    return {
      search: {
        albums: visibleAlbums(persona).filter(a => matches(a.title) || matches(a.place) || matches(a.description)).map(a => albumOut(persona, a)),
        items: state.items.filter(i => canSeeItem(persona, i) && !i.trashedAt && (matches(i.caption) || matches(i.photographer))).map(i => itemOut(persona, i)),
      },
    };
  },
  SmartSearch: (persona, { q, filter }) => {
    requireMember(persona);
    state.smartSearches.push({ q, filter });
    return { smartSearch: state.items.filter(i => canSeeItem(persona, i) && !i.trashedAt && i.status === "READY").slice(0, 2).map(i => itemOut(persona, i)) };
  },
  SearchFilters: persona => {
    const { categories, years, albumKinds } = browseExtras(persona);

    return { categories, years, albumKinds };
  },
  MapItems: persona => {
    requireMember(persona);
    return {
      mapItems: state.items.filter(i => canSeeItem(persona, i) && !i.trashedAt && i.latitude !== null)
        .map(i => ({ id: i.id, latitude: i.latitude, longitude: i.longitude, takenAt: i.takenAt, thumbnailUrl: mediaOf(persona, i)?.thumbnailUrl, expiresAt: expires() })),
    };
  },
  MyContributions: persona => {
    requireMember(persona);
    return { myContributions: state.items.filter(i => i.owner === persona.sub && i.contributionStatus && !i.trashedAt).map(i => itemOut(persona, i)) };
  },
  MySuggestions: persona => {
    requireMember(persona);

    return {
      albumSuggestions: state.suggestions.filter(s => s.suggestedBy === persona.sub).map(s => suggestionOut(persona, s)),
      albumKinds: sortedKinds().map(kind => kindOut(kind.id)),
    };
  },
  MyReports: persona => {
    requireMember(persona);

    return { reports: state.reports.filter(r => r.reporter === persona.sub).map(r => reportOut(persona, r)) };
  },
  Contribute: (persona, { id }) => {
    requireMember(persona);

    const a = albumById(id);

    return { album: canSeeAlbum(persona, a) ? albumOut(persona, a) : null, limits: limitsOut(persona) };
  },
  ReportCreate: (persona, { input }) => {
    const found = itemById(input.itemId);

    if (!canSeeItem(persona, found)) {
      throw notFound();
    }
    if (!isMember(persona)) {
      if (!input.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
        throw new GraphQLError("BAD_REQUEST", "Ange en giltig e-postadress.");
      }
      if (input.turnstileToken !== TURNSTILE_TOKEN) {
        throw new GraphQLError("BAD_REQUEST", "Kontrollen att du är en människa misslyckades.");
      }
    }

    const report = {
      id: uuidOf(state.nextId++), itemId: found.id, reason: input.reason, message: input.message ?? null, status: "OPEN",
      reporter: isMember(persona) ? persona.sub : null, email: isMember(persona) ? null : input.email, outcome: null,
      outcomeMessage: null, createdAt: new Date().toISOString(), handledAt: null,
    };

    state.reports.push(report);
    if (input.reason === "I_AM_IN_IT") {
      report.hiddenFrom = found.visibility;
      found.visibility = isMember(persona) ? "UNPUBLISHED" : found.visibility === "PUBLIC" ? "MEMBERS" : found.visibility;
    }
    return { reportCreate: { id: report.id, status: "OPEN" } };
  },
  ContributionsAdd: (persona, { albumId, uploadIds }) => {
    requireMember(persona);

    const a = albumById(albumId);

    if (!canSeeAlbum(persona, a)) {
      throw notFound();
    }
    return { contributionsAdd: uploadIds.map(id => uploadResult(persona, id, a, true)) };
  },
  ContributionWithdraw: (persona, { itemId }) => {
    requireMember(persona);

    const found = itemById(itemId);

    if (!found || found.owner !== persona.sub || found.contributionStatus !== "WAITING") {
      throw notFound();
    }
    state.items = state.items.filter(i => i !== found);
    return { contributionWithdraw: null };
  },
  AlbumSuggest: (persona, { input }) => {
    requireMember(persona);

    const created = album(state.nextId++, input.title, {
      spexIds: [], kindId: input.kindId ?? sortedKinds()[0].id, dateFrom: input.dateFrom ?? null, dateTo: input.dateTo ?? null,
      place: input.place ?? null, description: input.description ?? null, visibility: "UNPUBLISHED", suggestedBy: persona.sub,
      createdAt: new Date().toISOString(),
    });
    const suggestion = {
      id: uuidOf(state.nextId++), title: input.title, albumId: created.id, suggestedBy: persona.sub, status: "OPEN",
      message: null, createdAt: new Date().toISOString(), handledAt: null,
    };

    state.albums.push(created);
    state.suggestions.push(suggestion);
    return { albumSuggest: { id: suggestion.id, album: { id: created.id } } };
  },
  // --- editing ---
  ManageAlbum: (persona, { id }) => {
    requireEditor(persona);

    const a = albumById(id);

    return {
      album: a ? { ...albumOut(persona, a), items: { ...albumOut(persona, a).items, items: state.items.filter(i => i.albumId === a.id && !i.trashedAt).map(i => itemOut(persona, i)) } } : null,
      albumKinds: sortedKinds().map(kind => kindOut(kind.id)),
      limits: limitsOut(persona),
    };
  },
  AlbumKinds: () => ({ albumKinds: sortedKinds().map(kind => kindOut(kind.id)) }),
  AlbumTitles: persona => {
    requireEditor(persona);
    return { albums: { albums: visibleAlbums(persona).map(a => ({ id: a.id, title: a.title, dateFrom: a.dateFrom, visibility: a.visibility })) } };
  },
  SpexSearch: (persona, { q }) => {
    requireEditor(persona);

    const term = q.toLowerCase();

    return { spexSearch: SPEX.filter(s => `${s.title} ${s.year}`.toLowerCase().includes(term)) };
  },
  Contributions: persona => {
    requireEditor(persona);
    return {
      contributions: state.items.filter(i => i.contributionStatus === "WAITING" && !i.trashedAt).map(i => itemOut(persona, i)),
      albumSuggestions: state.suggestions.filter(s => s.status === "OPEN").map(s => suggestionOut(persona, s)),
    };
  },
  Reports: (persona, { open = true }) => {
    requireEditor(persona);
    return { reports: state.reports.filter(r => (r.status === "OPEN") === open).map(r => reportOut(persona, r)) };
  },
  Unsorted: persona => {
    requireEditor(persona);

    const loose = state.items.filter(i => !i.albumId && !i.trashedAt);
    const days = [...new Set(loose.map(i => i.takenAt?.slice(0, 10) ?? null))];

    return { unsorted: days.map(date => ({ date, items: loose.filter(i => (i.takenAt?.slice(0, 10) ?? null) === date).map(i => itemOut(persona, i)) })) };
  },
  Trash: persona => {
    requireEditor(persona);
    return {
      trash: {
        albums: state.albums.filter(a => a.trashedAt).map(a => ({ ...albumOut(persona, a), itemCount: state.items.filter(i => i.albumId === a.id).length })),
        items: state.items.filter(i => i.trashedAt).map(i => itemOut(persona, i)),
      },
    };
  },
  AlbumCreate: (persona, { input }) => {
    requireEditor(persona);

    const created = album(state.nextId++, "", { ...albumInput(input), visibility: "UNPUBLISHED", createdAt: new Date().toISOString() });

    state.albums.push(created);
    audit(persona, "CREATE", "ALBUM", created.id, `Skapade albumet ${created.title}`);
    return { albumCreate: { id: created.id } };
  },
  AlbumUpdate: (persona, { id, input }) => {
    requireEditor(persona);

    const a = albumById(id);

    Object.assign(a, albumInput(input, a), { lastModifiedAt: new Date().toISOString() });
    audit(persona, "UPDATE", "ALBUM", a.id, `Ändrade albumet ${a.title}`);
    return { albumUpdate: { id } };
  },
  AlbumSetVisibility: (persona, { id, visibility, items }) => {
    requireEditor(persona);

    const a = albumById(id);

    let skipped = 0;

    a.visibility = visibility;
    if (items) {
      state.items.filter(i => i.albumId === id && !i.trashedAt && i.contributionStatus !== "WAITING").forEach(i => {
        if (hiddenByReport(i.id)) {
          skipped++;
        } else {
          i.visibility = visibility;
        }
      });
    }
    audit(persona, "VISIBILITY", "ALBUM", id, `Gjorde albumet ${a.title} ${visibility}`);
    return { albumSetVisibility: { album: { id, visibility }, skipped } };
  },
  AlbumSetCover: (persona, { id, itemId }) => {
    requireEditor(persona);
    albumById(id).coverItemId = itemId ?? null;
    return { albumSetCover: { id } };
  },
  AlbumTrash: (persona, { id }) => {
    requireEditor(persona);
    albumById(id).trashedAt = new Date().toISOString();
    audit(persona, "TRASH", "ALBUM", id, `Lade albumet ${albumById(id).title} i papperskorgen`);
    return { albumTrash: { id } };
  },
  AlbumRestore: (persona, { id }) => {
    requireEditor(persona);
    albumById(id).trashedAt = null;
    return { albumRestore: { id } };
  },
  AlbumDelete: (persona, { id, keepItems }) => {
    requireAdmin(persona);
    state.albums = state.albums.filter(a => a.id !== id);
    state.items = keepItems ? state.items.map(i => i.albumId === id ? { ...i, albumId: null } : i) : state.items.filter(i => i.albumId !== id);
    return { albumDelete: null };
  },
  ItemsAdd: (persona, { albumId, uploadIds }) => {
    requireEditor(persona);
    return { itemsAdd: uploadIds.map(id => uploadResult(persona, id, albumById(albumId), false)) };
  },
  ItemUpdate: (persona, { id, input }) => {
    const [found] = editableItems(persona, [id]);

    Object.assign(found, {
      caption: input.caption ?? null, photographer: input.photographer ?? null, takenAt: input.takenAt ?? found.takenAt,
      latitude: input.latitude ?? null, longitude: input.longitude ?? null,
    });
    audit(persona, "UPDATE", "ITEM", id, `Ändrade ${found.caption ?? found.originalFileName}`);
    return { itemUpdate: { id } };
  },
  ItemsUpdate: (persona, { ids, input }) => {
    const found = editableItems(persona, ids);
    let skipped = 0;

    for (const i of found) {
      for (const field of ["caption", "photographer", "visibility", "albumId"]) {
        if (input[field] !== undefined && input[field] !== null) {
          if (field === "visibility" && hiddenByReport(i.id)) {
            skipped++;
          } else {
            i[field] = input[field];
          }
        }
      }
    }
    audit(persona, input.visibility ? "VISIBILITY" : "UPDATE", "ITEM", ids[0], `Ändrade ${ids.length} bilder`);
    return { itemsUpdate: { items: found.map(i => ({ id: i.id })), skipped } };
  },
  ItemsTrash: (persona, { ids }) => {
    editableItems(persona, ids).forEach(i => {
      i.trashedAt = new Date().toISOString();
    });
    return { itemsTrash: ids.map(id => ({ id })) };
  },
  ItemsRestore: (persona, { ids }) => {
    editableItems(persona, ids).forEach(i => {
      i.trashedAt = null;
    });
    return { itemsRestore: ids.map(id => ({ id })) };
  },
  ItemsDelete: (persona, { ids }) => {
    requireAdmin(persona);
    state.items = state.items.filter(i => !ids.includes(i.id));
    return { itemsDelete: null };
  },
  TrashEmpty: persona => {
    requireAdmin(persona);
    state.albums = state.albums.filter(a => !a.trashedAt);
    state.items = state.items.filter(i => !i.trashedAt);
    return { trashEmpty: null };
  },
  ContributionsReview: (persona, { itemIds, accept }) => {
    const found = editableItems(persona, itemIds);

    if (accept) {
      found.forEach(i => Object.assign(i, { contributionStatus: "ACCEPTED", visibility: "MEMBERS" }));
    } else {
      state.items = state.items.filter(i => !itemIds.includes(i.id));
    }
    return { contributionsReview: itemIds.map(id => ({ id: uuidOf(state.nextId++), itemId: id, accepted: accept })) };
  },
  AlbumSuggestionReview: (persona, { id, accept, message }) => {
    requireEditor(persona);

    const suggestion = state.suggestions.find(s => s.id === id);

    Object.assign(suggestion, { status: accept ? "ACCEPTED" : "REJECTED", message: message ?? null, handledAt: new Date().toISOString() });
    if (suggestion.albumId) {
      if (accept) {
        albumById(suggestion.albumId).visibility = "MEMBERS";
      } else {
        state.albums = state.albums.filter(a => a.id !== suggestion.albumId);
      }
    }
    return { albumSuggestionReview: { id, status: suggestion.status } };
  },
  ReportHandle: (persona, { id, outcome, message }) => {
    requireEditor(persona);

    const report = state.reports.find(r => r.id === id);

    Object.assign(report, { status: "HANDLED", outcome, outcomeMessage: message ?? null, handledAt: new Date().toISOString() });
    if (outcome === "REMOVED") {
      itemById(report.itemId).trashedAt = new Date().toISOString();
    } else if (report.hiddenFrom) {
      itemById(report.itemId).visibility = report.hiddenFrom;
    }
    return { reportHandle: { id, status: "HANDLED" } };
  },
  // --- administration ---
  AuditLog: (persona, { page = 0, size = 50, filter = {} }) => {
    requireEditor(persona);

    const entries = state.audit.filter(entry => (isAdmin(persona) || entry.actorId === persona.sub)
      && (!filter?.entityId || entry.entityId === filter.entityId) && (!filter?.entityType || entry.entityType === filter.entityType)
      && (!filter?.action || entry.action === filter.action) && (!filter?.q || entry.summary.toLowerCase().includes(filter.q.toLowerCase())));

    return { auditLog: { entries: entries.slice(page * size, page * size + size), totalCount: entries.length, page, size } };
  },
  AuditActors: persona => {
    requireEditor(persona);
    return { auditActors: Object.values(PERSONAS).map(p => ({ id: p.sub, name: p.name })) };
  },
  Settings: persona => {
    requireAdmin(persona);
    return { settings: state.settings };
  },
  SettingsUpdate: (persona, { input }) => {
    requireAdmin(persona);
    state.settings = { ...state.settings, ...input };
    audit(persona, "UPDATE", "SETTINGS", null, "Ändrade inställningarna");
    return { settingsUpdate: state.settings };
  },
  MaintenanceJobs: persona => {
    requireAdmin(persona);
    return { maintenanceJobs: state.maintenanceJobs };
  },
  MaintenanceJobRun: (persona, { job }) => {
    requireAdmin(persona);

    const found = state.maintenanceJobs.find(candidate => candidate.job === job);

    Object.assign(found, { lastStartedAt: new Date().toISOString(), lastFinishedAt: new Date().toISOString(), lastSucceeded: true });
    return { maintenanceJobRun: true };
  },
  ImmichStatus: persona => {
    requireAdmin(persona);
    return {
      immichStatus: {
        available: state.immichUp, version: "v3.3.6", usedBytes: 12e9, availableBytes: 88e9, sizeBytes: 100e9,
        queues: [{ name: "thumbnailGeneration", paused: false, active: 1, waiting: 3, failed: 0 },
          { name: "videoConversion", paused: false, active: 0, waiting: 0, failed: 1 }],
        failedItems: state.items.filter(i => i.status === "FAILED").map(i => itemOut(persona, i)),
      },
    };
  },
  ImmichJobRun: persona => {
    requireAdmin(persona);
    return { immichJobRun: null };
  },
  AlbumKindCreate: (persona, { input }) => {
    requireAdmin(persona);

    const kind = { id: uuidOf(state.nextId++), ...input, position: state.kinds.length + 1 };

    state.kinds.push(kind);
    return { albumKindCreate: { id: kind.id } };
  },
  AlbumKindUpdate: (persona, { id, input }) => {
    requireAdmin(persona);
    Object.assign(state.kinds.find(kind => kind.id === id), input);
    return { albumKindUpdate: { id } };
  },
  AlbumKindsReorder: (persona, { ids }) => {
    requireAdmin(persona);
    ids.forEach((id, index) => {
      state.kinds.find(kind => kind.id === id).position = index + 1;
    });
    return { albumKindsReorder: ids.map(id => ({ id })) };
  },
  AlbumKindDelete: (persona, { id }) => {
    requireAdmin(persona);
    if (state.albums.some(a => a.kindId === id)) {
      throw new GraphQLError("CONFLICT", "Sorten används.");
    }
    state.kinds = state.kinds.filter(kind => kind.id !== id);
    return { albumKindDelete: null };
  },
};

function limitsOut(persona) {
  return {
    maxUploadBytes: state.settings.maxUploadGb * 1e9, maxVideoMinutes: state.settings.maxVideoMinutes,
    contributionMaxItems: state.settings.contributionMaxItems, contributionMaxGb: state.settings.contributionMaxGb,
    canDownloadOriginals: canDownloadOriginals(persona),
  };
}

function suggestionOut(persona, s) {
  const a = albumById(s.albumId);

  return {
    ...s, suggestedBy: bySub[s.suggestedBy]?.name ?? s.suggestedBy,
    album: a ? { ...albumOut(persona, a) } : null,
  };
}

function reportOut(persona, r) {
  const found = itemById(r.itemId);

  return {
    ...r,
    item: found && (isEditor(persona) || canSeeItem(persona, found)) ? itemOut(persona, found) : null,
    reporter: isEditor(persona) ? (r.email ?? bySub[r.reporter]?.name ?? null) : null,
    byVisitor: Boolean(r.email),
  };
}

function operationNameOf(query) {
  const match = /\b(query|mutation)\s+([A-Za-z0-9_]+)/.exec(query);
  return match ? match[2] : null;
}

function personaOf(req) {
  const token = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
    return bySub[payload.sub] ?? null;
  } catch {
    return null;
  }
}

function handleGraphql(req, body, res) {
  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    res.writeHead(400).end("{\"errors\":[{\"message\":\"bad json\"}]}");
    return;
  }
  const op = operationNameOf(payload.query || "");
  const resolver = op && resolvers[op];
  res.writeHead(200, { "content-type": "application/json" });
  if (!resolver) {
    console.warn(`[mock-backend] no resolver for ${op}`);
    res.end(JSON.stringify({ data: null, errors: [{ message: `No resolver for ${op}`, extensions: { classification: "INTERNAL_ERROR" } }] }));
    return;
  }
  try {
    // Anyone may ask: without a token the resolvers answer as for a visitor
    const persona = personaOf(req);
    const failure = state.failNext.get(op);

    if (failure) {
      state.failNext.delete(op);
      throw new GraphQLError(failure, "Något gick fel.");
    }
    res.end(JSON.stringify({ data: resolver(persona, payload.variables || {}) }));
  } catch (error) {
    if (error instanceof GraphQLError) {
      res.end(JSON.stringify({ data: null, errors: [{ message: error.message, extensions: { classification: error.classification } }] }));
    } else {
      console.error(error);
      res.end(JSON.stringify({ data: null, errors: [{ message: String(error), extensions: { classification: "INTERNAL_ERROR" } }] }));
    }
  }
}

// --- OIDC ----------------------------------------------------------------------------------------------------------

const oidcConfig = {
  issuer: ISSUER,
  authorization_endpoint: `${ISSUER}/protocol/openid-connect/auth`,
  token_endpoint: `${ISSUER}/protocol/openid-connect/token`,
  userinfo_endpoint: `${ISSUER}/protocol/openid-connect/userinfo`,
  jwks_uri: `${ISSUER}/protocol/openid-connect/certs`,
  end_session_endpoint: `${ISSUER}/protocol/openid-connect/logout`,
  response_types_supported: ["code"],
  subject_types_supported: ["public"],
  id_token_signing_alg_values_supported: ["RS256"],
};

const { privateKey, publicKey } = await generateKeyPair("RS256", { extractable: true });
const publicJwk = { ...(await exportJWK(publicKey)), kid: KID, alg: "RS256", use: "sig" };
const pendingCodes = new Map();

const userClaims = persona => ({
  sub: persona.sub,
  name: persona.name,
  email: persona.email,
  email_verified: true,
  preferred_username: persona.email,
});

const signJwt = (persona, claims, audience) =>
  new SignJWT(claims)
    .setProtectedHeader({ alg: "RS256", kid: KID, typ: "JWT" })
    .setIssuer(ISSUER)
    .setSubject(persona.sub)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_TTL}s`)
    .sign(privateKey);

function handleAuthorize(url, res) {
  const redirectUri = url.searchParams.get("redirect_uri");
  if (!redirectUri) {
    res.writeHead(400).end("missing redirect_uri");
    return;
  }
  const code = randomUUID();
  pendingCodes.set(code, { nonce: url.searchParams.get("nonce"), persona: PERSONAS[currentPersona] });
  const target = new URL(redirectUri);
  target.searchParams.set("code", code);
  const stateParam = url.searchParams.get("state");
  if (stateParam) {
    target.searchParams.set("state", stateParam);
  }
  res.writeHead(302, { location: target.toString() }).end();
}

async function handleToken(body, res) {
  const params = new URLSearchParams(body);
  let pending = { nonce: null, persona: PERSONAS[currentPersona] };

  if (params.get("grant_type") === "authorization_code") {
    const code = params.get("code");
    if (!pendingCodes.has(code)) {
      res.writeHead(400, { "content-type": "application/json" }).end(JSON.stringify({ error: "invalid_grant" }));
      return;
    }
    pending = pendingCodes.get(code);
    pendingCodes.delete(code);
  }
  const { persona, nonce } = pending;
  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify({
    access_token: await signJwt(persona, {
      ...userClaims(persona),
      typ: "Bearer",
      azp: CLIENT_ID,
      resource_access: { [CLIENT_ID]: { roles: persona.roles } },
    }, "account"),
    id_token: await signJwt(persona, { ...userClaims(persona), ...(nonce ? { nonce } : {}) }, CLIENT_ID),
    refresh_token: `refresh-${randomUUID()}`,
    token_type: "Bearer",
    expires_in: TOKEN_TTL,
    scope: "openid profile email",
  }));
}

// --- tus ------------------------------------------------------------------------------------------------------------

function handleTus(req, path, body, res) {
  const headers = { "tus-resumable": "1.0.0" };
  const id = path.split("/")[3];
  const persona = personaOf(req);

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      ...headers,
      "tus-version": "1.0.0",
      "tus-extension": "creation,termination",
      "tus-max-size": "53687091200",
    }).end();
  } else if (!persona || !isMember(persona)) {
    res.writeHead(403, { "content-type": "application/json" }).end(JSON.stringify({
      code: "FORBIDDEN",
      message: "Du har inte behörighet att göra det.",
    }));
  } else if (req.method === "POST") {
    const upload = randomUUID();
    const metadata = Object.fromEntries((req.headers["upload-metadata"] ?? "").split(",").filter(Boolean)
      .map(pair => pair.trim().split(" ")).map(([key, value]) => [key, Buffer.from(value ?? "", "base64").toString("utf8")]));

    state.uploads.set(upload, {
      name: metadata.filename ?? "upload",
      length: Number(req.headers["upload-length"]),
      offset: 0,
    });
    res.writeHead(201, { ...headers, location: `/api/uploads/${upload}` }).end();
  } else if (!state.uploads.has(id)) {
    res.writeHead(404, headers).end();
  } else if (req.method === "HEAD") {
    const upload = state.uploads.get(id);

    res.writeHead(200, {
      ...headers,
      "upload-offset": String(upload.offset),
      "upload-length": String(upload.length),
      "cache-control": "no-store",
    }).end();
  } else if (req.method === "PATCH") {
    const upload = state.uploads.get(id);

    if (Number(req.headers["upload-offset"]) !== upload.offset) {
      res.writeHead(409, headers).end();
      return;
    }
    upload.offset += body.length;
    res.writeHead(204, { ...headers, "upload-offset": String(upload.offset) }).end();
  } else if (req.method === "DELETE") {
    state.uploads.delete(id);
    res.writeHead(204, headers).end();
  } else {
    res.writeHead(405).end();
  }
}

const server = createServer((req, res) => {
  const chunks = [];
  req.on("data", chunk => chunks.push(chunk));
  req.on("end", () => handle(req, res, chunks).catch(error => {
    // A broken handler answers 500 instead of taking the mock down for every later test
    console.error(error);
    if (!res.headersSent) {
      res.writeHead(500).end();
    }
  }));
});

async function handle(req, res, chunks) {
  const url = new URL(req.url || "", `http://localhost:${PORT}`);
  const path = url.pathname;
  const rawBody = Buffer.concat(chunks);
  const body = rawBody.toString("utf8");

  if (path.endsWith("/.well-known/openid-configuration")) {
    res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(oidcConfig));
  } else if (path.endsWith("/protocol/openid-connect/certs")) {
    res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ keys: [publicJwk] }));
  } else if (path.endsWith("/protocol/openid-connect/auth")) {
    handleAuthorize(url, res);
  } else if (path.endsWith("/protocol/openid-connect/token")) {
    await handleToken(body, res);
  } else if (path.endsWith("/protocol/openid-connect/userinfo")) {
    const persona = personaOf(req) ?? PERSONAS[currentPersona];
    res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(userClaims(persona)));
  } else if (path.endsWith("/protocol/openid-connect/logout")) {
    res.writeHead(302, { location: url.searchParams.get("post_logout_redirect_uri") || `http://localhost:${PORT}/` }).end();
  } else if (req.method === "POST" && path === "/__reset") {
    resetState();
    currentPersona = "admin";
    res.writeHead(204).end();
  } else if (req.method === "POST" && path === "/__persona") {
    currentPersona = JSON.parse(body).persona;
    res.writeHead(204).end();
  } else if (req.method === "POST" && path === "/__fail") {
    const { operation, classification } = JSON.parse(body);
    state.failNext.set(operation, classification);
    res.writeHead(204).end();
  } else if (req.method === "POST" && path === "/__process") {
    // Immich finishes every item it is processing
    state.items.filter(i => i.status === "PROCESSING").forEach(i => {
      i.status = "READY";
    });
    res.writeHead(204).end();
  } else if (req.method === "POST" && path === "/__settings") {
    Object.assign(state.settings, JSON.parse(body));
    res.writeHead(204).end();
  } else if (req.method === "GET" && path === "/__state") {
    res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({
      uploads: state.uploads.size, albums: state.albums, items: state.items, reports: state.reports,
      suggestions: state.suggestions, settings: state.settings, smartSearches: state.smartSearches,
    }));
  } else if (path === "/api/uploads" || path.startsWith("/api/uploads/")) {
    handleTus(req, path, rawBody, res);
  } else if (req.method === "GET" && /^\/api\/albums\/[^/]+\/zip$/.test(path)) {
    const persona = personaOf(req);

    if (!canDownloadOriginals(persona) || !canSeeAlbum(persona, albumById(path.split("/")[3]))) {
      res.writeHead(403).end();
      return;
    }
    res.writeHead(200, { "content-type": "application/zip", "content-disposition": "attachment; filename=\"album.zip\"" })
      .end(Buffer.from("PK\u0005\u0006" + "\u0000".repeat(18), "binary"));
  } else if (req.method === "OPTIONS" && path.startsWith("/a/")) {
    // As nginx answers a preflight (the tests' extra headers cause one)
    res.writeHead(204, {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, HEAD, OPTIONS",
      "access-control-allow-headers": req.headers["access-control-request-headers"] ?? "*",
    }).end();
  } else if (req.method === "GET" && path.startsWith("/a/")) {
    // The media server: every photo is the same small PNG; videos are not served
    if (path.includes("/video/")) {
      res.writeHead(404, { "access-control-allow-origin": "*" }).end();
      return;
    }
    res.writeHead(200, { "content-type": "image/png", "access-control-allow-origin": "*", "cache-control": "no-store" }).end(PNG);
  } else if (req.method === "POST" && path.includes("/api/graphql")) {
    handleGraphql(req, body, res);
  } else {
    res.writeHead(404).end();
  }
}

server.listen(PORT, () => {
  console.log(`[mock-backend] listening on http://localhost:${PORT}`);
});
