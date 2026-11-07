import { NextRequest, NextResponse } from "next/server";
import { ID, streamFromApi } from "@/lib/http/proxy.server";

type Params = { params: Promise<{ id: string }> };

/**
 * An album as a zip, made by Immich and streamed through the server, which checks that the viewer may download it.
 * Sandboxed, like every file this application passes on, should a browser try to show it.
 */
export async function GET(request: NextRequest, { params }: Params): Promise<Response> {
  const { id } = await params;

  if (!ID.test(id)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  return streamFromApi(request, `/api/albums/${id}/zip`, { "Content-Security-Policy": "default-src 'none'; sandbox" });
}
