import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { apiFetch } from "@/lib/api.server";

export { ID } from "@/utils/ids";

const PASSED_HEADERS = ["content-type", "content-length", "content-range", "accept-ranges", "content-disposition",
  "cache-control", "etag", "last-modified"];

/**
 * Whether a request that changes something comes from this application's own pages. Route handlers get none of the
 * origin check server actions have, and the session cookie is sent from sibling subdomains too.
 */
export function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");

  if (!origin) {
    return true;
  }

  const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "").split(",")[0].trim();

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export const invalid = () => NextResponse.json({ code: "BAD_REQUEST", message: "Invalid request" }, { status: 400 });
export const crossSite = () => NextResponse.json({ code: "FORBIDDEN", message: "Cross-site request" }, { status: 403 });

/**
 * Streams a GET from the server to the browser with the user's token, passing byte ranges both ways so that the
 * player can seek. The browser never holds the token.
 */
export async function streamFromApi(request: NextRequest, path: string, extra: Record<string, string> = {}): Promise<Response> {
  const headers = new Headers();
  const range = request.headers.get("range");

  if (range) {
    headers.set("Range", range);
  }

  // Aborted with the browser's request, e.g. when the player seeks or skips, so the server stops sending at once
  const upstream = await apiFetch(path, { headers, signal: request.signal });

  if (!upstream.ok && upstream.status !== 206) {
    await upstream.body?.cancel();
    return NextResponse.json({ error: "Not available" }, { status: upstream.status });
  }

  const out = new Headers(extra);

  for (const name of PASSED_HEADERS) {
    const value = upstream.headers.get(name);

    if (value && !out.has(name)) {
      out.set(name, value);
    }
  }
  out.set("X-Content-Type-Options", "nosniff");
  return new Response(upstream.body, { status: upstream.status, headers: out });
}
