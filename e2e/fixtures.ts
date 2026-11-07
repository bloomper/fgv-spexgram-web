import { expect, type Page, test as base } from "@playwright/test";
import { MOCK_URL, TURNSTILE_TOKEN, uuidOf } from "./constants";

type Persona = "admin" | "editor" | "viewer" | "noaccess";

let logins = 0;

/** A documentation address (RFC 5737) per login: 192.0.2.1, 192.0.2.2, … */
function nextClientIp() {
  logins = logins % 254 + 1;
  return `192.0.2.${logins}`;
}

export const test = base.extend<{
  resetBackend: void;
  noNativeDialogs: void;
  loginAs: (persona: Persona) => Promise<void>;
  mock: Mock
}>({
  resetBackend: [async ({ request }, provide) => {
    await request.post(`${MOCK_URL}/__reset`);
    await provide();
  }, { auto: true }],
  // The application asks in its own dialogs; a native confirm or prompt fails the test
  noNativeDialogs: [async ({ page }, provide) => {
    const native: string[] = [];

    page.on("dialog", dialog => {
      native.push(`${dialog.type()}: ${dialog.message()}`);
      void dialog.dismiss();
    });
    await provide();
    expect(native, "native dialogs").toEqual([]);
  }, { auto: true }],
  loginAs: async ({ page, request }, provide) => {
    await provide(async (persona: Persona) => {
      expect((await request.post(`${MOCK_URL}/__persona`, { data: { persona } })).status(), "persona set").toBe(204);
      // Better Auth limits requests per client IP. Every test comes from the same machine, so without an address
      // of its own each login would count against one shared limit, and a busy run gets "Too many requests"
      await page.setExtraHTTPHeaders({ "x-forwarded-for": nextClientIp() });
      // A second login in one test starts afresh too: c15t also remembers the dismissed notice in local storage
      if (page.url().startsWith("http")) {
        await page.evaluate(() => localStorage.clear());
        // Leave the page first: its own requests would otherwise start logins of their own once the cookies are
        // gone, and theirs replace this login's state cookie ("State mismatch", now and then a failed login)
        await page.goto("about:blank");
      }
      await page.context().clearCookies();
      await page.goto("/api/auth/login");
      await page.waitForURL(url => !url.pathname.startsWith("/api/auth"));
      await page.getByRole("button", { name: "Jag förstår" }).click();
      await consentStored(page);
    });
  },
  mock: async ({ request }, provide) => {
    await provide({
      failNext: async (operation: string, classification: string) => {
        await request.post(`${MOCK_URL}/__fail`, { data: { operation, classification } });
      },
      process: async () => {
        await request.post(`${MOCK_URL}/__process`);
      },
      settings: async (settings: Record<string, unknown>) => {
        await request.post(`${MOCK_URL}/__settings`, { data: settings });
      },
      state: async () => (await request.get(`${MOCK_URL}/__state`)).json() as Promise<MockState>,
    });
  },
});

type MockItem = {
  id: string;
  albumId: string | null;
  caption: string | null;
  photographer: string | null;
  visibility: string;
  status: string;
  contributionStatus: string | null;
  owner: string;
  originalFileName: string;
  trashedAt: string | null;
};

type MockState = {
  uploads: number;
  albums: { id: string; title: string; visibility: string; kindId: string; spexIds: string[]; dateFrom: string | null; trashedAt: string | null }[];
  items: MockItem[];
  reports: { id: string; itemId: string; reason: string; email: string | null; reporter: string | null; status: string }[];
  suggestions: { id: string; title: string; status: string; albumId: string | null }[];
  smartSearches: { q: string }[];
};

type Mock = {
  /** Makes the next call of a GraphQL operation, e.g. "AlbumUpdate", fail with the classification, e.g. "CONFLICT". */
  failNext: (operation: string, classification: string) => Promise<void>;
  /** Immich finishes every item it is processing. */
  process: () => Promise<void>;
  /** Changes the server's settings, e.g. whether members download originals. */
  settings: (settings: Record<string, unknown>) => Promise<void>;
  /** What the backend holds, for checking what the web sent. */
  state: () => Promise<MockState>;
};

/** The sample ids, as the mock backend numbers them. */
export const ids = {
  publicAlbum: uuidOf(10),
  membersAlbum: uuidOf(20),
  unpublishedAlbum: uuidOf(30),
  rehearsals: uuidOf(40),
  publicItem: uuidOf(101),
  membersItemInPublicAlbum: uuidOf(103),
  publicItemInMembersAlbum: uuidOf(202),
  spex: uuidOf(1),
};

/**
 * Dismisses the cookie notice for a visitor, who never logs in.
 */
export async function acceptCookies(page: Page) {
  await page.getByRole("button", { name: "Jag förstår" }).click();
  await consentStored(page);
}

/**
 * Stands in for Cloudflare Turnstile's script: a widget that passes at once with the token the mock backend accepts.
 */
export async function mockTurnstile(page: Page) {
  await page.route("https://challenges.cloudflare.com/**", route => route.fulfill({
    contentType: "application/javascript",
    body: `window.turnstile = {
      render(container, options) {
        container.textContent = "Turnstile (mock)";
        setTimeout(() => options.callback("${TURNSTILE_TOKEN}"), 50);
        return "mock-widget";
      },
      remove() {},
    };`,
  }));
}

/**
 * c15t stores the dismissed cookie notice after the click, so a page opened right away would show the banner again,
 * over the bottom right corner where sheets have their buttons.
 */
export async function consentStored(page: Page) {
  await expect.poll(async () => (await page.context().cookies()).some(cookie => cookie.name === "c15t-notice")).toBe(true);
}

/**
 * Waits until React has hydrated the element: a file chosen with {@code setInputFiles} before that is lost, since the
 * browser's change event fires before React listens.
 */
export async function hydrated(page: Page, selector: string) {
  await page.waitForFunction(css => {
    const element = document.querySelector(css);

    return element !== null && Object.keys(element).some(key => key.startsWith("__reactProps"));
  }, selector);
}

/**
 * Answers the application's own confirm dialog by clicking its button.
 */
export async function answerDialog(page: Page, button: string) {
  const dialog = page.getByRole("dialog");

  await dialog.getByRole("button", { name: button, exact: true }).click();
  await expect(dialog).toBeHidden();
}

export { expect } from "@playwright/test";
