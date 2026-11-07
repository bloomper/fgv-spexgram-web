import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UploadDropZone, UploadIndicator, UploadList, UploadsProvider, useUploads, type UploadTarget } from "@/components/upload/uploads.client";

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  pathname: "/albums/a1",
  uploadFile: vi.fn(),
  addUploadsAction: vi.fn(),
  track: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }), usePathname: () => mocks.pathname }));
vi.mock("@/components/upload/tus.client", () => ({ uploadFile: mocks.uploadFile }));
vi.mock("@/app/(app)/actions.server", () => ({ addUploadsAction: mocks.addUploadsAction }));
vi.mock("@/utils/umami", () => ({ track: mocks.track }));

const target: UploadTarget = { albumId: "a1", albumTitle: "Nobel 1975", mode: "items", maxBytes: 1000 };
const file = (name: string, size = 10) => new File([new Uint8Array(size)], name, { type: "image/jpeg" });
const result = (fields: Record<string, unknown>) => ({
  uploadId: "u", fileName: "f", outcome: "CREATED", message: null, itemId: "i", existingItemId: null, existingAlbumId: null,
  existingAlbumTitle: null, ...fields,
});

function Page() {
  return (
    <UploadsProvider>
      <UploadIndicator />
      <UploadDropZone target={target} hint="Långa filmer hör hemma i Spexflix" />
      <UploadList albumId="a1" />
    </UploadsProvider>
  );
}

const choose = async (...files: File[]) => {
  await userEvent.upload(screen.getByLabelText("choose"), files);
};

describe("uploads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.pathname = "/albums/a1";
    mocks.uploadFile.mockImplementation(async (_: File, progress: (fraction: number) => void) => {
      progress(0.5);
      return "upload-id";
    });
  });

  it("uploads each file, adds it to the album and shows what became of it", async () => {
    mocks.addUploadsAction
      .mockResolvedValueOnce({ ok: true, data: [result({ outcome: "CREATED" })] })
      .mockResolvedValueOnce({ ok: true, data: [result({ outcome: "DUPLICATE", existingItemId: "i9", existingAlbumTitle: "Jubileum" })] })
      .mockResolvedValueOnce({ ok: true, data: [result({ outcome: "REJECTED", message: "Okänt format" })] })
      .mockResolvedValueOnce({ ok: false, message: "Albumet är borta" });
    render(<Page />);
    expect(screen.getByText("Långa filmer hör hemma i Spexflix")).toBeInTheDocument();

    await choose(file("a.jpg"), file("b.jpg"), file("c.jpg"), file("d.jpg"), file("stor.mov", 5000));

    await waitFor(() => expect(screen.getByText("created")).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText("Albumet är borta")).toBeInTheDocument());
    expect(screen.getByText(`duplicateIn:${JSON.stringify({ album: "Jubileum" })}`)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "showExisting" })).toHaveAttribute("href", "/items/i9");
    expect(screen.getByText(`rejected:${JSON.stringify({ message: "Okänt format" })}`)).toBeInTheDocument();
    expect(screen.getByText("tooLarge")).toBeInTheDocument();
    expect(mocks.addUploadsAction).toHaveBeenCalledWith("a1", "items", ["upload-id"]);
    expect(mocks.uploadFile).toHaveBeenCalledTimes(4);
    expect(mocks.refresh).toHaveBeenCalledTimes(3);
    expect(mocks.track).toHaveBeenCalledWith("item-upload", { outcome: "CREATED" });

    await userEvent.click(screen.getByRole("button", { name: "doneLabel" }));
    await waitFor(() => expect(screen.getAllByTestId("upload-row")).toHaveLength(10));

    await userEvent.click(screen.getAllByRole("button", { name: "clearFinished" })[0]);
    await waitFor(() => expect(screen.queryAllByTestId("upload-row")).toHaveLength(0));
  });

  it("leaves other pages alone and says when sending fails", async () => {
    mocks.pathname = "/items/i1";
    mocks.uploadFile.mockRejectedValueOnce(new Error("offline"));
    mocks.addUploadsAction.mockResolvedValue({ ok: true, data: [result({ outcome: "DUPLICATE" })] });
    render(<Page />);

    await choose(file("a.jpg"), file("b.jpg"));

    await waitFor(() => expect(screen.getByText("failed")).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText("duplicate")).toBeInTheDocument());
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("shows the progress while files are on their way, and takes dropped files", async () => {
    let finish: (id: string) => void = () => undefined;

    mocks.uploadFile.mockImplementation((_: File, progress: (fraction: number) => void) => new Promise(resolve => {
      progress(0.25);
      finish = resolve;
    }));
    mocks.addUploadsAction.mockResolvedValue({ ok: true, data: [result({})] });
    render(<Page />);

    const zone = screen.getByTestId("upload-drop-zone");

    fireEvent.dragOver(zone);
    fireEvent.dragLeave(zone);
    fireEvent.drop(zone, { dataTransfer: { files: [file("a.jpg")] } });
    fireEvent.drop(zone, { dataTransfer: { files: [] } });

    await waitFor(() => expect(screen.getByText(`uploading:${JSON.stringify({ percent: 25 })}`)).toBeInTheDocument());
    expect(screen.getByRole("button", { name: `activeLabel:${JSON.stringify({ count: 1, percent: 25 })}` })).toBeInTheDocument();
    await act(async () => finish("upload-id"));
    await waitFor(() => expect(screen.getByText("created")).toBeInTheDocument());
  });

  it("is used within its provider only", () => {
    function Outside() {
      useUploads();
      return null;
    }

    vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => render(<Outside />)).toThrow("useUploads must be used within <UploadsProvider />");
  });
});
