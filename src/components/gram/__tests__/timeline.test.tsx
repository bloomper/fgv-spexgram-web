import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Timeline } from "@/components/gram/timeline.client";
import { dialogs, item } from "@/components/manage/__tests__/fixtures";
import { MockIntersectionObserver } from "./mock-intersection-observer";

const mocks = vi.hoisted(() => ({
  timelineItemsAction: vi.fn(),
  renewItemsAction: vi.fn(),
  favouriteAction: vi.fn(),
  updateItemsAction: vi.fn(),
  trashItemsAction: vi.fn(),
  albumTitlesAction: vi.fn(),
  albumFromItemsAction: vi.fn(),
  downloadFile: vi.fn(),
  refresh: vi.fn(),
  dialogs: undefined as unknown as ReturnType<typeof dialogs>,
}));

vi.mock("next-intl", () => ({
  useTranslations: () => Object.assign((key: string, values?: Record<string, unknown>) => (values ? `${key}:${JSON.stringify(values)}` : key),
    { has: () => false, raw: (key: string) => key }),
  useLocale: () => "sv",
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh, push: vi.fn() }) }));
vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: { children?: React.ReactNode; href: string }) => <a href={href} {...rest}>{children}</a>,
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock("@/app/(app)/actions.server", () => ({
  timelineItemsAction: mocks.timelineItemsAction,
  renewItemsAction: mocks.renewItemsAction,
  favouriteAction: mocks.favouriteAction,
  reportAction: vi.fn(),
}));
vi.mock("@/app/(app)/manage/actions.server", () => ({
  updateItemsAction: mocks.updateItemsAction,
  trashItemsAction: mocks.trashItemsAction,
  albumTitlesAction: mocks.albumTitlesAction,
  albumFromItemsAction: mocks.albumFromItemsAction,
}));
vi.mock("@bloomper/fgv-web-ui/shell/dialogs", () => ({ useDialogs: () => mocks.dialogs }));
vi.mock("@/components/gram/download.client", () => ({ downloadFile: mocks.downloadFile }));
vi.mock("@/utils/umami", () => ({ track: vi.fn() }));
// jsdom has no layout: a plain list calls the timeline's own render functions
vi.mock("react-photo-album", () => ({
  RowsPhotoAlbum: ({ photos, render }: {
    photos: { key: string }[];
    render: {
      wrapper: (props: Record<string, unknown>, context: { photo: unknown }) => React.ReactNode;
      image: (props: Record<string, unknown>, context: { photo: unknown }) => React.ReactNode;
    };
  }) => (
    <div>
      {photos.map(photo => (
        <React.Fragment key={photo.key}>
          {render.wrapper({ children: render.image({ sizes: "100vw" }, { photo }) }, { photo })}
        </React.Fragment>
      ))}
    </div>
  ),
}));

const options = { canDownloadOriginals: false, report: { visitor: false, turnstileSiteKey: null } };
const months = [{ month: "1984-02", count: 3 }, { month: null, count: 1 }];
const february = [
  item("i1", { caption: "Finalen", takenAt: "1984-02-20T21:00:00", favourite: true }),
  item("i2", { caption: "Kören", takenAt: "1984-02-14T20:00:00" }),
  item("i3", { caption: "Orkestern", takenAt: "1984-02-14T19:00:00" }),
];

const sectionOf = (id: string) => MockIntersectionObserver.instances.find(observer =>
  [...observer.elements].some(element => element.id === id))!;

