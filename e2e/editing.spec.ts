import { answerDialog, expect, hydrated, ids, test } from "./fixtures";

const photo = (name: string) => ({ name, mimeType: "image/jpeg", buffer: Buffer.from("not really a jpeg") });

test.describe("Editing", () => {
  test("an editor creates an album for a spex", async ({ page, loginAs, mock }) => {
    await loginAs("editor");
    await page.goto("/manage/albums");
    await expect(page.getByRole("button", { name: "Nytt album" })).toHaveAttribute("href", "/manage/albums/new");
    await page.goto("/manage/albums/new");

    await page.getByLabel("Sök spex på titel eller år").fill("Statyer");
    await page.getByRole("button", { name: /Statyerna 1990/ }).click();
    await page.locator("#album-kind").selectOption({ label: "Fest" });
    await page.getByLabel("Datum").fill("1990-03-10");
    await page.getByLabel("Plats").fill("Chalmers kårhus");
    await page.getByRole("button", { name: "Skapa album" }).click();

    await expect(page.getByRole("heading", { level: 1, name: "Statyerna 1990 – fest" })).toBeVisible();
    await expect(page.getByText("Opublicerad").first()).toBeVisible();
    const created = (await mock.state()).albums.at(-1);

    expect(created).toMatchObject({ title: "Statyerna 1990 – fest", visibility: "UNPUBLISHED", dateFrom: "1990-03-10" });
  });

  test("an editor uploads many files and is told what became of each", async ({ page, loginAs, mock }) => {
    await loginAs("editor");
    await page.goto(`/manage/albums/${ids.rehearsals}`);
    await hydrated(page, "input[type=file]");
    await page.locator("input[type=file]").setInputFiles([photo("ny-bild.jpg"), photo("dubblett.jpg"), { name: "anteckning.txt", mimeType: "text/plain", buffer: Buffer.from("x") }]);

    const uploads = page.getByRole("region", { name: "Uppladdningar" }).or(page.locator("section[aria-labelledby=upload-list]"));
    const row = (name: string) => uploads.getByTestId("upload-row").filter({ hasText: name });

    await expect(row("ny-bild.jpg")).toContainText("Tillagd, bearbetas");
    await expect(row("dubblett.jpg")).toContainText("Finns redan, i Nobel 1975 – premiären.");
    await expect(row("dubblett.jpg").getByRole("link", { name: "Visa" })).toHaveAttribute("href", `/items/${ids.publicItem}`);
    await expect(row("anteckning.txt")).toContainText("Togs inte emot: Filtypen stöds inte");
    await expect(page.getByText("Spexflix").first()).toBeVisible();

    const state = await mock.state();

    expect(state.items.filter(item => item.albumId === ids.rehearsals && item.originalFileName === "ny-bild.jpg")).toHaveLength(1);
    expect(state.uploads).toBe(0);
    await expect(page.getByTestId("managed-item").filter({ hasText: "ny-bild.jpg" })).toContainText("Bearbetas");
    await mock.process();
    await page.reload();
    await expect(page.getByTestId("managed-item").filter({ hasText: "ny-bild.jpg" })).not.toContainText("Bearbetas");
  });

  test("a large album is edited a page at a time, and an item on another page opens from its link", async ({ page, loginAs, mock }) => {
    await loginAs("editor");
    await mock.fill(ids.membersAlbum, 201);
    const last = (await mock.state()).items.find(item => item.caption === "Fyllnad 201")!;

    await page.goto(`/manage/albums/${ids.membersAlbum}`);
    await expect(page.getByRole("heading", { name: "204 bilder och filmer" })).toBeVisible();
    await expect(page.getByTestId("managed-item")).toHaveCount(200);
    await expect(page.getByText("Sida 1 av 2")).toBeVisible();

    await page.getByRole("link", { name: "Nästa sida" }).click();
    await expect(page).toHaveURL(/\?page=1$/);
    await expect(page.getByTestId("managed-item")).toHaveCount(4);

    await page.goto(`/manage/albums/${ids.membersAlbum}?item=${last.id}`);
    await expect(page.getByText("Sida 1 av 2")).toBeVisible();
    await expect(page.getByRole("dialog").getByLabel("Bildtext")).toHaveValue("Fyllnad 201");

    // A page past the last goes to the last
    await page.goto(`/manage/albums/${ids.membersAlbum}?page=9`);
    await expect(page).toHaveURL(/\?page=1$/);
  });

  test("making an album public is confirmed with how many items visitors will see", async ({ page, loginAs, mock }) => {
    await loginAs("editor");
    await page.goto(`/manage/albums/${ids.membersAlbum}`);

    await expect(page.getByText("Bilderna har själva: 0 opublicerade, 2 för medlemmar, 1 publika.")).toBeVisible();
    await page.getByRole("radio", { name: /Publik/ }).check();
    await page.getByRole("button", { name: "Ändra synligheten" }).click();
    await expect(page.getByRole("dialog")).toContainText("med 1 bild eller film");
    await page.getByRole("dialog").getByRole("button", { name: "Avbryt" }).click();

    await page.getByRole("checkbox", { name: /Sätt också albumets 3 bilder och filmer/ }).check();
    await page.getByRole("button", { name: "Ändra synligheten" }).click();
    await expect(page.getByRole("dialog")).toContainText("med 3 bilder och filmer");
    await answerDialog(page, "Ändra synligheten");

    await expect(page.getByText("Synligheten är ändrad")).toBeVisible();
    const state = await mock.state();

    expect(state.albums.find(album => album.id === ids.membersAlbum)?.visibility).toBe("PUBLIC");
    expect(state.items.filter(item => item.albumId === ids.membersAlbum).every(item => item.visibility === "PUBLIC")).toBe(true);
  });

  test("an editor captions, makes public and trashes items in bulk", async ({ page, loginAs, mock }) => {
    await loginAs("editor");
    await page.goto(`/manage/albums/${ids.membersAlbum}`);
    await page.getByLabel("Markera Sittningen börjar").check();
    await page.getByLabel("Markera Talet").check();
    await page.getByRole("toolbar").getByRole("button", { name: "Bildtext" }).click();
    await page.getByRole("dialog").getByLabel("Bildtext").fill("Sittningen i kårhuset");
    await answerDialog(page, "Bekräfta");
    await expect.poll(async () => (await mock.state()).items.filter(item => item.caption === "Sittningen i kårhuset").length).toBe(2);
    await expect(page.getByLabel("Markera Sittningen i kårhuset").first()).not.toBeChecked();

    await page.getByLabel("Markera Gruppbild på trappan").check();
    await page.getByRole("toolbar").getByRole("button", { name: "Synlighet" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Medlemmar" }).click();
    await expect.poll(async () => (await mock.state()).items.find(item => item.id === ids.publicItemInMembersAlbum)?.visibility).toBe("MEMBERS");
    await expect(page.getByLabel("Markera Gruppbild på trappan")).not.toBeChecked();

    await page.getByLabel("Markera Gruppbild på trappan").check();
    await page.getByRole("toolbar").getByRole("button", { name: "Papperskorgen" }).click();
    await answerDialog(page, "Papperskorgen");
    await expect(page.getByText("Lagda i papperskorgen")).toBeVisible();
    expect((await mock.state()).items.find(item => item.id === ids.publicItemInMembersAlbum)?.trashedAt).not.toBeNull();

    await page.goto("/manage/trash");
    await page.getByRole("button", { name: "Återställ" }).first().click();
    await expect(page.getByText("Återställd")).toBeVisible();
  });

  test("an editor sorts unsorted items into a new album", async ({ page, loginAs, mock }) => {
    await loginAs("editor");
    await page.goto("/manage/unsorted");
    await page.getByRole("checkbox", { name: "30 oktober 2026 (2)" }).check();
    await page.getByRole("button", { name: "Nytt album" }).click();
    await page.getByRole("dialog").getByLabel("Albumets titel").fill("Gamla scanningar");
    await answerDialog(page, "Bekräfta");

    await expect(page.getByRole("heading", { level: 1, name: "Gamla scanningar" })).toBeVisible();
    const album = (await mock.state()).albums.find(candidate => candidate.title === "Gamla scanningar");

    expect((await mock.state()).items.filter(item => item.albumId === album?.id)).toHaveLength(2);
  });

  test("the change log lists the editor's changes", async ({ page, loginAs }) => {
    await loginAs("editor");
    await page.goto(`/manage/albums/${ids.membersAlbum}`);
    await page.getByLabel("Plats").fill("Kårhuset");
    await page.getByRole("button", { name: "Spara" }).click();
    await expect(page.getByText("Albumet är sparat")).toBeVisible();

    await page.goto("/manage/audit");
    await expect(page.getByRole("link", { name: "Ändrade albumet Sittning efter premiären", exact: true })).toBeVisible();
  });

  test("an item an open report hides keeps its visibility through a bulk change, and the editor is told", async ({ page, loginAs, mock }) => {
    await loginAs("viewer");
    await page.goto(`/items/${ids.publicItemInMembersAlbum}`);
    await page.getByRole("button", { name: "Anmäl" }).click();
    await page.getByRole("dialog").getByLabel("Jag är med på den och vill att den tas bort").check();
    await page.getByRole("dialog").getByRole("button", { name: "Skicka anmälan" }).click();
    await expect(page.getByText(/Anmälan är skickad/)).toBeVisible();

    await loginAs("editor");
    await page.goto(`/manage/albums/${ids.membersAlbum}`);
    await page.getByRole("radio", { name: /Publik/ }).check();
    await page.getByRole("checkbox", { name: /Sätt också albumets/ }).check();
    await page.getByRole("button", { name: "Ändra synligheten" }).click();
    await answerDialog(page, "Ändra synligheten");

    await expect(page.getByText("1 bild eller film behöll sin synlighet, eftersom en öppen anmälan döljer dem.")).toBeVisible();
    expect((await mock.state()).items.find(item => item.id === ids.publicItemInMembersAlbum)?.visibility).toBe("UNPUBLISHED");
  });
});
