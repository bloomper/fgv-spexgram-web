import { acceptCookies, expect, ids, test } from "./fixtures";

const WIDTH = 375;

async function fits(page: import("@playwright/test").Page, path: string) {
  await page.goto(path);
  await page.getByRole("heading", { level: 1 }).last().waitFor();
  expect(await page.evaluate(() => document.documentElement.scrollWidth), path).toBeLessThanOrEqual(WIDTH);
  // Tables may scroll inside their frame, but not so far that their last column is out of sight
  for (const table of await page.locator("table").all()) {
    expect(await table.evaluate(element => element.scrollWidth), path).toBeLessThanOrEqual(WIDTH);
  }
}

test.describe("Phone width: no page scrolls sideways", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: WIDTH, height: 812 });
  });

  test("the public pages fit the screen", async ({ page }) => {
    await page.goto("/");
    await acceptCookies(page);
    for (const path of ["/", "/albums", `/albums/${ids.publicAlbum}`, `/items/${ids.publicItemInMembersAlbum}`,
      `/spex/${ids.spex}`, "/search?q=nobel", `/albums/${ids.membersAlbum}`]) {
      await fits(page, path);
    }
  });

  test("the members' pages fit the screen, and the menu opens", async ({ page, loginAs }) => {
    await loginAs("viewer");
    for (const path of ["/", `/albums/${ids.membersAlbum}`, `/albums/${ids.membersAlbum}/contribute`, "/contributions",
      "/suggestions", "/reports", "/map", "/search?q=talet&smart=1"]) {
      await fits(page, path);
    }
    await page.getByRole("button", { name: "Visa eller dölj menyn" }).click();
    await expect(page.getByRole("link", { name: "Mina bidrag" })).toBeVisible();
  });

  test("the editing and admin pages fit the screen", async ({ page, loginAs }) => {
    await loginAs("admin");
    for (const path of ["/manage/albums", `/manage/albums/${ids.membersAlbum}`, "/manage/albums/new", "/manage/contributions",
      "/manage/reports", "/manage/unsorted", "/manage/trash", "/manage/audit", "/admin/settings", "/admin/kinds",
      "/admin/immich", "/admin/maintenance"]) {
      await fits(page, path);
    }
  });
});
