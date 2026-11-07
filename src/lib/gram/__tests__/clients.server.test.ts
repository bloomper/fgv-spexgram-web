import { beforeEach, describe, expect, it, vi } from "vitest";
import * as gram from "@/lib/gram/gram.server";
import * as manage from "@/lib/gram/manage.server";

const { runQuery, runMutation } = vi.hoisted(() => ({ runQuery: vi.fn(), runMutation: vi.fn() }));

vi.mock("@/lib/graphql.server", () => ({ runQuery, runMutation }));

/** An answer that has every field, however deep: each property is the answer again. */
const full: unknown = new Proxy(() => undefined, { get: (_, key) => key === "then" ? undefined : full });

const clients = { gram, manage } as Record<string, Record<string, (...args: unknown[]) => Promise<unknown>>>;
const calls = Object.entries(clients).flatMap(([module, exports]) =>
  Object.entries(exports).filter(([, value]) => typeof value === "function").map(([name, fn]) => [`${module}.${name}`, fn] as const));

describe("the GraphQL clients", () => {
  beforeEach(() => {
    runQuery.mockReset();
    runMutation.mockReset();
  });

  it.each(calls)("%s asks the API once and copes with an empty answer", async (_, fn) => {
    runQuery.mockResolvedValue(undefined);
    runMutation.mockResolvedValue(undefined);
    const args = ["00000000-0000-7000-8000-000000000001", 0, 60];

    const empty = await fn(...args);

    expect(runQuery.mock.calls.length + runMutation.mock.calls.length).toBe(1);
    expect(empty === undefined || empty === null || empty === 0 || Array.isArray(empty) || typeof empty === "object").toBe(true);

    runQuery.mockResolvedValue(full);
    runMutation.mockResolvedValue(full);
    expect(await fn(...args)).toBeDefined();
  });

  it("passes the arguments on", async () => {
    runQuery.mockResolvedValue({ album: { items: { items: [], totalCount: 0 } } });
    expect(await gram.getAlbumItems("a1", 2, 60)).toEqual({ items: [], totalCount: 0 });
    expect(runQuery.mock.calls.at(-1)?.[1]).toEqual({ id: "a1", page: 2, size: 60 });

    runQuery.mockResolvedValue({ albumSuggestions: [{ id: "s1" }], albumKinds: [{ id: "k1" }] });
    expect(await gram.getMySuggestions()).toEqual({ suggestions: [{ id: "s1" }], kinds: [{ id: "k1" }] });

    runMutation.mockResolvedValue({ albumSetVisibility: { skipped: 3 } });
    expect(await manage.albumSetVisibility("a1", "PUBLIC", true)).toBe(3);
    expect(runMutation.mock.calls.at(-1)?.[1]).toEqual({ id: "a1", visibility: "PUBLIC", items: true });

    runMutation.mockResolvedValue({ itemsUpdate: { skipped: 1 } });
    expect(await manage.itemsUpdate(["i1"], { caption: "Hej" } as never)).toBe(1);
    await manage.contributionsReview(["i1"], false, "Suddig");
    expect(runMutation.mock.calls.at(-1)?.[1]).toEqual({ itemIds: ["i1"], accept: false, message: "Suddig" });
  });
});
