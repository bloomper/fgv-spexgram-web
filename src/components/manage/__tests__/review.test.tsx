import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ContributionReview, SuggestionReview } from "@/components/manage/review.client";
import { dialogs as makeDialogs, item } from "./fixtures";

const mocks = vi.hoisted(() => ({
  router: { refresh: vi.fn(), push: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn() },
  actions: { reviewContributionsAction: vi.fn(), reviewSuggestionAction: vi.fn(), updateItemsAction: vi.fn() },
  dialogs: undefined as unknown as ReturnType<typeof makeDialogs>,
}));

vi.mock("next/navigation", () => ({ useRouter: () => mocks.router }));
vi.mock("sonner", () => ({ toast: mocks.toast }));
vi.mock("@/utils/umami", () => ({ track: vi.fn() }));
vi.mock("@/app/(app)/manage/actions.server", () => mocks.actions);
vi.mock("@/components/dialogs.client", () => ({ useDialogs: () => mocks.dialogs }));

const contributions = [
  item("c1", { originalFileName: "a.jpg", uploadedBy: "Tina", photographer: "Tina", createdAt: "2026-11-01T10:00:00Z" }),
  item("c2", { originalFileName: "b.jpg" }),
  item("c3", { album: null }),
];

describe("ContributionReview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.dialogs = makeDialogs();
    Object.values(mocks.actions).forEach(action => action.mockResolvedValue({ ok: true, data: null }));
  });

  it("says when nothing waits", () => {
    render(<ContributionReview items={[]} />);
    expect(screen.getByText("none")).toBeInTheDocument();
  });

  it("accepts an album's contributions, one, or one to edit at once", async () => {
    render(<ContributionReview items={contributions} />);
    expect(screen.getByRole("link", { name: "Nobel 1975" })).toHaveAttribute("href", "/manage/albums/a1");
    expect(screen.getByText("noAlbum")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: `acceptAll:${JSON.stringify({ count: 2 })}` }));
    await waitFor(() => expect(mocks.actions.reviewContributionsAction).toHaveBeenCalledWith(["c1", "c2"], true, null));
    await waitFor(() => expect(mocks.router.refresh).toHaveBeenCalled());

    await userEvent.click(screen.getAllByRole("button", { name: "acceptEdit" })[0]);
    await waitFor(() => expect(mocks.router.push).toHaveBeenCalledWith("/manage/albums/a1?item=c1"));

    mocks.actions.reviewContributionsAction.mockResolvedValueOnce({ ok: false, message: "Fel" });
    await userEvent.click(screen.getAllByRole("button", { name: "accept" })[2]);
    await waitFor(() => expect(mocks.toast.error).toHaveBeenCalledWith("Fel"));
  });

  it("rejects with a message once confirmed", async () => {
    render(<ContributionReview items={contributions} />);
    mocks.dialogs.confirm.mockResolvedValueOnce(false);
    await userEvent.click(screen.getAllByRole("button", { name: "reject" })[0]);
    expect(mocks.actions.reviewContributionsAction).not.toHaveBeenCalled();

    await userEvent.click(screen.getAllByRole("button", { name: "reject" })[0]);
    await waitFor(() => expect(mocks.actions.reviewContributionsAction).toHaveBeenCalledWith(["c1"], false, "Svar"));
  });

  it("corrects the photographer before accepting", async () => {
    render(<ContributionReview items={contributions} />);
    await userEvent.click(screen.getByRole("button", { name: `editPhotographerOf:${JSON.stringify({ name: "a.jpg" })}` }));
    await waitFor(() => expect(mocks.actions.updateItemsAction).toHaveBeenCalledWith(["c1"], { photographer: "Svar" }));
    expect(mocks.dialogs.prompt).toHaveBeenCalledWith(expect.objectContaining({ defaultValue: "Tina" }));

    mocks.actions.updateItemsAction.mockResolvedValueOnce({ ok: false, message: "Nej" });
    await userEvent.click(screen.getByRole("button", { name: `editPhotographerOf:${JSON.stringify({ name: "b.jpg" })}` }));
    await waitFor(() => expect(mocks.toast.error).toHaveBeenCalledWith("Nej"));

    mocks.dialogs.prompt.mockResolvedValueOnce(null);
    await userEvent.click(screen.getByRole("button", { name: `editPhotographerOf:${JSON.stringify({ name: "b.jpg" })}` }));
    expect(mocks.actions.updateItemsAction).toHaveBeenCalledTimes(2);
  });
});

describe("SuggestionReview", () => {
  const suggestions = [
    { id: "s1", title: "Sittning", suggestedBy: "Tina", createdAt: "2026-11-01T10:00:00Z",
      album: { id: "a9", title: "Sittning", dateFrom: "2026-10-01", place: "Kårhuset", description: "Efter premiären" } },
    { id: "s2", title: "Utan album", createdAt: "2026-11-02T10:00:00Z", album: null },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.dialogs = makeDialogs();
    mocks.actions.reviewSuggestionAction.mockResolvedValue({ ok: true, data: null });
  });

  it("says when nothing waits", () => {
    render(<SuggestionReview suggestions={[]} />);
    expect(screen.getByText("noSuggestions")).toBeInTheDocument();
  });

  it("accepts and rejects suggestions", async () => {
    render(<SuggestionReview suggestions={suggestions} />);
    expect(screen.getByText("Efter premiären")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sittning" })).toHaveAttribute("href", "/manage/albums/a9");

    await userEvent.click(screen.getAllByRole("button", { name: "accept" })[0]);
    await waitFor(() => expect(mocks.actions.reviewSuggestionAction).toHaveBeenCalledWith("s1", true, null));
    await waitFor(() => expect(mocks.toast.success).toHaveBeenCalledWith("suggestionAccepted"));

    mocks.dialogs.confirm.mockResolvedValueOnce(false);
    await userEvent.click(screen.getAllByRole("button", { name: "reject" })[1]);
    expect(mocks.actions.reviewSuggestionAction).toHaveBeenCalledTimes(1);

    mocks.actions.reviewSuggestionAction.mockResolvedValueOnce({ ok: false, message: "Fel" });
    await userEvent.click(screen.getAllByRole("button", { name: "reject" })[1]);
    await waitFor(() => expect(mocks.actions.reviewSuggestionAction).toHaveBeenLastCalledWith("s2", false, "Svar"));
    await waitFor(() => expect(mocks.toast.error).toHaveBeenCalledWith("Fel"));
  });
});
