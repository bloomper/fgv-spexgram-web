import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Gallery } from "@/components/gram/gallery.client";
import { item } from "@/components/manage/__tests__/fixtures";
import { MockIntersectionObserver } from "../../../../vitest.setup";

const mocks = vi.hoisted(() => ({
  albumItemsAction: vi.fn(),
  renewItemsAction: vi.fn(),
  downloadFile: vi.fn(),
  track: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => Object.assign((key: string, values?: Record<string, unknown>) => (values ? `${key}:${JSON.stringify(values)}` : key),
    { has: () => false, raw: (key: string) => key }),
  useLocale: () => "sv",
}));
vi.mock("@/app/(app)/actions.server", () => ({ albumItemsAction: mocks.albumItemsAction, renewItemsAction: mocks.renewItemsAction, reportAction: vi.fn() }));
vi.mock("@/components/gram/download.client", () => ({ downloadFile: mocks.downloadFile }));
vi.mock("@/utils/umami", () => ({ track: mocks.track }));
// jsdom has no layout, so the justified grid would place nothing: a plain list calls the gallery's own render functions
vi.mock("react-photo-album", () => ({
  RowsPhotoAlbum: ({ photos, onClick, render, targetRowHeight }: {
    photos: { key: string }[];
    onClick: (event: { index: number }) => void;
    targetRowHeight: (width: number) => number;
    render: {
      button: (props: Record<string, unknown>, context: { photo: unknown }) => React.ReactNode;
      image: (props: Record<string, unknown>, context: { photo: unknown }) => React.ReactNode;
      extras: (props: Record<string, unknown>, context: { photo: unknown }) => React.ReactNode;
    };
  }) => (
    <div data-heights={[300, 600, 1200].map(targetRowHeight).join()}>
      {photos.map((photo, index) => (
        <div key={photo.key}>
          {render.button({ onClick: () => onClick({ index }), children: render.image({ sizes: "100vw" }, { photo }) }, { photo })}
          {render.extras({}, { photo })}
        </div>
      ))}
    </div>
  ),
}));

const options = { canDownloadOriginals: true, report: { visitor: false, turnstileSiteKey: null }, albumTitle: "Nobel 1975" };
const page = (from: number, count: number) => Array.from({ length: count }, (_, i) => item(`i${from + i}`, { caption: `Bild ${from + i}` }));
const soon = new Date(Date.now() + 60_000).toISOString();

describe("Gallery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MockIntersectionObserver.instances = [];
  });

  it("renders nothing without items", () => {
    const { container } = render(<Gallery items={[]} options={options} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("loads the next page as the viewer scrolls, and stops when a page brings nothing new", async () => {
    mocks.albumItemsAction
      .mockResolvedValueOnce({ ok: false, message: "Nej" })
      .mockResolvedValueOnce({ ok: true, data: { items: page(3, 2), totalCount: 6 } })
      .mockResolvedValueOnce({ ok: true, data: { items: page(3, 2), totalCount: 6 } });
    render(<Gallery items={page(1, 2)} albumId="a1" totalCount={6} pageSize={2} options={options} />);
    expect(screen.getByText(`more:${JSON.stringify({ shown: 2, total: 6 })}`)).toBeInTheDocument();

    act(() => MockIntersectionObserver.instances.at(-1)!.trigger(true));
    await userEvent.click(await screen.findByRole("button", { name: "retry" }));
    await waitFor(() => expect(screen.getAllByTestId("gallery-item")).toHaveLength(4));
    expect(mocks.albumItemsAction).toHaveBeenLastCalledWith("a1", 1);

    act(() => MockIntersectionObserver.instances.at(-1)!.trigger(true));
    await waitFor(() => expect(mocks.albumItemsAction).toHaveBeenCalledTimes(3));
    await waitFor(() => expect(screen.queryByText(/^more:/)).not.toBeInTheDocument());
  });

  it("opens the viewer, renews addresses that run out, downloads and goes to the item's page", async () => {
    const items = [item("i1", { caption: "Finalen", media: { ...item("i1").media!, expiresAt: soon, originalUrl: "https://media/i1/o" } }),
      item("i2", { type: "VIDEO", media: { ...item("i2").media!, videoUrl: "https://media/i2/v" } }),
      item("i3", { status: "PROCESSING", media: null })];

    mocks.renewItemsAction.mockResolvedValue({ ok: true, data: [items[0]] });
    render(<Gallery items={items} options={options} />);
    expect(screen.getAllByTestId("gallery-item")[2]).toBeDisabled();

    await userEvent.click(screen.getAllByTestId("gallery-item")[0]);
    await waitFor(() => expect(mocks.renewItemsAction).toHaveBeenCalledWith(["i1", "i2"]));

    await userEvent.click(await screen.findByRole("button", { name: "downloadPreview" }));
    expect(mocks.downloadFile).toHaveBeenCalledWith("https://media/i1/p", expect.any(String));
    await userEvent.click(screen.getByRole("button", { name: "downloadOriginal" }));
    expect(mocks.downloadFile).toHaveBeenCalledWith("https://media/i1/o", expect.any(String));
    expect(mocks.track).toHaveBeenCalledWith("item-download", { original: true });
    expect(screen.getByRole("link", { name: "openPage" })).toHaveAttribute("href", "/items/i1");

    // Looked at again: addresses that run out are renewed
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
    await userEvent.click(screen.getByRole("button", { name: "report" }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    document.dispatchEvent(new Event("visibilitychange"));
    await waitFor(() => expect(mocks.renewItemsAction).toHaveBeenCalledTimes(2));
  });

  it("keeps what it shows when the page is rendered again, and adds what is new", async () => {
    const first = page(1, 2);
    const { rerender } = render(<Gallery items={first} options={options} />);

    await userEvent.click(screen.getAllByTestId("gallery-item")[1]);
    const again = [item("i0", { caption: "Ny" }), ...page(1, 2).map(shown => ({ ...shown, media: { ...shown.media!, previewUrl: "https://other", expiresAt: "2100-01-02T00:00:00Z" } }))];

    rerender(<Gallery items={again} options={options} />);
    expect(screen.getAllByTestId("gallery-item")).toHaveLength(3);
    expect(document.querySelector("img[src='https://other']")).toBeNull();
  });
});
