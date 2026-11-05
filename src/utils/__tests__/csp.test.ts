import { describe, expect, it } from "vitest";
import { contentSecurityPolicy } from "@/utils/csp";

describe("contentSecurityPolicy", () => {
  it("allows the media origin for video, images and fetches", () => {
    const policy = contentSecurityPolicy("https://media.example.org", false);

    expect(policy).toContain("media-src 'self' blob: https://media.example.org");
    expect(policy).toContain("img-src 'self' blob: data: https: https://media.example.org");
    expect(policy).toContain("connect-src 'self' https://media.example.org");
    expect(policy).not.toContain("unsafe-eval");
  });

  it("allows Turnstile's script and frame", () => {
    const policy = contentSecurityPolicy("https://media.example.org", false);

    expect(policy).toMatch(/script-src [^;]*https:\/\/challenges\.cloudflare\.com/);
    expect(policy).toContain("frame-src https://challenges.cloudflare.com");
  });

  it("ignores an origin that is not one", () => {
    expect(contentSecurityPolicy("https://x.org; script-src *", false)).toContain("media-src 'self' blob:;");
  });
});
