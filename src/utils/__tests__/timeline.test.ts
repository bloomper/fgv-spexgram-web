import { describe, expect, it } from "vitest";
import {
  estimateHeight,
  groupByDay,
  monthAt,
  monthKey,
  rangeOf,
  rowHeightFor,
  scrubberMarks,
  thumbhashUrl,
  tileOf,
  yearsAgo,
} from "@/utils/timeline";

const months = [
  { month: "2024-03", count: 30 },
  { month: "2024-02", count: 10 },
  { month: "1984-02", count: 50 },
  { month: null, count: 10 },
];

describe("timeline", () => {
  it("groups a month's items by day in the order they come, the undated last", () => {
    expect(
      groupByDay([
        { takenAt: "1984-02-14T21:00:00" },
        { takenAt: "1984-02-14T19:00:00" },
        { takenAt: "1984-02-01T12:00:00" },
        { takenAt: null },
      ]).map((day) => [day.day, day.items.length])
    ).toEqual([
      ["1984-02-14", 2],
      ["1984-02-01", 1],
      [null, 1],
    ]);
    expect(monthKey(null)).toBe("undated");
    expect(monthKey("1984-02")).toBe("1984-02");
  });

  it("estimates a month's height from its count and the width, before it has loaded", () => {
    expect(estimateHeight(0, 1000, 220)).toBe(48);
    expect(estimateHeight(30, 1000, 220)).toBeGreaterThan(estimateHeight(3, 1000, 220));
    expect(estimateHeight(30, 300, 120)).toBeGreaterThan(estimateHeight(30, 1200, 120));
    expect([300, 600, 1200].map((width) => rowHeightFor(width))).toEqual([120, 170, 220]);
  });

  it("marks each year on the scrubber at its share of the timeline, and finds the month at a point", () => {
    expect(scrubberMarks(months)).toEqual([
      { year: "2024", month: "2024-03", at: 0 },
      { year: "1984", month: "1984-02", at: 0.4 },
    ]);
    expect(scrubberMarks([])).toEqual([]);
    expect(monthAt(months, 0)?.month).toBe("2024-03");
    expect(monthAt(months, 0.35)?.month).toBe("2024-02");
    expect(monthAt(months, 0.5)?.month).toBe("1984-02");
    expect(monthAt(months, 1)?.month).toBeNull();
    expect(monthAt([], 0.5)).toBeNull();
  });

  it("selects a range from the anchor either way", () => {
    expect(rangeOf(["a", "b", "c", "d"], "b", "d")).toEqual(["b", "c", "d"]);
    expect(rangeOf(["a", "b", "c", "d"], "c", "a")).toEqual(["a", "b", "c"]);
    expect(rangeOf(["a", "b"], "x", "b")).toEqual(["b"]);
  });

  it("turns a thumbhash into a placeholder, and nothing into none", () => {
    const url = thumbhashUrl("1QcSHQRnh493V4dIh4eXh1h4kJUI");

    expect(url).toMatch(/^data:image\/png;base64,/);
    expect(thumbhashUrl("1QcSHQRnh493V4dIh4eXh1h4kJUI")).toBe(url);
    expect(thumbhashUrl(null)).toBeNull();
    expect(thumbhashUrl("!!")).toBeNull();
  });

  it("finds the map tile of a position and where in it the position is", () => {
    const tile = tileOf(57.689, 11.974, 15);

    expect(tile.x).toBe(17473);
    expect(tile.y).toBeGreaterThan(9000);
    expect(tile.left).toBeGreaterThanOrEqual(0);
    expect(tile.top).toBeLessThanOrEqual(256);
    expect(yearsAgo("1984-02-14", new Date("2026-11-17T10:00:00Z"))).toBe(42);
  });
});
