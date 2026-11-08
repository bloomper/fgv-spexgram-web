import type { Page } from "@playwright/test";
import { acceptCookies, expect, ids, mockTurnstile, test } from "./fixtures";

/** Small and common phones, and a tablet. */
const SCREENS = [
  { width: 360, height: 740 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
];

const PUBLIC_PAGES = ["/", "/albums", `/albums/${ids.publicAlbum}`, `/items/${ids.publicItemInMembersAlbum}`,
  `/spex/${ids.spex}`, "/search?q=nobel", `/albums/${ids.membersAlbum}`, "/about", "/support"];
const MEMBER_PAGES = ["/", `/albums/${ids.membersAlbum}`, `/albums/${ids.membersAlbum}/contribute`, "/contributions",
  "/suggestions", "/reports", "/map", "/search?q=talet&smart=1", `/items/${ids.publicItem}`];
const EDITOR_PAGES = ["/manage/albums", `/manage/albums/${ids.membersAlbum}`, "/manage/albums/new", "/manage/contributions",
  "/manage/reports", "/manage/unsorted", "/manage/trash", "/manage/audit", "/admin/settings", "/admin/kinds",
  "/admin/immich", "/admin/maintenance"];

/**
 * The page does not scroll sideways, and a table fits its frame, so that its last column is in sight.
 */
async function fits(page: Page, path: string) {
  await page.goto(path);
  await page.getByRole("heading", { level: 1 }).last().waitFor();

  const { scrollWidth, width, tables } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    width: document.documentElement.clientWidth,
    tables: [...document.querySelectorAll("table")].map(table => ({
      table: Math.ceil(table.getBoundingClientRect().width),
      frame: Math.ceil(table.parentElement!.getBoundingClientRect().width),
    })),
  }));

  expect(scrollWidth, `${path} scrolls sideways`).toBeLessThanOrEqual(width);
  for (const { table, frame } of tables) {
    expect(table, `${path}: a table is wider than its frame`).toBeLessThanOrEqual(frame);
  }
}

/**
 * Every control in the box lies inside the screen; none is pushed out or covered by its neighbour.
 */
async function controlsInSight(page: Page, selector: string, what: string) {
  const boxes = await page.locator(selector).evaluateAll(elements => elements
    .map(element => element.getBoundingClientRect())
    .filter(rect => rect.width > 0)
    .map(rect => ({ left: rect.left, right: rect.right })));
  const width = await page.evaluate(() => document.documentElement.clientWidth);

  expect(boxes.length, what).toBeGreaterThan(0);
  boxes.forEach(({ left, right }, index) => {
    expect(left, `${what} ${index} starts off screen`).toBeGreaterThanOrEqual(0);
    expect(right, `${what} ${index} ends off screen`).toBeLessThanOrEqual(width);
    if (index > 0) {
      expect(left, `${what} ${index} overlaps the one before`).toBeGreaterThanOrEqual(boxes[index - 1].right - 1);
    }
  });
}

for (const screen of SCREENS) {
  test.describe(`${screen.width} × ${screen.height}: no page scrolls sideways`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(screen);
    });

    test("the public pages fit the screen, and the header's controls are all in sight", async ({ page }) => {
      await page.goto("/");
      await acceptCookies(page);
      for (const path of PUBLIC_PAGES) {
        await fits(page, path);
      }
      await controlsInSight(page, "header button, header a, header input", "header control");
      if (screen.width < 768) {
        await page.getByRole("button", { name: "Visa menyn" }).click();
      }
      await expect(page.getByRole("link", { name: "Album", exact: true }).last()).toBeVisible();
    });

    test("the members' pages fit the screen, and the menu opens", async ({ page, loginAs }) => {
      await loginAs("viewer");
      for (const path of MEMBER_PAGES) {
        await fits(page, path);
      }
      await controlsInSight(page, "header button, header a, header input", "header control");
      if (screen.width < 768) {
        await page.getByRole("button", { name: "Visa menyn" }).click();
      }
      await expect(page.getByRole("link", { name: "Mina bidrag" })).toBeVisible();
    });

    test("the editing and admin pages fit the screen", async ({ page, loginAs }) => {
      await loginAs("admin");
      for (const path of EDITOR_PAGES) {
        await fits(page, path);
      }
    });

    test("the viewer's toolbar and the report dialog fit the screen", async ({ page }) => {
      await mockTurnstile(page);
      await page.goto(`/albums/${ids.publicAlbum}`);
      await acceptCookies(page);
      await page.getByTestId("gallery-item").nth(1).click();

      const viewer = page.locator(".yarl__root");

      await expect(viewer).toBeVisible();
      await controlsInSight(page, ".yarl__toolbar > *", "toolbar button");
      await viewer.getByRole("button", { name: "Anmäl" }).click();

      const dialog = page.getByRole("dialog");

      await expect(dialog.getByTestId("turnstile")).toBeVisible();
      expect(await dialog.evaluate(element => element.scrollWidth - element.clientWidth), "the dialog scrolls sideways").toBeLessThanOrEqual(0);
    });
  });
}
