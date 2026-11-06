import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { apiFetch } from "@/lib/api.server";
import { crossSite, ID, invalid, sameOrigin } from "@/lib/http/proxy.server";

/**
 * Forwards a multipart form from this application's own pages to the server with the user's token, and answers with
 * the server's error as {code, message} so the page can show its localised message.
 */
export async function forwardForm(request: NextRequest, id: string, path: (id: string) => string): Promise<Response> {
  if (!ID.test(id)) {
    return invalid();
  }
  if (!sameOrigin(request)) {
    return crossSite();
  }

  const upstream = await apiFetch(path(id), { method: "POST", body: await request.formData() });

  if (!upstream.ok) {
    const body = await upstream.json().catch(() => ({})) as { code?: string; message?: string };

    return NextResponse.json({ code: body.code ?? null, message: body.message ?? null }, { status: upstream.status });
  }
  return NextResponse.json({ ok: true });
}
