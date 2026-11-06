import { describe, expect, it } from "vitest";
import { formatBytes, formatDay, formatDurationMs, formatInstant, formatPeriod, formatTaken } from "@/utils/format";

describe("format", () => {
  it("formats instants as yyyy-mm-dd hh:mm in Swedish time", () => {
    expect(formatInstant("2028-02-10T12:00:00Z")).toBe("2028-02-10 13:00");
    expect(formatInstant("2028-07-01T22:30:00Z")).toBe("2028-07-02 00:30");
    expect(formatInstant(undefined)).toBeNull();
    expect(formatInstant("garbage")).toBe("garbage");
  });

  it("formats days in words per language", () => {
    expect(formatDay("1975-02-14", "sv")).toBe("14 februari 1975");
    expect(formatDay("1975-02-14T20:15:00", "en")).toBe("February 14, 1975");
    expect(formatDay(null, "sv")).toBeNull();
  });

  it("shortens periods within a month", () => {
    expect(formatPeriod("1975-02-14", "1975-02-16", "sv")).toBe("14–16 februari 1975");
    expect(formatPeriod("1975-02-14", null, "sv")).toBe("14 februari 1975");
    expect(formatPeriod("1975-01-30", "1975-02-02", "en")).toBe("January 30, 1975 – February 2, 1975");
  });

  it("formats local date-times, sizes and lengths", () => {
    expect(formatTaken("1975-02-14T20:15:00")).toBe("1975-02-14 20:15");
    expect(formatBytes(1_500_000, "en")).toBe("1.5 MB");
    expect(formatBytes(null, "sv")).toBe("–");
    expect(formatDurationMs(75_000)).toBe("1:15");
    expect(formatDurationMs(3_725_000)).toBe("1:02:05");
  });
});
