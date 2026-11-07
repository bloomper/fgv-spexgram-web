import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ItemsManager } from "@/components/manage/items-manager.client";
import { dialogs as makeDialogs, item } from "./fixtures";

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
  track: vi.fn(),
  actions: {
    albumTitlesAction: vi.fn(),
    setCoverAction: vi.fn(),
    trashItemsAction: vi.fn(),
    updateItemAction: vi.fn(),
    updateItemsAction: vi.fn(),
  },
  dialogs: undefined as unknown as ReturnType<typeof makeDialogs>,
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock("sonner", () => ({ toast: mocks.toast }));
vi.mock("@/utils/umami", () => ({ track: mocks.track }));
vi.mock("@/app/(app)/manage/actions.server", () => mocks.actions);
vi.mock("@/components/dialogs.client", () => ({ useDialogs: () => mocks.dialogs }));

const items = [
  item("i1", { caption: "Finalen", visibility: "MEMBERS" }),
  item("i2", { visibility: "PUBLIC", originalFileName: "IMG_2.jpg" }),
  item("i3", { status: "FAILED", failure: "TOO_LONG", type: "VIDEO", media: null }),
  item("i4", { status: "FAILED", failure: null, contributionStatus: "WAITING", visibility: "UNPUBLISHED" }),
];

const manager = (props: Partial<Parameters<typeof ItemsManager>[0]> = {}) =>
  render(<ItemsManager albumId="a1" albumTitle="Nobel 1975" items={items} coverId="i2" spexflixUrl="https://spexflix" {...props} />);

const selectFirstTwo = async () => {
  await userEvent.click(screen.getByRole("checkbox", { name: /select.*Finalen/ }));
  await userEvent.click(screen.getAllByRole("checkbox", { name: /^select:/ })[1]);
};

