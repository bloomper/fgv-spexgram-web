import { expect, test } from "./fixtures";

test.describe("The application shell", () => {
  test("shows viewing, editing and administration to an admin", async ({ page, loginAs }) => {
    await loginAs("admin");

    const sidebar = page.locator("[data-slot=\"sidebar\"]:visible");

    await expect(sidebar.getByRole("link", { name: "Start" })).toHaveAttribute("href", "/");
    await expect(sidebar.getByRole("link", { name: "Album" }).first()).toHaveAttribute("href", "/albums");
    await expect(sidebar.getByRole("link", { name: "Karta" })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "Redigera" })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "Administration" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: "Hej Sara Admin!" })).toBeVisible();
  });

  test("hides editing and administration from a member", async ({ page, loginAs }) => {
    await loginAs("viewer");

    const sidebar = page.locator("[data-slot=\"sidebar\"]:visible");

    await expect(sidebar.getByRole("link", { name: "Redigera" })).toHaveCount(0);
    await expect(sidebar.getByRole("link", { name: "Administration" })).toHaveCount(0);
    await page.goto("/manage/albums");
    await expect(page.getByRole("heading", { name: "Du har inte behörighet" })).toBeVisible();
    await page.goto("/admin/settings");
    await expect(page.getByRole("heading", { name: "Du har inte behörighet" })).toBeVisible();
  });

  test("a visitor logs in from an album and comes back to it", async ({ page, request }) => {
    await request.post("http://localhost:4101/__persona", { data: { persona: "viewer" } });
    await page.goto("/albums/00000000-0000-7000-8000-000000000020");
    await page.getByTestId("login-prompt").getByRole("link", { name: "Logga in" }).click();

    await expect(page.getByRole("heading", { level: 1, name: "Sittning efter premiären" })).toBeVisible();
  });
});
