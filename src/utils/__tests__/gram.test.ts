import { describe, expect, it } from "vitest";
import { altText, downloadName, isShowable, mergeRenewed, mergeShown, needsRenewal, publicAfter } from "@/utils/gram";

const media = (expiresAt: string) => ({ thumbnailUrl: "t", previewUrl: "p", videoUrl: null, originalUrl: null, expiresAt });

describe("gram", () => {
  it("uses the caption as text alternative, else the album and the date", () => {
    expect(altText({ caption: "Finalen", takenAt: null, album: null }, "sv")).toBe("Finalen");
    expect(altText({ caption: " ", takenAt: "1975-02-14T20:00:00", album: { id: "a", title: "Nobel 1975", visibility: "PUBLIC" } }, "sv"))
      .toBe("Nobel 1975, 14 februari 1975");
    expect(altText({ caption: null, takenAt: null, album: null }, "en", "Jubileum")).toBe("Jubileum");
  });

  it("keeps the addresses already shown when the page is rendered again, so a playing video goes on", () => {
    // The server signed at 12:00, for four hours
    const shown = [
      { id: "a", caption: "old", media: media("2026-11-05T15:00:00Z") },
      { id: "b", caption: null, media: media("2026-11-05T12:10:00Z") },
      { id: "gone", caption: null, media: media("2026-11-05T15:00:00Z") },
      { id: "scrolled", caption: null, media: media("2026-11-05T15:00:00Z") },
    ];
    const server = [
      { id: "new", caption: null, media: media("2026-11-05T16:00:00Z") },
      { id: "a", caption: "new", media: media("2026-11-05T16:00:00Z") },
      { id: "b", caption: null, media: media("2026-11-05T16:00:00Z") },
    ];

    const merged = mergeShown(shown, server);

    expect(merged.map(item => item.id)).toEqual(["new", "a", "b", "scrolled"]);
    // Fields from the server, the address that still lasts from what was shown
    expect(merged[1]).toEqual({ id: "a", caption: "new", media: shown[0].media });
    // One running out within the margin is replaced
    expect(merged[2].media).toBe(server[2].media);
    expect(mergeShown([{ id: "p", media: null }], [{ id: "p", media: media("2026-11-05T16:00:00Z") }])[0].media?.expiresAt)
      .toBe("2026-11-05T16:00:00Z");
  });

  it("asks for new addresses when one runs out soon", () => {
    const now = Date.parse("2026-11-05T12:00:00Z");

    expect(needsRenewal([{ media: media("2026-11-05T16:00:00Z") }], now)).toBe(false);
    expect(needsRenewal([{ media: media("2026-11-05T12:05:00Z") }], now)).toBe(true);
    expect(needsRenewal([{ media: null }], now)).toBe(false);
  });

  it("puts renewed items in place, keeping the order", () => {
    expect(mergeRenewed([{ id: "a", v: 1 }, { id: "b", v: 1 }], [{ id: "b", v: 2 }])).toEqual([{ id: "a", v: 1 }, { id: "b", v: 2 }]);
  });

  it("shows only processed items with addresses", () => {
    expect(isShowable({ status: "READY", media: media("x") })).toBe(true);
    expect(isShowable({ status: "PROCESSING", media: media("x") })).toBe(false);
    expect(isShowable({ status: "READY", media: null })).toBe(false);
  });

  it("names downloads after the caption and the day, without unsafe characters", () => {
    expect(downloadName({ id: "1", caption: "Akt 1/scen 2", takenAt: "1975-02-14T20:00:00", album: null }, "preview"))
      .toBe("Akt 1 scen 2 1975-02-14.jpg");
  });

  it("counts what visitors see of a public album", () => {
    const counts = [{ visibility: "MEMBERS" as const, count: 10 }, { visibility: "PUBLIC" as const, count: 2 }, { visibility: "UNPUBLISHED" as const, count: 1 }];

    expect(publicAfter(counts, false)).toBe(2);
    expect(publicAfter(counts, true)).toBe(13);
  });
});
