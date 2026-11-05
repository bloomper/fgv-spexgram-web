import { describe, expect, it } from "vitest";
import { altText, downloadName, isShowable, mergeRenewed, needsRenewal, publicAfter } from "@/utils/gram";

const media = (expiresAt: string) => ({ thumbnailUrl: "t", previewUrl: "p", videoUrl: null, originalUrl: null, expiresAt });

describe("gram", () => {
  it("uses the caption as text alternative, else the album and the date", () => {
    expect(altText({ caption: "Finalen", takenAt: null, album: null }, "sv")).toBe("Finalen");
    expect(altText({ caption: " ", takenAt: "1975-02-14T20:00:00", album: { id: "a", title: "Nobel 1975", visibility: "PUBLIC" } }, "sv"))
      .toBe("Nobel 1975, 14 februari 1975");
    expect(altText({ caption: null, takenAt: null, album: null }, "en", "Jubileum")).toBe("Jubileum");
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
