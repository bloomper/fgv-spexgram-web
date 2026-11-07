import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AlbumForm } from "@/components/manage/album-form.client";
import { VisibilityControl } from "@/components/manage/visibility-control.client";
import { dialogs as makeDialogs } from "./fixtures";

const mocks = vi.hoisted(() => ({
  router: { refresh: vi.fn(), push: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
  actions: { createAlbumAction: vi.fn(), updateAlbumAction: vi.fn(), setAlbumVisibilityAction: vi.fn(), searchSpexAction: vi.fn() },
  dialogs: undefined as unknown as ReturnType<typeof makeDialogs>,
}));

vi.mock("next/navigation", () => ({ useRouter: () => mocks.router }));
vi.mock("sonner", () => ({ toast: mocks.toast }));
vi.mock("@/utils/umami", () => ({ track: vi.fn() }));
vi.mock("@/app/(app)/manage/actions.server", () => mocks.actions);
vi.mock("@/components/dialogs.client", () => ({ useDialogs: () => mocks.dialogs }));

const kinds = [{ id: "k1", nameSv: "Föreställning", nameEn: "Show", isDefault: false }, { id: "k2", nameSv: "Fest", nameEn: "Party", isDefault: true }];
const spex = { id: "s1", title: "Nobel", year: 1975, revival: false, parentId: null, categoryName: "Chalmersspexet" };

describe("AlbumForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.actions.createAlbumAction.mockResolvedValue({ ok: true, data: "a9" });
    mocks.actions.updateAlbumAction.mockResolvedValue({ ok: true, data: null });
  });

  it("needs a spex or none marked, a title without spex and dates in order", async () => {
    render(<AlbumForm kinds={kinds} />);
    expect(screen.getByLabelText("kind")).toHaveValue("k2");
    await userEvent.click(screen.getByRole("button", { name: "create" }));
    expect(mocks.toast.error).toHaveBeenCalledWith("spexOrNone");

    await userEvent.click(screen.getByRole("checkbox"));
    await userEvent.click(screen.getByRole("button", { name: "create" }));
    expect(mocks.actions.createAlbumAction).not.toHaveBeenCalled();
  });

  it("saves an album's changes and refuses dates out of order", async () => {
    const album = { id: "a1", title: "Sittning", kindId: "k1", spex: [], dateFrom: "2026-10-02", dateTo: "2026-10-01", place: null, description: null };

    render(<AlbumForm album={album} kinds={kinds} />);
    await userEvent.click(screen.getByRole("button", { name: "save" }));
    expect(mocks.toast.error).toHaveBeenCalledWith("dateOrder");

    await userEvent.clear(screen.getByLabelText("dateTo"));
    await userEvent.type(screen.getByLabelText("place"), "Kårhuset");
    await userEvent.click(screen.getByRole("button", { name: "save" }));
    await waitFor(() => expect(mocks.actions.updateAlbumAction).toHaveBeenCalledWith("a1", {
      spexIds: [], title: "Sittning", kindId: "k1", dateFrom: "2026-10-02", dateTo: null, place: "Kårhuset", description: null,
    }));
    await waitFor(() => expect(mocks.router.refresh).toHaveBeenCalled());

    mocks.actions.updateAlbumAction.mockResolvedValueOnce({ ok: false, message: "Fel" });
    await userEvent.click(screen.getByRole("button", { name: "save" }));
    await waitFor(() => expect(mocks.toast.error).toHaveBeenCalledWith("Fel"));
  });

  it("creates an album for a spex and opens it", async () => {
    const album = { title: "", kindId: null, spex: [spex], dateFrom: null, dateTo: null, place: null, description: null };

    render(<AlbumForm album={album} kinds={kinds} />);
    await userEvent.click(screen.getByRole("button", { name: "create" }));
    await waitFor(() => expect(mocks.actions.createAlbumAction).toHaveBeenCalledWith(expect.objectContaining({ spexIds: ["s1"], title: null })));
    await waitFor(() => expect(mocks.router.push).toHaveBeenCalledWith("/manage/albums/a9"));

    mocks.actions.createAlbumAction.mockResolvedValueOnce({ ok: false, message: "Fel" });
    await userEvent.click(screen.getByRole("button", { name: "create" }));
    await waitFor(() => expect(mocks.toast.error).toHaveBeenCalledWith("Fel"));
  });
});

describe("VisibilityControl", () => {
  const counts = [{ visibility: "UNPUBLISHED" as const, count: 1 }, { visibility: "MEMBERS" as const, count: 2 }, { visibility: "PUBLIC" as const, count: 3 }];

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.dialogs = makeDialogs();
    mocks.actions.setAlbumVisibilityAction.mockResolvedValue({ ok: true, data: 0 });
  });

  it("changes the album's visibility, and its items' too, once confirmed", async () => {
    render(<VisibilityControl albumId="a1" visibility="MEMBERS" counts={counts} />);
    expect(screen.getByRole("button", { name: "apply" })).toBeDisabled();

    await userEvent.click(screen.getByRole("radio", { name: /^PUBLIC/ }));
    mocks.dialogs.confirm.mockResolvedValueOnce(false);
    await userEvent.click(screen.getByRole("button", { name: "apply" }));
    expect(mocks.actions.setAlbumVisibilityAction).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("checkbox"));
    mocks.actions.setAlbumVisibilityAction.mockResolvedValueOnce({ ok: true, data: 2 });
    await userEvent.click(screen.getByRole("button", { name: "apply" }));
    await waitFor(() => expect(mocks.actions.setAlbumVisibilityAction).toHaveBeenCalledWith("a1", "PUBLIC", true));
    await waitFor(() => expect(mocks.toast.warning).toHaveBeenCalled());
    expect(mocks.dialogs.confirm.mock.calls[1][0].destructive).toBe(true);

    await userEvent.click(screen.getByRole("radio", { name: /^UNPUBLISHED/ }));
    mocks.actions.setAlbumVisibilityAction.mockResolvedValueOnce({ ok: false, message: "Fel" });
    await userEvent.click(screen.getByRole("button", { name: "apply" }));
    await waitFor(() => expect(mocks.toast.error).toHaveBeenCalledWith("Fel"));

    await userEvent.click(screen.getByRole("radio", { name: /^MEMBERS/ }));
    await userEvent.click(screen.getByRole("checkbox"));
    await userEvent.click(screen.getByRole("button", { name: "apply" }));
    expect(mocks.dialogs.confirm.mock.calls.at(-1)?.[0].description).toContain("confirmMembers");
  });
});
