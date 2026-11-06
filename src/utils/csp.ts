/** Cloudflare Turnstile, for visitors' reports: its script and the frame of its widget. */
export const TURNSTILE_ORIGIN = "https://challenges.cloudflare.com";

/**
 * The pages' Content Security Policy. Photos and videos come from the media hostname, which differs per environment,
 * so the policy is built at request time (in {@code proxy.ts}) from {@code MEDIA_ORIGIN} rather than fixed at build
 * time in next.config.ts. Turnstile's widget is a script and a frame from Cloudflare; the map's tiles come from
 * OpenStreetMap (any https image).
 */
export function contentSecurityPolicy(mediaOrigin: string | undefined, development: boolean): string {
  const media = mediaOrigin && /^https?:\/\/[A-Za-z0-9.-]+(:\d+)?$/.test(mediaOrigin) ? ` ${mediaOrigin}` : "";

  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${development ? " 'unsafe-eval'" : ""} ${TURNSTILE_ORIGIN}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' blob: data: https:${media}`,
    `media-src 'self' blob:${media}`,
    "font-src 'self'",
    `connect-src 'self'${media} ${TURNSTILE_ORIGIN}`,
    `frame-src ${TURNSTILE_ORIGIN}`,
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}