describe("ItemsManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.dialogs = makeDialogs();
    Object.values(mocks.actions).forEach(action => action.mockResolvedValue({ ok: true, data: 0 }));
  });

  it("says when the album has no items", () => {
    manager({ items: [] });
    expect(screen.getByText("none")).toBeInTheDocument();
  });

  it("shows each item's status, the cover and a link to Spexflix for videos that are too long", () => {
    manager();
    expect(screen.getByText("cover")).toBeInTheDocument();
    expect(screen.getByText("waiting")).toBeInTheDocument();
    expect(screen.getByText("failure.TOO_LONG")).toBeInTheDocument();
    expect(screen.getByText("failure.NOT_PROCESSED")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Spexflix" })).toHaveAttribute("href", "https://spexflix");
    expect(screen.getByRole("button", { name: "caption" })).toBeDisabled();
  });

  it("selects all and none", async () => {
    manager();
    await userEvent.click(screen.getByRole("checkbox", { name: "selectAll" }));
    expect(screen.getByText(`selected:${JSON.stringify({ count: 4 })}`)).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole("checkbox")[0]);
    expect(screen.getByText("selectAll")).toBeInTheDocument();
  });

  it("captions and credits the selection", async () => {
    manager();
    await selectFirstTwo();
    await userEvent.click(screen.getByRole("button", { name: "caption" }));
    await waitFor(() => expect(mocks.actions.updateItemsAction).toHaveBeenCalledWith(["i1", "i2"], { caption: "Svar" }, ["a1"]));
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalled());
    expect(mocks.track).toHaveBeenCalledWith("items-caption", { count: 2 });

    await selectFirstTwo();
    mocks.actions.updateItemsAction.mockResolvedValueOnce({ ok: true, data: 1 });
    await userEvent.click(screen.getByRole("button", { name: "photographer" }));
    await waitFor(() => expect(mocks.actions.updateItemsAction).toHaveBeenLastCalledWith(["i1", "i2"], { photographer: "Svar" }, ["a1"]));
    await waitFor(() => expect(mocks.toast.warning).toHaveBeenCalled());

    // Cancelled prompts change nothing
    mocks.dialogs.prompt.mockResolvedValue(null);
    await selectFirstTwo();
    await userEvent.click(screen.getByRole("button", { name: "caption" }));
    await userEvent.click(screen.getByRole("button", { name: "photographer" }));
    expect(mocks.actions.updateItemsAction).toHaveBeenCalledTimes(2);
  });

  it("asks before making items public, and tells when saving fails", async () => {
    manager({ albumId: null });
    await selectFirstTwo();
    mocks.dialogs.choose.mockResolvedValueOnce("PUBLIC");
    mocks.dialogs.confirm.mockResolvedValueOnce(false);
    await userEvent.click(screen.getByRole("button", { name: "visibility" }));
    await waitFor(() => expect(mocks.dialogs.confirm).toHaveBeenCalled());
    expect(mocks.actions.updateItemsAction).not.toHaveBeenCalled();

    mocks.dialogs.choose.mockResolvedValueOnce("PUBLIC");
    mocks.actions.updateItemsAction.mockResolvedValueOnce({ ok: false, message: "Nej" });
    await userEvent.click(screen.getByRole("button", { name: "visibility" }));
    await waitFor(() => expect(mocks.actions.updateItemsAction).toHaveBeenCalledWith(["i1", "i2"], { visibility: "PUBLIC" }, []));
    await waitFor(() => expect(mocks.toast.error).toHaveBeenCalledWith("Nej"));

    mocks.dialogs.choose.mockResolvedValueOnce("UNPUBLISHED");
    await userEvent.click(screen.getByRole("button", { name: "visibility" }));
    await waitFor(() => expect(mocks.actions.updateItemsAction).toHaveBeenLastCalledWith(["i1", "i2"], { visibility: "UNPUBLISHED" }, []));

    await selectFirstTwo();
    await userEvent.click(screen.getByRole("button", { name: "visibility" }));
    expect(mocks.actions.updateItemsAction).toHaveBeenCalledTimes(2);
  });

  it("moves the selection to another album and trashes it", async () => {
    manager();
    await selectFirstTwo();
    mocks.actions.albumTitlesAction.mockResolvedValueOnce({ ok: false, message: "Borta" });
    await userEvent.click(screen.getByRole("button", { name: "move" }));
    await waitFor(() => expect(mocks.toast.error).toHaveBeenCalledWith("Borta"));

    mocks.actions.albumTitlesAction.mockResolvedValue({
      ok: true, data: [{ id: "a1", title: "Nobel 1975", dateFrom: null }, { id: "a2", title: "Jubileum", dateFrom: "1998-05-01" }],
    });
    mocks.dialogs.choose.mockResolvedValueOnce("a2");
    await userEvent.click(screen.getByRole("button", { name: "move" }));
    await waitFor(() => expect(mocks.actions.updateItemsAction).toHaveBeenCalledWith(["i1", "i2"], { albumId: "a2" }, ["a1"]));
    expect(mocks.dialogs.choose.mock.calls[0][0].items?.map(choice => choice.id)).toEqual(["a2"]);

    await selectFirstTwo();
    await userEvent.click(screen.getByRole("button", { name: "move" }));
    mocks.dialogs.confirm.mockResolvedValueOnce(false);
    await userEvent.click(screen.getByRole("button", { name: "trash" }));
    expect(mocks.actions.trashItemsAction).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "trash" }));
    await waitFor(() => expect(mocks.actions.trashItemsAction).toHaveBeenCalledWith(["i1", "i2"], true, ["a1"]));
  });

  it("edits one item's fields and position, and makes it the cover", async () => {
    manager({ openItem: items[0] });
    expect(screen.getByRole("heading", { name: "editTitle" })).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText("caption"));
    await userEvent.type(screen.getByLabelText("caption"), "Ny text");
    await userEvent.type(screen.getByLabelText("latitude"), "57.7");
    await userEvent.type(screen.getByLabelText("longitude"), "11.9");
    await userEvent.click(screen.getByRole("button", { name: "save" }));
    await waitFor(() => expect(mocks.actions.updateItemAction).toHaveBeenCalledWith("i1", "a1", expect.objectContaining({
      caption: "Ny text", latitude: 57.7, longitude: 11.9, takenAt: "1975-02-14T20:00",
    })));
    await waitFor(() => expect(screen.queryByRole("heading", { name: "editTitle" })).not.toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: /editOf.*Finalen/ }));
    await userEvent.click(screen.getByRole("checkbox", { name: "removePosition" }));
    mocks.actions.updateItemAction.mockResolvedValueOnce({ ok: false, message: "Fel" });
    await userEvent.click(screen.getByRole("button", { name: "save" }));
    await waitFor(() => expect(mocks.actions.updateItemAction).toHaveBeenLastCalledWith("i1", "a1", expect.objectContaining({ latitude: null, longitude: null })));
    await waitFor(() => expect(mocks.toast.error).toHaveBeenCalledWith("Fel"));

    await userEvent.click(screen.getByRole("button", { name: "makeCover" }));
    await waitFor(() => expect(mocks.actions.setCoverAction).toHaveBeenCalledWith("a1", "i1"));
    mocks.actions.setCoverAction.mockResolvedValueOnce({ ok: false, message: "Nej" });
    await userEvent.click(screen.getByRole("button", { name: "makeCover" }));
    await waitFor(() => expect(mocks.toast.error).toHaveBeenCalledWith("Nej"));
    await userEvent.click(screen.getByRole("button", { name: "cancel" }));
    await waitFor(() => expect(screen.queryByRole("heading", { name: "editTitle" })).not.toBeInTheDocument());
  });

  it("offers no cover button for the cover itself", async () => {
    manager({ openItem: items[1] });
    expect(screen.getAllByText("IMG_2.jpg").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "makeCover" })).not.toBeInTheDocument();
  });
});
