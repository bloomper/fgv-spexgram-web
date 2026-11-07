import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/albums/[id]/zip/route";

const apiFetch = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api.server", () => ({ apiFetch }));

const ID = "8f14e45f-ceea-467f-a0e6-1b2c3d4e5f60";
const params = (id: string) => ({ params: Promise.resolve({ id }) });

describe("an album as a zip", () => {
  beforeEach(() => {
    apiFetch.mockReset();
  });

  it("streams the zip from the server, sandboxed and not sniffed", async () => {
    apiFetch.mockResolvedValue(new Response("zip", {
      headers: { "content-type": "application/zip", "content-disposition": "attachment; filename=\"album.zip\"" },
    }));

    const response = await GET(new NextRequest(`http://gram.test/api/albums/${ID}/zip`), params(ID));

    expect(apiFetch.mock.calls[0][0]).toBe(`/api/albums/${ID}/zip`);
    expect(response.headers.get("content-disposition")).toContain("album.zip");
    expect(response.headers.get("content-security-policy")).toBe("default-src 'none'; sandbox");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("refuses an id that is not one", async () => {
    const response = await GET(new NextRequest("http://gram.test/api/albums/..%2Fadmin/zip"), params("../admin"));

    expect(response.status).toBe(400);
    expect(apiFetch).not.toHaveBeenCalled();
  });
});
