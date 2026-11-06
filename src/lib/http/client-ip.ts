const IP = /^[0-9a-f.:]{2,45}$/i;

/**
 * The visitor's address from the headers in front of the web: Cloudflare's, else the first in the proxy's
 * X-Forwarded-For, else X-Real-IP; null when none is a plausible address.
 */
export function clientIp(headers: Headers): string | null {
  const candidates = [
    headers.get("cf-connecting-ip"),
    headers.get("x-forwarded-for")?.split(",")[0],
    headers.get("x-real-ip"),
  ];

  return candidates.map(value => value?.trim()).find(value => value && IP.test(value)) ?? null;
}
