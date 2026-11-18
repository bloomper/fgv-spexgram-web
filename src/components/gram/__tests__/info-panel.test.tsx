import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InfoPanel } from "@/components/gram/info-panel.client";
import { item } from "@/components/manage/__tests__/fixtures";

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key, useLocale: () => "sv" }));
vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: { children?: React.ReactNode; href: string }) => <a href={href} {...rest}>{children}</a>,
}));

const shown = item("i1", {
  caption: "Finalen", photographer: "Foto: Anna", takenAt: "1975-02-14T21:30:00", latitude: 57.689, longitude: 11.974,
  uploadedBy: "Erik", originalFileName: "IMG_1.jpg",
  album: { id: "a1", title: "Nobel 1975", visibility: "MEMBERS", spex: [{ id: "s1", title: "Nobel", year: 1975 }] },
});

describe("InfoPanel", () => {
  it("shows the date, album, spex, caption, photographer and, for members, the place on a small map", async () => {
    const onClose = vi.fn();

    render(<InfoPanel item={shown} member editor={false} onClose={onClose} />);
    expect(screen.getByText("14 februari 1975, 21:30")).toBeInTheDocument();
    // The album and its spex
    expect(screen.getAllByRole("link", { name: "Nobel 1975" }).map(link => link.getAttribute("href"))).toEqual(["/albums/a1", "/spex/s1"]);
    expect(screen.getByRole("link", { name: "place" })).toHaveAttribute("href", expect.stringContaining("mlat=57.689"));
    expect(screen.queryByText("Erik")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "closeInfo" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("shows editors the uploader and the file, and visitors no map", () => {
    const { rerender } = render(<InfoPanel item={shown} member editor onClose={vi.fn()} />);

    expect(screen.getByText("Erik")).toBeInTheDocument();
    expect(screen.getByText("IMG_1.jpg")).toBeInTheDocument();
    rerender(<InfoPanel item={shown} member={false} editor={false} onClose={vi.fn()} />);
    expect(screen.queryByRole("link", { name: "place" })).not.toBeInTheDocument();
  });
});
