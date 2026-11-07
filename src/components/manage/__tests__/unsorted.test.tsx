import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UnsortedSorter } from "@/components/manage/unsorted.client";
import { dialogs as makeDialogs, item } from "./fixtures";

const mocks = vi.hoisted(() => ({
  router: { refresh: vi.fn(), push: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn() },
  actions: { albumFromItemsAction: vi.fn(), albumTitlesAction: vi.fn(), updateItemsAction: vi.fn() },
  dialogs: undefined as unknown as ReturnType<typeof makeDialogs>,
}));

vi.mock("next/navigation", () => ({ useRouter: () => mocks.router }));
vi.mock("sonner", () => ({ toast: mocks.toast }));
vi.mock("@/utils/umami", () => ({ track: vi.fn() }));
vi.mock("@/app/(app)/manage/actions.server", () => mocks.actions);
vi.mock("@/components/dialogs.client", () => ({ useDialogs: () => mocks.dialogs }));

const days = [
  { date: "2026-10-01", items: [item("u1", { album: null }), item("u2", { album: null })] },
  { date: null, items: [item("u3", { album: null, takenAt: null })] },
];

describe("UnsortedSorter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.dialogs = makeDialogs();
    mocks.actions.albumTitlesAction.mockResolvedValue({ ok: true, data: [{ id: "a1", title: "Nobel 1975", dateFrom: "1975-02-14" }] });
    mocks.actions.updateItemsAction.mockResolvedValue({ ok: true, data: 0 });
    mocks.actions.albumFromItemsAction.mockResolvedValue({ ok: true, data: "a9" });
  });

  it("says when everything is sorted", () => {
    render(<UnsortedSorter days={[]} />);
    expect(screen.getByText("none")).toBeInTheDocument();
  });

  it("selects a day and moves it to an album", async () => {
    render(<UnsortedSorter days={days} />);
    expect(screen.getByText("noDate")).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole("checkbox")[0]);
    expect(screen.getByText(`selected:${JSON.stringify({ count: 2 })}`)).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole("checkbox")[0]);
    expect(screen.getByText(`selected:${JSON.stringify({ count: 0 })}`)).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole("checkbox")[0]);

    mocks.dialogs.choose.mockResolvedValueOnce("a1");
    await userEvent.click(screen.getByRole("button", { name: "move" }));
    await waitFor(() => expect(mocks.actions.updateItemsAction).toHaveBeenCalledWith(["u1", "u2"], { albumId: "a1" }));
    await waitFor(() => expect(mocks.router.refresh).toHaveBeenCalled());
  });

  it("makes a new album, also from the album list", async () => {
    render(<UnsortedSorter days={days} />);
    await userEvent.click(screen.getAllByRole("checkbox")[4]);
    await userEvent.click(screen.getByRole("button", { name: "newAlbum" }));
    await waitFor(() => expect(mocks.actions.albumFromItemsAction).toHaveBeenCalledWith("Svar", null, ["u3"]));
    await waitFor(() => expect(mocks.router.push).toHaveBeenCalledWith("/manage/albums/a9"));

    await userEvent.click(screen.getAllByRole("checkbox")[0]);
    mocks.dialogs.choose.mockResolvedValueOnce("");
    mocks.actions.albumFromItemsAction.mockResolvedValueOnce({ ok: false, message: "Fel" });
    await userEvent.click(screen.getByRole("button", { name: "move" }));
    await waitFor(() => expect(mocks.actions.albumFromItemsAction).toHaveBeenLastCalledWith("Svar", "2026-10-01", ["u1", "u2"]));
    await waitFor(() => expect(mocks.toast.error).toHaveBeenCalledWith("Fel"));
  });

  it("tells when the albums cannot be listed, and does nothing when cancelled", async () => {
    render(<UnsortedSorter days={days} />);
    await userEvent.click(screen.getAllByRole("checkbox")[0]);
    mocks.actions.albumTitlesAction.mockResolvedValueOnce({ ok: false, message: "Borta" });
    await userEvent.click(screen.getByRole("button", { name: "move" }));
    await waitFor(() => expect(mocks.toast.error).toHaveBeenCalledWith("Borta"));

    await userEvent.click(screen.getByRole("button", { name: "move" }));
    mocks.dialogs.prompt.mockResolvedValueOnce(null);
    await userEvent.click(screen.getByRole("button", { name: "newAlbum" }));
    expect(mocks.actions.updateItemsAction).not.toHaveBeenCalled();
    expect(mocks.actions.albumFromItemsAction).not.toHaveBeenCalled();
  });
});
