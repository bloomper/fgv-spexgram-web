import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Memories } from "@/components/gram/memories.client";
import { item } from "@/components/manage/__tests__/fixtures";
import type { AlbumCardFieldsFragment } from "@/gql/graphql";

const mocks = vi.hoisted(() => ({ albumItemsAction: vi.fn(), error: vi.fn() }));

vi.mock("next-intl", () => ({
  useTranslations: () =>
    Object.assign(
      (key: string, values?: Record<string, unknown>) => (values ? `${key}:${JSON.stringify(values)}` : key),
      { has: () => false, raw: (key: string) => key }
    ),
  useLocale: () => "sv",
}));
vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: { children?: React.ReactNode; href: string }) => (
    <a
      href={href}
      {...rest}
    >
      {children}
    </a>
  ),
}));
vi.mock("sonner", () => ({ toast: { error: mocks.error } }));
vi.mock("@/app/(app)/actions.server", () => ({
  albumItemsAction: mocks.albumItemsAction,
  favouriteAction: vi.fn(),
  reportAction: vi.fn(),
}));

const options = { canDownloadOriginals: false, report: { visitor: true, turnstileSiteKey: null } };
const album = {
  id: "a1",
  title: "Nobel 1975 – föreställning",
  dateFrom: "1975-11-18",
  dateTo: null,
  place: null,
  visibility: "PUBLIC",
  itemCount: 4,
  kind: { id: "k1", nameSv: "Föreställning", nameEn: "Show" },
  spex: [
    {
      id: "s1",
      title: "Nobel",
      year: 1975,
      revival: false,
      parentId: null,
      familyId: "s1",
      categoryId: null,
      categoryName: null,
      premiere: "1975-11-18",
      posterUrl: null,
    },
  ],
  cover: null,
} as unknown as AlbumCardFieldsFragment;

describe("Memories", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows this day a card a year, and the albums of spex whose premiere is near, which open a slideshow", async () => {
    mocks.albumItemsAction
      .mockResolvedValueOnce({ ok: true, data: { items: [], totalCount: 0 } })
      .mockResolvedValueOnce({ ok: true, data: { items: [item("i9", { caption: "Ridån" })], totalCount: 1 } });
    render(
      <Memories
        now="2026-11-17T10:00:00Z"
        options={options}
        premiereAlbums={[album]}
        thisDay={[
          item("i1", { takenAt: "2001-11-17T20:00:00" }),
          item("i2", { takenAt: "2001-11-17T21:00:00" }),
          item("i3", { takenAt: "1990-11-17T20:00:00", caption: "Kören" }),
        ]}
      />
    );

    expect(screen.getByRole("button", { name: /yearsAgo:\{"count":25\}/ })).toHaveTextContent(
      `photos:${JSON.stringify({ count: 2 })}`
    );
    expect(screen.getByRole("button", { name: /Nobel 1975/ })).toHaveTextContent(
      `premiere:${JSON.stringify({ count: 51 })}`
    );

    await userEvent.click(screen.getByRole("button", { name: /yearsAgo:\{"count":36\}/ }));
    expect(await screen.findByRole("button", { name: "close" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "close" }));

    await userEvent.click(screen.getByRole("button", { name: /Nobel 1975/ }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith("empty"));
    await userEvent.click(screen.getByRole("button", { name: /Nobel 1975/ }));
    await waitFor(() => expect(mocks.albumItemsAction).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole("button", { name: "close" })).toBeInTheDocument();
  });

  it("shows nothing without memories", () => {
    const { container } = render(
      <Memories
        now="2026-11-17T10:00:00Z"
        options={options}
        premiereAlbums={[]}
        thisDay={[]}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