describe("Timeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MockIntersectionObserver.instances = [];
    mocks.dialogs = dialogs();
    mocks.timelineItemsAction.mockImplementation(async (month: string | null) => ({
      ok: true,
      data: month === "1984-02" ? { items: february, totalCount: 3 } : { items: [item("u1", { caption: "Utan", takenAt: null })], totalCount: 1 },
    }));
  });

  it("lays out the months before loading them, and loads a month as it comes near", async () => {
    render(<Timeline months={months} options={options} member editor={false} />);

    expect(screen.getByRole("heading", { name: /februari 1984/ })).toBeInTheDocument();
    expect(screen.queryAllByTestId("timeline-item")).toHaveLength(0);

    act(() => sectionOf("m-1984-02").trigger(true));
    await waitFor(() => expect(screen.getAllByTestId("timeline-item")).toHaveLength(3));
    expect(mocks.timelineItemsAction).toHaveBeenCalledWith("1984-02", false, 0);
    // Days under the month, newest first
    expect(screen.getAllByRole("heading", { level: 3 }).map(heading => heading.textContent)).toEqual(["20 februari 1984", "14 februari 1984"]);
    expect(screen.getByLabelText("favourite")).toBeInTheDocument();

    act(() => sectionOf("m-undated").trigger(true));
    await waitFor(() => expect(screen.getAllByTestId("timeline-item")).toHaveLength(4));
  });

  it("selects with the check mark, a range with shift, a day at once, and acts on the selection", async () => {
    mocks.favouriteAction.mockResolvedValue({ ok: true, data: ["i1", "i2", "i3"] });
    mocks.trashItemsAction.mockResolvedValue({ ok: true, data: null });
    mocks.updateItemsAction.mockResolvedValue({ ok: true, data: 0 });
    render(<Timeline months={months} options={options} member editor />);
    act(() => sectionOf("m-1984-02").trigger(true));
    await screen.findAllByTestId("timeline-item");

    await userEvent.click(screen.getByRole("button", { name: `select:${JSON.stringify({ name: "Finalen" })}` }));
    expect(screen.getByText(`selected:${JSON.stringify({ count: 1 })}`)).toBeInTheDocument();
    // While selecting, a tap on an item selects it too; shift selects the range
    fireEvent.click(screen.getByRole("button", { name: "Orkestern" }), { shiftKey: true });
    expect(screen.getByText(`selected:${JSON.stringify({ count: 3 })}`)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "favourite" }));
    await waitFor(() => expect(mocks.favouriteAction).toHaveBeenCalledWith(["i1", "i2", "i3"], true));
    expect(screen.queryByRole("toolbar")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: `selectDay:${JSON.stringify({ day: "14 februari 1984" })}` }));
    expect(screen.getByText(`selected:${JSON.stringify({ count: 2 })}`)).toBeInTheDocument();

    mocks.dialogs.prompt.mockResolvedValueOnce("1985-03-01");
    await userEvent.click(screen.getByRole("button", { name: "date" }));
    await waitFor(() => expect(mocks.updateItemsAction).toHaveBeenCalledWith(["i2", "i3"], { takenDate: "1985-03-01" }, ["a1"]));
    expect(mocks.refresh).toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: `selectDay:${JSON.stringify({ day: "14 februari 1984" })}` }));
    mocks.dialogs.choose.mockResolvedValueOnce("PUBLIC");
    await userEvent.click(screen.getByRole("button", { name: "visibility" }));
    await waitFor(() => expect(mocks.updateItemsAction).toHaveBeenCalledWith(["i2", "i3"], { visibility: "PUBLIC" }, ["a1"]));
    expect(mocks.dialogs.confirm).toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: `selectDay:${JSON.stringify({ day: "14 februari 1984" })}` }));
    await userEvent.click(screen.getByRole("button", { name: "trash" }));
    await waitFor(() => expect(mocks.trashItemsAction).toHaveBeenCalledWith(["i2", "i3"], true, ["a1"]));
    await waitFor(() => expect(screen.getAllByTestId("timeline-item")).toHaveLength(1));
  });

  it("moves a selection to an album or a new one, and downloads it", async () => {
    mocks.albumTitlesAction.mockResolvedValue({ ok: true, data: [{ id: "a2", title: "Fest", dateFrom: null }] });
    mocks.updateItemsAction.mockResolvedValue({ ok: true, data: 0 });
    mocks.albumFromItemsAction.mockResolvedValue({ ok: true, data: "a3" });
    render(<Timeline months={months} options={options} member editor />);
    act(() => sectionOf("m-1984-02").trigger(true));
    await screen.findAllByTestId("timeline-item");

    await userEvent.click(screen.getByRole("button", { name: `select:${JSON.stringify({ name: "Kören" })}` }));
    await userEvent.click(screen.getByRole("button", { name: "download" }));
    expect(mocks.downloadFile).toHaveBeenCalledWith("https://media/i2/p", expect.stringMatching(/^Kören 1984-02-14\.jpg$/));

    mocks.dialogs.choose.mockResolvedValueOnce("a2");
    await userEvent.click(screen.getByRole("button", { name: "move" }));
    await waitFor(() => expect(mocks.updateItemsAction).toHaveBeenCalledWith(["i2"], { albumId: "a2" }, ["a1"]));

    await userEvent.click(screen.getByRole("button", { name: `select:${JSON.stringify({ name: "Kören" })}` }));
    mocks.dialogs.prompt.mockResolvedValueOnce("Kören 1984");
    await userEvent.click(screen.getByRole("button", { name: "newAlbum" }));
    await waitFor(() => expect(mocks.albumFromItemsAction).toHaveBeenCalledWith("Kören 1984", "1984-02-14", ["i2"]));
  });

  it("takes items out of the favourites view, and opens an item in the viewer with its info", async () => {
    mocks.favouriteAction.mockResolvedValue({ ok: true, data: ["i1"] });
    render(<Timeline months={months} favourites options={options} member editor={false} />);
    act(() => sectionOf("m-1984-02").trigger(true));
    await screen.findAllByTestId("timeline-item");
    expect(mocks.timelineItemsAction).toHaveBeenCalledWith("1984-02", true, 0);

    await userEvent.click(screen.getByRole("button", { name: `select:${JSON.stringify({ name: "Finalen" })}` }));
    await userEvent.click(screen.getByRole("button", { name: "unfavourite" }));
    await waitFor(() => expect(screen.getAllByTestId("timeline-item")).toHaveLength(2));
    expect(mocks.favouriteAction).toHaveBeenCalledWith(["i1"], false);

    await userEvent.click(screen.getByRole("button", { name: "Kören" }));
    await userEvent.click(await screen.findByRole("button", { name: "info" }));
    expect(screen.getByRole("complementary", { name: "info" })).toHaveTextContent("Nobel 1975");
    await userEvent.click(screen.getByRole("button", { name: "favourite" }));
    await waitFor(() => expect(mocks.favouriteAction).toHaveBeenLastCalledWith(["i2"], true));
    expect(screen.getByRole("button", { name: "unfavourite" })).toHaveAttribute("aria-pressed", "true");
  });

  it("jumps with the scrubber, and shows nothing without months", () => {
    const scrolled = vi.fn();

    Element.prototype.scrollIntoView = scrolled;
    render(<Timeline months={[{ month: "2024-02", count: 5 }, ...months]} options={options} member={false} editor={false} />);
    fireEvent.click(screen.getByRole("button", { name: "1984" }));
    expect(scrolled).toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /^select/ })).not.toBeInTheDocument();

    const { container } = render(<Timeline months={[]} options={options} member={false} editor={false} />);

    expect(container).toBeEmptyDOMElement();
  });
});
