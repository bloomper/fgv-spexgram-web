import { expect, test } from "./fixtures";

test.describe("Administration", () => {
  test.beforeEach(async ({ loginAs }) => {
    await loginAs("admin");
  });

  test("changes the settings, and the visitors' text is shown on the public start page", async ({ page }) => {
    await page.goto("/admin/settings");
    await page.getByLabel("Text för besökare, på svenska").fill("Välkommen, besökare!");
    await page.getByLabel("Största fil (GB)").fill("8");
    await page.getByRole("button", { name: "Spara" }).click();
    await expect(page.getByText("Inställningarna är sparade")).toBeVisible();

    await page.context().clearCookies();
    await page.goto("/");
    await expect(page.getByText("Välkommen, besökare!")).toBeVisible();
  });

  test("shows Immich's status and the items that failed", async ({ page }) => {
    await page.goto("/admin/immich");
    await expect(page.getByText("v3.3.6")).toBeVisible();
    await expect(page.getByRole("cell", { name: "Miniatyrer" })).toBeVisible();
    await expect(page.getByText("hela-forestallningen.mp4")).toBeVisible();
    await page.getByRole("button", { name: "Kör för 1 bild" }).click();
    await expect(page.getByText("Jobbet har startat i Immich")).toBeVisible();
  });

  test("lists the maintenance jobs and runs one", async ({ page }) => {
    await page.goto("/admin/maintenance");

    const job = page.getByRole("listitem").filter({ hasText: "Sökning efter osorterat" });

    await job.getByRole("button", { name: "Kör nu" }).click();
    await expect(job.getByText(/^Lyckades/)).toBeVisible();
  });

  test("adds an album kind", async ({ page }) => {
    await page.goto("/admin/kinds");
    await page.getByLabel("Namn på svenska").last().fill("Turné");
    await page.getByLabel("Namn på engelska").last().fill("Tour");
    await page.getByRole("button", { name: "Lägg till sort" }).click();
    await expect(page.getByText("Sorten är tillagd")).toBeVisible();
    await expect(page.getByText("Turné")).toBeVisible();
  });
});
