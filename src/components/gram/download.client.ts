"use client";

/**
 * Saves a file from the media server under the given name. The media server allows this site's origin (CORS), so the
 * file is fetched and saved from memory, since browsers ignore `download` on links to another origin; if that fails,
 * the address opens in a new tab instead.
 */
export async function downloadFile(url: string, fileName: string): Promise<void> {
  try {
    const response = await fetch(url, { mode: "cors", credentials: "omit" });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = objectUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}
