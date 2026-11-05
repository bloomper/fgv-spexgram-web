import { answerDialog, expect, hydrated, ids, test } from "./fixtures";

const photo = (name: string) => ({ name, mimeType: "image/jpeg", buffer: Buffer.from("not really a jpeg") });

test.describe("Contributions", () => {
  test("a member adds photos to an album, sees them waiting and withdraws one", async ({ page, loginAs, mock }) => {
    await loginAs("viewer");
    await page.goto(`/albums/${ids.membersAlbum}`);
    await page.getByRole("button", { name: "Lägg till dina bilder" }).click();

    await expect(page.getByRole("heading", { level: 1, name: "Lägg till dina bilder i Sittning efter premiären" })).toBeVisible();
    await hydrated(page, "input[type=file]");
    await page.locator("input[type=file]").setInputFiles([photo("min-bild-1.jpg"), photo("min-bild-2.jpg")]);
    await expect(page.getByTestId("upload-row").filter({ hasText: "Tillagd, väntar på granskning" })).toHaveCount(2);

    const mine = (await mock.state()).items.filter(item => item.owner === "p-viewer" && item.albumId === ids.membersAlbum);

    expect(mine.map(item => [item.visibility, item.contributionStatus])).toEqual([["UNPUBLISHED", "WAITING"], ["UNPUBLISHED", "WAITING"]]);

    await page.getByRole("link", { name: "Mina bidrag" }).first().click();
    const row = page.getByTestId("contribution").filter({ hasText: "min-bild-1.jpg" });

    await expect(row).toContainText("Väntar på granskning");
    await row.getByRole("button", { name: /Ta tillbaka/ }).click();
    await answerDialog(page, "Ta tillbaka");
    await expect(page.getByText("Bidraget är taget tillbaka")).toBeVisible();
    await expect(page.getByTestId("contribution").filter({ hasText: "min-bild-1.jpg" })).toHaveCount(0);
  });

  test("an editor accepts a contribution, which then shows to members", async ({ page, loginAs, mock }) => {
    await loginAs("editor");
    await page.goto("/manage/contributions");

    const row = page.getByTestId("review-item").filter({ hasText: "mitt-foto.jpg" });

    await expect(row).toContainText("Tina Tittare");
    await row.getByRole("button", { name: "Godkänn", exact: true }).click();
    await expect(page.getByText("Bidraget är godkänt")).toBeVisible();
    expect((await mock.state()).items.find(item => item.originalFileName === "mitt-foto.jpg"))
      .toMatchObject({ contributionStatus: "ACCEPTED", visibility: "MEMBERS" });
  });

  test("a member suggests an album and can contribute to it at once", async ({ page, loginAs, mock }) => {
    await loginAs("viewer");
    await page.goto("/suggestions");
    await page.getByLabel("Titel").fill("Kräftskivan 1975");
    await page.getByLabel("Datum", { exact: true }).fill("1975-08-20");
    await page.getByRole("button", { name: "Föreslå" }).click();

    await expect(page.getByRole("heading", { level: 1, name: "Lägg till dina bilder i Kräftskivan 1975" })).toBeVisible();
    expect((await mock.state()).suggestions.at(-1)).toMatchObject({ title: "Kräftskivan 1975", status: "OPEN" });
  });

  test("an editor handles a visitor's report", async ({ page, loginAs, mock }) => {
    await loginAs("editor");
    await page.goto("/manage/reports");

    const report = page.getByTestId("report").first();

    await expect(report).toContainText("Besökare besokare@example.org");
    await report.getByRole("button", { name: "Behåll" }).click();
    await answerDialog(page, "Hantera");
    await expect(page.getByText("Anmälan är hanterad")).toBeVisible();
    expect((await mock.state()).reports[0].status).toBe("HANDLED");
  });
});
