import { describe, expect, it } from "vitest";
import { filterHref, toAlbumFilter, toPage } from "@/utils/filters";

const id = "00000000-0000-7000-8000-000000000001";

describe("filters", () => {
  it("reads the filter from the address, leaving out what is malformed", () => {
    expect(toAlbumFilter({ category: id, year: "1975", kind: "x", spex: id, visibility: "PUBLIC" })).toEqual({
      categoryId: id, year: 1975, kindId: null, spexId: id, visibility: null,
    });
    expect(toAlbumFilter({ visibility: "PUBLIC" }, true).visibility).toBe("PUBLIC");
    expect(toAlbumFilter({ year: "abc" }).year).toBeNull();
  });

  it("reads pages and writes addresses without empty parts", () => {
    expect(toPage("2")).toBe(2);
    expect(toPage("-1")).toBe(0);
    expect(filterHref("/albums", { year: "1975", page: "1" }, { page: "0" })).toBe("/albums?year=1975");
    expect(filterHref("/albums", {}, {})).toBe("/albums");
  });
});
