import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReportHandling } from "@/components/manage/report-handling.client";
import { TrashAlbum } from "@/components/manage/trash-album.client";
import { SuggestForm } from "@/components/gram/suggest-form.client";
import { WithdrawButton } from "@/components/gram/withdraw-button.client";
import { dialogs as makeDialogs } from "./fixtures";

const mocks = vi.hoisted(() => ({
  router: { refresh: vi.fn(), push: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn() },
  manage: { handleReportAction: vi.fn(), trashAlbumAction: vi.fn() },
  app: { suggestAlbumAction: vi.fn(), withdrawContributionAction: vi.fn() },
  dialogs: undefined as unknown as ReturnType<typeof makeDialogs>,
}));

vi.mock("next/navigation", () => ({ useRouter: () => mocks.router }));
vi.mock("sonner", () => ({ toast: mocks.toast }));
vi.mock("@/utils/umami", () => ({ track: vi.fn() }));
vi.mock("@/app/(app)/manage/actions.server", () => mocks.manage);
vi.mock("@/app/(app)/actions.server", () => mocks.app);
vi.mock("@/components/dialogs.client", () => ({ useDialogs: () => mocks.dialogs }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.dialogs = makeDialogs();
  [...Object.values(mocks.manage), ...Object.values(mocks.app)].forEach(action => action.mockResolvedValue({ ok: true, data: null }));
});

describe("ReportHandling", () => {
  const reports = [
    { id: "r1", reason: "I_AM_IN_IT" as const, message: "Det är jag", status: "OPEN" as const, reporter: "besok@example.org", byVisitor: true,
      createdAt: "2026-11-01T10:00:00Z",
      item: { id: "i1", caption: "Finalen", type: "PHOTO" as const, visibility: "PUBLIC" as const, effectiveVisibility: "MEMBERS" as const,
        media: { thumbnailUrl: "t" }, album: { id: "a1", title: "Nobel 1975" } } },
    { id: "r2", reason: "OTHER" as const, status: "HANDLED" as const, reporter: "Tina", byVisitor: false, outcome: null,
      outcomeMessage: "Inget att göra", createdAt: "2026-11-01T10:00:00Z", handledAt: "2026-11-02T10:00:00Z", item: null },
  ];

  it("says when there are no reports", () => {
    render(<ReportHandling reports={[]} />);
    expect(screen.getByText("none")).toBeInTheDocument();
  });

  it("handles an open report with a message to the reporter", async () => {
    render(<ReportHandling reports={reports} />);
    expect(screen.getByText("Det är jag")).toBeInTheDocument();
    expect(screen.getByText("outcome.KEPT")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "action.REMOVED" }));
    await waitFor(() => expect(mocks.manage.handleReportAction).toHaveBeenCalledWith("r1", "REMOVED", "Svar"));
    await waitFor(() => expect(mocks.router.refresh).toHaveBeenCalled());

    mocks.manage.handleReportAction.mockResolvedValueOnce({ ok: false, message: "Fel" });
    await userEvent.click(screen.getByRole("button", { name: "action.KEPT" }));
    await waitFor(() => expect(mocks.toast.error).toHaveBeenCalledWith("Fel"));

    mocks.dialogs.prompt.mockResolvedValueOnce(null);
    await userEvent.click(screen.getByRole("button", { name: "action.CORRECTED" }));
    expect(mocks.manage.handleReportAction).toHaveBeenCalledTimes(2);
  });
});

describe("TrashAlbum", () => {
  it("trashes once confirmed and restores without asking", async () => {
    const { rerender } = render(<TrashAlbum albumId="a1" trashed={false} />);

    mocks.dialogs.confirm.mockResolvedValueOnce(false);
    await userEvent.click(screen.getByRole("button", { name: "trash" }));
    expect(mocks.manage.trashAlbumAction).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "trash" }));
    await waitFor(() => expect(mocks.router.push).toHaveBeenCalledWith("/manage/albums"));

    rerender(<TrashAlbum albumId="a1" trashed />);
    mocks.manage.trashAlbumAction.mockResolvedValueOnce({ ok: false, message: "Fel" });
    await userEvent.click(screen.getByRole("button", { name: "restore" }));
    await waitFor(() => expect(mocks.toast.error).toHaveBeenCalledWith("Fel"));
    await userEvent.click(screen.getByRole("button", { name: "restore" }));
    await waitFor(() => expect(mocks.router.push).toHaveBeenCalledWith("/manage/albums/a1"));
  });
});

describe("SuggestForm", () => {
  it("suggests an album and goes on to contribute to it", async () => {
    render(<SuggestForm kinds={[{ id: "k1", nameSv: "Fest", nameEn: "Party" }]} />);
    expect(screen.getByRole("button", { name: "send" })).toBeDisabled();
    await userEvent.type(screen.getByLabelText("titleLabel"), "Sittning");
    await userEvent.selectOptions(screen.getByLabelText("kind"), "k1");
    mocks.app.suggestAlbumAction.mockResolvedValueOnce({ ok: true, data: "a9" });
    await userEvent.click(screen.getByRole("button", { name: "send" }));
    await waitFor(() => expect(mocks.app.suggestAlbumAction).toHaveBeenCalledWith({
      title: "Sittning", dateFrom: null, dateTo: null, place: null, description: null, kindId: "k1",
    }));
    await waitFor(() => expect(mocks.router.push).toHaveBeenCalledWith("/albums/a9/contribute"));

    await userEvent.type(screen.getByLabelText("titleLabel"), "Igen");
    mocks.app.suggestAlbumAction.mockResolvedValueOnce({ ok: false, message: "Fel" });
    await userEvent.click(screen.getByRole("button", { name: "send" }));
    await waitFor(() => expect(mocks.toast.error).toHaveBeenCalledWith("Fel"));
  });
});

describe("WithdrawButton", () => {
  it("withdraws a contribution once confirmed", async () => {
    render(<WithdrawButton itemId="i1" name="a.jpg" />);
    const button = screen.getByRole("button", { name: `withdrawOf:${JSON.stringify({ name: "a.jpg" })}` });

    mocks.dialogs.confirm.mockResolvedValueOnce(false);
    await userEvent.click(button);
    expect(mocks.app.withdrawContributionAction).not.toHaveBeenCalled();
    await userEvent.click(button);
    await waitFor(() => expect(mocks.toast.success).toHaveBeenCalledWith("withdrawn"));
    mocks.app.withdrawContributionAction.mockResolvedValueOnce({ ok: false, message: "Fel" });
    await userEvent.click(button);
    await waitFor(() => expect(mocks.toast.error).toHaveBeenCalledWith("Fel"));
  });
});
