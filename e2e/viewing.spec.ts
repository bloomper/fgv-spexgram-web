import { expect, ids, test } from "./fixtures";

test.describe("Viewing, for members", () => {
  test("a member browses a members' album and moves through it in the viewer", async ({ page, loginAs }) => {
    await loginAs("viewer");
    await page.goto("/albums");
    await page.getByRole("link", { name: /Sittning efter premiären/ }).click();

    await expect(page.getByRole("heading", { level: 1, name: "Sittning efter premiären" })).toBeVisible();
    await page.getByRole("button", { name: "Sittningen börjar" }).click();

    const viewer = page.locator(".yarl__root");

    await expect(viewer.getByRole("img", { name: "Sittningen börjar" })).toBeVisible();
    await expect(viewer.getByText("1 / 3", { exact: true })).toBeVisible();
    await page.keyboard.press("ArrowRight");
    await expect(viewer.getByText("2 / 3", { exact: true })).toBeVisible();
    await expect(viewer.getByText("Gruppbild på trappan")).toBeVisible();
    await viewer.getByRole("button", { name: "Nästa" }).click();
    await expect(viewer.getByText("3 / 3", { exact: true })).toBeVisible();
    await expect(viewer.getByRole("button", { name: "Ladda ner originalet" })).toHaveCount(0);

    const download = page.waitForEvent("download");

    await viewer.getByRole("button", { name: "Ladda ner", exact: true }).click();
    expect((await download).suggestedFilename()).toBe("Talet 1975-02-15.jpg");

    await page.keyboard.press("Escape");
    await expect(viewer).toHaveCount(0);
  });

  test("the viewer opens an item's own page, which links back to its album", async ({ page, loginAs }) => {
    await loginAs("viewer");
    await page.goto(`/albums/${ids.membersAlbum}`);
    await page.getByRole("button", { name: "Talet" }).click();
    await page.locator(".yarl__root").getByRole("link", { name: "Öppna bildens sida" }).click();

    await expect(page.getByRole("heading", { level: 1, name: "Talet" })).toBeVisible();
    await expect(page.getByTestId("item-album-link")).toHaveText("Albumet Sittning efter premiären");
    await expect(page.getByText("Foto: Anna Andersson")).toBeVisible();
  });

  test("a members' item in a public album is shown to members, and the album to them is not indexed", async ({ page, loginAs }) => {
    await loginAs("viewer");
    await page.goto(`/albums/${ids.publicAlbum}`);
    await expect(page.getByRole("button", { name: "Bakom scenen" })).toBeVisible();

    await page.goto(`/albums/${ids.membersAlbum}`);
    await expect(page.locator("meta[name='robots']")).toHaveAttribute("content", /noindex/);
  });

  test("originals and the album as a zip when admins allow members them", async ({ page, loginAs, mock }) => {
    await mock.settings({ userDownloadsOriginals: true });
    await loginAs("viewer");
    await page.goto(`/albums/${ids.membersAlbum}`);

    await expect(page.getByRole("button", { name: "Ladda ner albumet" })).toHaveAttribute("href", `/api/albums/${ids.membersAlbum}/zip`);
    const response = await page.request.get(`/api/albums/${ids.membersAlbum}/zip`);

    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toBe("application/zip");

    await page.getByRole("button", { name: "Talet" }).click();
    await expect(page.locator(".yarl__root").getByRole("button", { name: "Ladda ner originalet" })).toBeVisible();
  });

  test("a member reports an item without an email address or Turnstile", async ({ page, loginAs, mock }) => {
    await loginAs("viewer");
    await page.goto(`/items/${ids.publicItem}`);
    await page.getByRole("button", { name: "Anmäl" }).click();

    const dialog = page.getByRole("dialog");

    await dialog.getByLabel("Fel bildtext eller fel album").check();
    await expect(dialog.getByLabel("Din e-postadress")).toHaveCount(0);
    await dialog.getByRole("button", { name: "Skicka anmälan" }).click();
    await expect(page.getByText("Tack! Anmälan är skickad.")).toBeVisible();
    expect((await mock.state()).reports.at(-1)).toMatchObject({ reporter: "p-viewer", email: null });

    await page.goto("/reports");
    await expect(page.getByRole("link", { name: "Fel bildtext eller fel album" })).toBeVisible();
  });

  test("smart search and the map are for members", async ({ page, loginAs, mock }) => {
    await loginAs("viewer");
    await page.goto("/search");
    await page.getByLabel("Sökord").fill("scen med rök");
    await page.getByLabel("Sök på innehåll").check();
    await page.getByRole("button", { name: "Sök", exact: true }).click();

    await expect(page.getByRole("heading", { level: 1, name: "Sökresultat för ”scen med rök”" })).toBeVisible();
    await expect(page.getByTestId("gallery-item").first()).toBeVisible();
    expect((await mock.state()).smartSearches.at(-1)?.q).toBe("scen med rök");

    await page.goto("/map");
    await expect(page.getByText("2 bilder med plats")).toBeVisible();
    await expect(page.getByTestId("item-map")).toBeVisible();
  });

  test("someone logged in without access sees the public side and a notice", async ({ page, loginAs }) => {
    await loginAs("noaccess");

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByTestId("no-access-notice")).toContainText("nils@example.org");
    await expect(page.getByRole("link", { name: /Nobel 1975 – premiären/ })).toBeVisible();
    await expect(page.getByText("Sittning efter premiären")).toHaveCount(0);

    await page.goto(`/albums/${ids.membersAlbum}`);
    await expect(page.getByRole("heading", { level: 1, name: "Det här kan inte visas" })).toBeVisible();
    await page.goto(`/items/${ids.publicItemInMembersAlbum}`);
    await expect(page.getByRole("heading", { level: 1, name: "Gruppbild på trappan" })).toBeVisible();
  });
});
