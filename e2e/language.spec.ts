import { acceptCookies, expect, ids, test } from "./fixtures";

test.describe("Language", () => {
  test("switches to English and back, for visitors too", async ({ page }) => {
    await page.goto(`/albums/${ids.publicAlbum}`);
    await acceptCookies(page);
    await page.getByRole("button", { name: "Byt språk" }).click();
    await page.getByRole("menuitem", { name: "English" }).click();

    await expect(page.getByRole("link", { name: "Log in" }).first()).toBeVisible();
    await expect(page.getByText(/3 photos and videos/)).toBeVisible();

    await page.getByRole("button", { name: "Change language" }).click();
    await page.getByRole("menuitem", { name: "Svenska" }).click();
    await expect(page.getByRole("link", { name: "Logga in" }).first()).toBeVisible();
  });
});

test.describe("Visitor statistics", () => {
  test("no tracker is loaded without Umami's address and website", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("script[src='/stats/script.js']")).toHaveCount(0);
  });
});
