import { acceptCookies, expect, ids, mockTurnstile, test } from "./fixtures";
import { uuidOf } from "./constants";

test.describe("The public side, for visitors who are not logged in", () => {
  test("the start page shows public albums only, with Logga in", async ({ page }) => {
    await page.goto("/");
    await acceptCookies(page);

    await expect(page.getByRole("heading", { level: 1, name: "Välkommen till Spexgram" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Logga in" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Nobel 1975 – premiären/ })).toBeVisible();
    await expect(page.getByText("Sittning efter premiären")).toHaveCount(0);
    await expect(page.getByText("Opublicerat album")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "spexgram@example.org" })).toBeVisible();

    // The sidebar leaves out the members' pages
    const sidebar = page.locator("[data-slot=\"sidebar\"]:visible");
    await expect(sidebar.getByRole("link", { name: "Album" }).first()).toBeVisible();
    for (const name of ["Karta", "Mina bidrag", "Föreslå album", "Mina anmälningar"]) {
      await expect(sidebar.getByRole("link", { name }), name).toHaveCount(0);
    }
  });

  test("a public album shows its public items, indexable and with Open Graph tags", async ({ page }) => {
    await page.goto(`/albums/${ids.publicAlbum}`);
    await acceptCookies(page);

    await expect(page.getByRole("heading", { level: 1, name: "Nobel 1975 – premiären" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Finalen med hela ensemblen" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Ouvertyren" })).toBeVisible();
    // A members' item in a public album is for members
    await expect(page.getByRole("button", { name: "Bakom scenen" })).toHaveCount(0);
    await expect(page.locator("meta[property='og:title']")).toHaveAttribute("content", "Nobel 1975 – premiären");
    await expect(page.locator("meta[property='og:image']")).toHaveAttribute("content", /\/a\/.+\/preview\//);
    await expect(page.locator("meta[name='robots']")).toHaveAttribute("content", /^index/);
    // Visitors do not contribute or download whole albums
    await expect(page.getByRole("button", { name: "Lägg till dina bilder" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Ladda ner albumet" })).toHaveCount(0);
  });

  test("a members' album, an unpublished one and one that does not exist all ask to log in, alike", async ({ page }) => {
    for (const id of [ids.membersAlbum, ids.unpublishedAlbum, uuidOf(999)]) {
      await page.goto(`/albums/${id}`);
      await expect(page.getByRole("main").getByTestId("login-prompt")).toBeVisible();
      await expect(page.getByRole("heading", { level: 1, name: "Logga in för att se det här" })).toBeVisible();
      await expect(page.locator("meta[name='robots']")).toHaveAttribute("content", /noindex/);
      await expect(page.locator("meta[property='og:title']")).toHaveCount(0);
      await expect(page.getByRole("main").getByTestId("login-prompt").getByRole("link", { name: "Logga in" }))
        .toHaveAttribute("href", `/api/auth/login?returnTo=${encodeURIComponent(`/albums/${id}`)}`);
    }
    await expect(page.getByText("Sittning efter premiären")).toHaveCount(0);
  });

  test("a public item in a members' album opens by its address, without the album", async ({ page }) => {
    await page.goto(`/items/${ids.publicItemInMembersAlbum}`);
    await acceptCookies(page);

    await expect(page.getByRole("heading", { level: 1, name: "Gruppbild på trappan" })).toBeVisible();
    await expect(page.getByRole("img", { name: "Gruppbild på trappan" })).toHaveAttribute("src", /\/preview\//);
    await expect(page.getByTestId("item-album-link")).toHaveCount(0);
    await expect(page.getByText("Sittning efter premiären")).toHaveCount(0);
    await expect(page.locator("meta[property='og:image']")).toHaveAttribute("content", /\/preview\//);

    await page.goto(`/items/${uuidOf(201)}`);
    await expect(page.getByRole("main").getByTestId("login-prompt")).toBeVisible();
  });

  test("members' pages, typed in, ask visitors to log in", async ({ page }) => {
    for (const path of ["/map", "/contributions", "/suggestions", "/reports", "/manage/albums", "/admin/settings"]) {
      await page.goto(path);
      await expect(page.getByRole("main").getByTestId("login-prompt"), path).toBeVisible();
      await expect(page.getByRole("heading", { level: 1, name: "Bara för medlemmar" }), path).toBeVisible();
    }
  });

  test("a visitor reports a public item with an email address and Turnstile", async ({ page, mock }) => {
    await mockTurnstile(page);
    await page.goto(`/items/${ids.publicItem}`);
    await acceptCookies(page);
    await page.getByRole("button", { name: "Anmäl" }).click();

    const dialog = page.getByRole("dialog");
    const send = dialog.getByRole("button", { name: "Skicka anmälan" });

    await dialog.getByLabel("Jag är med på den och vill att den tas bort").check();
    await expect(dialog.getByText("Den döljs direkt")).toBeVisible();
    await dialog.getByLabel("Meddelande (valfritt)").fill("Jag vill inte synas.");
    await expect(send).toBeDisabled();
    await dialog.getByLabel("Din e-postadress").fill("besok@example.org");
    await expect(dialog.getByTestId("turnstile")).toHaveText("Turnstile (mock)");
    await expect(send).toBeEnabled();
    await send.click();

    await expect(page.getByText("Tack! Anmälan är skickad och bilden är dold")).toBeVisible();
    const report = (await mock.state()).reports.at(-1);

    expect(report).toMatchObject({ itemId: ids.publicItem, reason: "I_AM_IN_IT", email: "besok@example.org", reporter: null });
  });

  test("search finds public items for visitors", async ({ page }) => {
    await page.goto("/search?q=gruppbild");
    await acceptCookies(page);
    await expect(page.getByRole("button", { name: "Gruppbild på trappan" })).toBeVisible();
    await expect(page.getByLabel("Sök på innehåll")).toHaveCount(0);
  });

  test("the spex page lists its public albums", async ({ page }) => {
    await page.goto(`/spex/${ids.spex}`);
    await expect(page.getByRole("heading", { level: 1, name: "Nobel 1975" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Nobel 1975 – premiären/ })).toBeVisible();
    await expect(page.getByText("Sittning efter premiären")).toHaveCount(0);
  });
});
