import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { CombinedError } from "@urql/core";
import { GraphQLError } from "graphql";
import { tokenWithRoles } from "@/utils/__tests__/token";

const mocks = vi.hoisted(() => ({
  getAccessToken: vi.fn(),
  getSessionContext: vi.fn(),
  createClient: vi.fn((options: unknown) => options),
  authExchange: vi.fn((init: unknown) => init),
}));

vi.mock("@/utils/auth.server", () => ({ getAccessToken: mocks.getAccessToken, getSessionContext: mocks.getSessionContext }));
vi.mock("next-intl/server", () => ({
  getLocale: async () => "sv",
  getTranslations: async () => (key: string) => key,
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "cf-connecting-ip": "192.0.2.7" }) }));
vi.mock("@urql/core", async importOriginal => ({ ...(await importOriginal<typeof import("@urql/core")>()), createClient: mocks.createClient }));
vi.mock("@urql/exchange-auth", () => ({ authExchange: mocks.authExchange }));
vi.mock("@urql/next/rsc", () => ({ registerUrql: (make: () => unknown) => ({ getClient: make }) }));

const fetchMock = vi.fn(async () => new Response("{}"));

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockClear();
  mocks.getAccessToken.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("the GraphQL client", () => {
  type Auth = {
    addAuthToOperation: (operation: unknown) => unknown;
    didAuthError: (error: CombinedError) => boolean;
    refreshAuth: () => Promise<void>;
    willAuthError: () => boolean;
  };
  type Options = { url: string; exchanges: unknown[]; fetch: (input: string, init?: RequestInit) => Promise<Response> };

  it("adds the token once it has one, and asks again when the server says it is not authenticated", async () => {
    vi.stubEnv("API_GRAPHQL_ENDPOINT", "http://api/graphql");
    const { getClient } = await import("@/lib/urql.server");
    const options = getClient() as unknown as Options;
    const init = options.exchanges[1] as (utils: { appendHeaders: (o: unknown, h: Record<string, string>) => unknown }) => Promise<Auth>;
    const appendHeaders = vi.fn((operation: unknown, headers: Record<string, string>) => ({ operation, headers }));
    const auth = await init({ appendHeaders });

    expect(options.url).toBe("http://api/graphql");
    expect(auth.willAuthError()).toBe(true);
    expect(auth.addAuthToOperation("op")).toBe("op");
    mocks.getAccessToken.mockResolvedValue("token-1");
    await auth.refreshAuth();
    expect(auth.willAuthError()).toBe(false);
    expect(auth.addAuthToOperation("op")).toEqual({ operation: "op", headers: { Authorization: "Bearer token-1" } });
    expect(auth.didAuthError(new CombinedError({ graphQLErrors: [new GraphQLError("no", { extensions: { code: "UNAUTHENTICATED" } })] }))).toBe(true);
    expect(auth.didAuthError(new CombinedError({ graphQLErrors: [new GraphQLError("no", { extensions: { code: "NOT_FOUND" } })] }))).toBe(false);
  });

  it("sends the language, and the visitor's address only together with the shared secret", async () => {
    const { getClient } = await import("@/lib/urql.server");
    const options = getClient() as unknown as Options;

    await options.fetch("http://api/graphql", { headers: { "content-type": "application/json" } });
    let headers = new Headers((fetchMock.mock.calls.at(-1) as unknown as [string, RequestInit])[1].headers);
    expect(headers.get("accept-language")).toBe("sv");
    expect(headers.get("x-client-ip")).toBeNull();

    vi.stubEnv("API_CLIENT_IP_SECRET", "s");
    await options.fetch("http://api/graphql");
    headers = new Headers((fetchMock.mock.calls.at(-1) as unknown as [string, RequestInit])[1].headers);
    expect(headers.get("x-client-ip")).toBe("192.0.2.7");
    expect(headers.get("x-client-ip-secret")).toBe("s");
  });
});

describe("the plain HTTP endpoints", () => {
  it("are next to GraphQL unless API_ENDPOINT says otherwise", async () => {
    const { apiUrl } = await import("@/lib/api.server");

    vi.stubEnv("API_ENDPOINT", "");
    vi.stubEnv("API_GRAPHQL_ENDPOINT", "http://api:8080/api/graphql");
    expect(apiUrl("/api/uploads")).toBe("http://api:8080/api/uploads");
    vi.stubEnv("API_ENDPOINT", "http://other");
    expect(apiUrl("/api/uploads")).toBe("http://other/api/uploads");
  });

  it("are called with the token and the language", async () => {
    const { apiFetch } = await import("@/lib/api.server");

    mocks.getAccessToken.mockResolvedValue("t");
    await apiFetch("/api/x");
    expect(new Headers((fetchMock.mock.calls.at(-1) as unknown as [string, RequestInit])[1].headers).get("authorization")).toBe("Bearer t");
    mocks.getAccessToken.mockResolvedValue(null);
    await apiFetch("/api/x", { method: "POST" });
    expect(new Headers((fetchMock.mock.calls.at(-1) as unknown as [string, RequestInit])[1].headers).get("authorization")).toBeNull();
  });
});

describe("forwarding a form", () => {
  const ID = "00000000-0000-7000-8000-000000000001";
  const request = (origin = "http://localhost:3104") => new NextRequest("http://localhost:3104/api/x", {
    method: "POST", headers: { origin, host: "localhost:3104" }, body: new FormData(),
  });

  it("refuses bad ids and other sites, and passes the server's error on", async () => {
    const { forwardForm } = await import("@/lib/http/forward-form.server");

    expect((await forwardForm(request(), "nope", id => `/api/${id}`)).status).toBe(400);
    expect((await forwardForm(request("https://evil.example"), ID, id => `/api/${id}`)).status).toBe(403);

    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ code: "BAD_REQUEST", message: "Fel" }), { status: 400 }));
    const failed = await forwardForm(request(), ID, id => `/api/${id}`);
    expect(failed.status).toBe(400);
    expect(await failed.json()).toEqual({ code: "BAD_REQUEST", message: "Fel" });

    fetchMock.mockResolvedValueOnce(new Response("not json", { status: 500 }));
    expect(await (await forwardForm(request(), ID, id => `/api/${id}`)).json()).toEqual({ code: null, message: null });

    fetchMock.mockResolvedValueOnce(new Response("{}"));
    expect(await (await forwardForm(request(), ID, id => `/api/${id}`)).json()).toEqual({ ok: true });
  });
});

describe("who is looking", () => {
  it("tells visitors, members and editors apart", async () => {
    const { getViewer } = await import("@/lib/gram/viewer.server");

    mocks.getSessionContext.mockResolvedValue({ session: null, roles: [] });
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "");
    vi.stubEnv("TURNSTILE_SITE_KEY", " key ");
    expect(await getViewer()).toEqual({
      loggedIn: false, member: false, editor: false, admin: false, report: { visitor: true, turnstileSiteKey: "key" },
    });

    mocks.getSessionContext.mockResolvedValue({ session: {}, roles: ["USER", "EDITOR"] });
    vi.stubEnv("TURNSTILE_SITE_KEY", "");
    expect(await getViewer()).toMatchObject({ loggedIn: true, member: true, editor: true, admin: false, report: { visitor: false, turnstileSiteKey: null } });
  });
});

describe("metadata", () => {
  it("keeps private pages out of search engines and gives public ones Open Graph tags", async () => {
    const { privateMetadata, publicMetadata } = await import("@/lib/gram/metadata.server");

    expect(await privateMetadata()).toEqual({ title: "title", robots: { index: false, follow: false } });
    expect(publicMetadata({ title: "Nobel", description: null })).toMatchObject({
      title: "Nobel – Spexgram", robots: { index: true }, twitter: { card: "summary" }, openGraph: { images: undefined },
    });
    expect(publicMetadata({ title: "Nobel", image: { url: "u", alt: "a", width: 10 }, type: "article" })).toMatchObject({
      twitter: { card: "summary_large_image" }, openGraph: { type: "article", images: [{ url: "u", width: 10, height: undefined, alt: "a" }] },
    });
  });
});

describe("the applications", () => {
  it("lists the others from the token's roles, and only Spexgram without a session", async () => {
    const { getApplications } = await import("@/utils/applications.server");

    mocks.getSessionContext.mockResolvedValue({ accessToken: null });
    expect((await getApplications()).map(app => app.id)).toEqual(["spexgram"]);
    mocks.getSessionContext.mockResolvedValue({ accessToken: tokenWithRoles(["USER"]) });
    expect((await getApplications()).map(app => app.id)).toContain("spexgram");
  });
});
